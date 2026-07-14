const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Donor = require('../models/Donor');
const { asyncHandler, formatPhoneE164 } = require('../utils/helpers');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * Generate JWT access and refresh tokens.
 * Preserved from original server.
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id || user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user._id || user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/register
 * Migrated from MySQL INSERT to Mongoose User.create().
 */
const register = asyncHandler(async (req, res) => {
  const { full_name, email, phone, password, blood_group, role } = req.body;

  // Check if email already exists
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ConflictError('Email already registered.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  const formattedPhone = formatPhoneE164(phone);

  // Create user
  const user = await User.create({
    fullName: full_name,
    email: email.toLowerCase(),
    passwordHash,
    phone: formattedPhone,
    role: role === 'donor' ? 'donor' : 'requester',
    bloodGroup: blood_group || null,
  });

  const tokens = generateTokens(user);

  logger.info(`New user registered: ${email} as requester`);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: {
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        bloodGroup: user.bloodGroup,
        blood_group: user.bloodGroup,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    },
  });
});

/**
 * POST /api/auth/login
 * Migrated from MySQL SELECT to Mongoose findOne().
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Need to explicitly select passwordHash since it's excluded by default
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated. Contact support.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const tokens = generateTokens(user);

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        bloodGroup: user.bloodGroup,
        blood_group: user.bloodGroup,
        isVerified: user.isVerified,
        is_verified: user.isVerified,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    },
  });
});

/**
 * POST /api/auth/refresh
 * Preserved from original server.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new UnauthorizedError('Refresh token required.');
  }

  const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  const user = await User.findOne({ _id: decoded.id, isActive: true });

  if (!user) {
    throw new UnauthorizedError('Invalid refresh token.');
  }

  const tokens = generateTokens(user);

  res.json({
    success: true,
    data: {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    },
  });
});

/**
 * GET /api/auth/me
 * Migrated from MySQL JOIN to Mongoose populate.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash');

  // If user is a donor, include donor profile info
  let donorProfile = null;
  if (user.role === 'donor') {
    donorProfile = await Donor.findOne({ userId: user._id })
      .setOptions({ skipPopulate: true })
      .lean();

    // If no profile exists yet, they will register it in the app later. We do not revert the role.
    if (!donorProfile) {
      logger.info(`Donor profile not found for user ${user._id} yet. Expecting registration later.`);
    }
  }

  res.json({
    success: true,
    data: {
      user,
      donor_profile: donorProfile,
    },
  });
});

/**
 * POST /api/auth/forgot-password
 * Preserved from original server.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // In production: generate reset token, store in DB, send email.
  logger.info(`Password reset requested for: ${email}`);

  res.json({
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.',
  });
});

/**
 * PATCH /api/auth/fcm-token
 * Migrated from MySQL UPDATE to Mongoose findByIdAndUpdate().
 */
const updateFcmToken = asyncHandler(async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token) {
    throw new UnauthorizedError('FCM token is required.');
  }

  await User.findByIdAndUpdate(req.user._id, { fcmToken: fcm_token });
  logger.info(`Updated FCM token for user ${req.user._id}`);

  res.json({
    success: true,
    message: 'FCM token updated successfully.',
  });
});

/**
 * PUT /api/auth/profile
 * Update user's basic profile (fullName, phone, bloodGroup).
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, phone, blood_group } = req.body;

  const updates = {};
  if (full_name !== undefined) updates.fullName = full_name;
  if (phone !== undefined) updates.phone = formatPhoneE164(phone);
  if (blood_group !== undefined) updates.bloodGroup = blood_group;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No changes provided.',
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-passwordHash');

  if (!updatedUser) {
    throw new NotFoundError('User not found.');
  }

  logger.info(`Updated profile for user ${req.user._id}`);

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    data: {
      user: {
        id: updatedUser._id,
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        email: updatedUser.email,
        role: updatedUser.role,
        bloodGroup: updatedUser.bloodGroup,
        isVerified: updatedUser.isVerified,
        full_name: updatedUser.fullName,
        blood_group: updatedUser.bloodGroup,
        is_verified: updatedUser.isVerified,
      },
    },
  });
});

module.exports = { register, login, refreshToken, getMe, forgotPassword, updateFcmToken, updateProfile };
