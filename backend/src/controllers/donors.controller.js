const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Donor = require('../models/Donor');
const DonorResponse = require('../models/DonorResponse');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const { asyncHandler, formatPhoneE164, calculateAge, daysSince } = require('../utils/helpers');
const { ConflictError, NotFoundError, ForbiddenError, AppError } = require('../utils/errors');
const { sendAcceptanceConfirmation, sendSeekerNotification, createInAppNotification } = require('../services/fcm.service');
const { logger } = require('../utils/logger');

/**
 * POST /api/donors/register
 * Register a new donor (with or without existing user account).
 * Migrated from MySQL to Mongoose. All business logic preserved.
 */
const registerDonor = asyncHandler(async (req, res) => {
  const {
    full_name, email, phone, password,
    date_of_birth, gender, blood_group, weight_kg,
    last_donation_date, medical_conditions,
    address_line, city, state, pincode,
    notification_opt_in,
    latitude, longitude,
  } = req.body;

  let userId;
  let isNewUser = false;

  if (req.user) {
    // Authenticated user adding donor profile
    userId = req.user._id;

    // Check if already a donor
    const existingDonor = await Donor.findOne({ userId });
    if (existingDonor) {
      throw new ConflictError('You are already registered as a donor.');
    }

    // Update role to donor if currently requester
    const updateData = { phone: formatPhoneE164(phone), fullName: full_name };
    if (req.user.role === 'requester') {
      updateData.role = 'donor';
    }
    await User.findByIdAndUpdate(userId, updateData);
  } else {
    // Guest registration — create new user account
    if (!full_name || !email || !phone || !password) {
      throw new AppError('Full name, email, phone, and password are required for new accounts.', 400, 'VALIDATION_ERROR');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ConflictError('Email already registered. Please login first.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const formattedPhone = formatPhoneE164(phone);

    const newUser = await User.create({
      fullName: full_name,
      email: email.toLowerCase(),
      passwordHash,
      phone: formattedPhone,
      role: 'donor',
    });
    userId = newUser._id;
    isNewUser = true;
  }

  // Validate age
  const age = calculateAge(date_of_birth);
  if (age < 18 || age > 65) {
    throw new AppError('Donors must be between 18 and 65 years old.', 400, 'VALIDATION_ERROR');
  }

  // Validate donation gap
  if (last_donation_date && daysSince(last_donation_date) < 56) {
    throw new AppError('Last donation must be at least 56 days ago.', 400, 'VALIDATION_ERROR');
  }

  // Create donor record
  const donor = await Donor.create({
    userId,
    bloodGroup: blood_group,
    dateOfBirth: date_of_birth,
    gender,
    weightKg: weight_kg,
    lastDonationDate: last_donation_date || null,
    medicalConditions: medical_conditions || null,
    address: {
      line: address_line,
      city,
      state,
      pincode,
    },
    location: latitude && longitude
      ? { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] }
      : undefined,
    notificationOptIn: notification_opt_in !== false,
  });

  // Also set blood group on User model
  await User.findByIdAndUpdate(userId, { bloodGroup: blood_group });

  logger.info(`New donor registered: user #${userId}, blood group ${blood_group}`);

  res.status(201).json({
    success: true,
    data: {
      user: { id: userId, role: 'donor' },
      donor: { id: donor._id, blood_group, is_available: true },
      message: 'Donor registration successful.',
    },
  });
});

/**
 * GET /api/donors/profile
 * Get the current donor's own profile.
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const donor = await Donor.findOne({ userId: req.user._id }).lean();

  if (!donor) {
    throw new NotFoundError('Donor profile');
  }

  // Get response history
  const responseHistory = await DonorResponse.find({ donorId: donor._id })
    .populate({
      path: 'requestId',
      select: 'bloodGroupNeeded hospitalName hospitalCity urgency',
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Get user info
  const userInfo = await User.findById(req.user._id).select('fullName email phone isVerified').lean();

  res.json({
    success: true,
    data: {
      donor: {
        ...donor,
        ...userInfo,
        _id: donor._id,
        id: donor._id,
        userId: donor.userId,
        days_until_eligible: donor.lastDonationDate
          ? Math.max(0, 56 - daysSince(donor.lastDonationDate))
          : 0,
        is_eligible: !donor.lastDonationDate || daysSince(donor.lastDonationDate) >= 56,
      },
      response_history: responseHistory.map((r) => ({
        response: r.response,
        response_time: r.responseTime,
        created_at: r.createdAt,
        blood_group_needed: r.requestId?.bloodGroupNeeded,
        hospital_name: r.requestId?.hospitalName,
        hospital_city: r.requestId?.hospitalCity,
        urgency: r.requestId?.urgency,
      })),
    },
  });
});

/**
 * PUT /api/donors/:id
 * Update donor profile.
 */
const updateDonor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const donor = await Donor.findById(id);
  if (!donor) throw new NotFoundError('Donor');

  // Access control: own profile or admin
  const donorUserId = donor.userId._id ? donor.userId._id.toString() : donor.userId.toString();
  if (req.user.role !== 'admin' && donorUserId !== req.user._id.toString()) {
    throw new ForbiddenError('You can only edit your own profile.');
  }

  const allowedFields = {
    weight_kg: 'weightKg',
    address_line: 'address.line',
    city: 'address.city',
    state: 'address.state',
    pincode: 'address.pincode',
    medical_conditions: 'medicalConditions',
    notification_opt_in: 'notificationOptIn',
    last_donation_date: 'lastDonationDate',
  };

  const updates = {};
  for (const [bodyField, dbField] of Object.entries(allowedFields)) {
    if (req.body[bodyField] !== undefined) {
      updates[dbField] = req.body[bodyField];
    }
  }

  // Handle location update
  if (req.body.latitude && req.body.longitude) {
    updates.location = {
      type: 'Point',
      coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
    };
  }

  if (Object.keys(updates).length === 0) {
    return res.json({ success: true, message: 'No changes made.' });
  }

  const updatedDonor = await Donor.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();

  res.json({
    success: true,
    data: { donor: updatedDonor },
    message: 'Profile updated successfully.',
  });
});

/**
 * PATCH /api/donors/:id/availability
 * Toggle donor availability.
 */
const toggleAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_available } = req.body;

  const donor = await Donor.findById(id);
  if (!donor) throw new NotFoundError('Donor');

  const donorUserId = donor.userId._id ? donor.userId._id.toString() : donor.userId.toString();
  if (req.user.role !== 'admin' && donorUserId !== req.user._id.toString()) {
    throw new ForbiddenError('You can only update your own availability.');
  }

  donor.isAvailable = !!is_available;
  await donor.save();

  logger.info(`Donor #${id} availability changed to ${is_available}`);

  res.json({
    success: true,
    data: { is_available: !!is_available },
    message: is_available
      ? 'You are now available for donation requests.'
      : 'You are now marked as unavailable.',
  });
});

/**
 * POST /api/donors/respond/:id
 * Donor responds to a blood request (accept/decline).
 */
const respondToRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!['accepted', 'declined'].includes(response)) {
    throw new AppError("Response must be 'accepted' or 'declined'.", 400, 'VALIDATION_ERROR');
  }

  // Get donor record for this user
  const donor = await Donor.findOne({ userId: req.user._id });
  if (!donor) throw new NotFoundError('Donor profile');

  // Get the donor_response record
  let donorResponse = await DonorResponse.findOne({
    requestId: id,
    donorId: donor._id,
  });

  if (!donorResponse) {
    // Create it dynamically if missing to ensure donors can respond
    donorResponse = new DonorResponse({
      requestId: id,
      donorId: donor._id,
      response: 'no_response',
      notificationStatus: 'delivered',
    });
  }

  if (donorResponse.response !== 'no_response') {
    throw new AppError('You have already responded to this request.', 400, 'VALIDATION_ERROR');
  }

  // Update response
  donorResponse.response = response;
  donorResponse.responseTime = new Date();
  await donorResponse.save();

  // Delete the matching in-app notification from the donor's inbox
  await Notification.deleteOne({
    recipientId: req.user._id,
    requestId: id,
    type: 'blood_request',
  });

  // If accepted, update request and send confirmations
  if (response === 'accepted') {
    await BloodRequest.findByIdAndUpdate(id, {
      $inc: { donorsAccepted: 1 },
    });

    const request = await BloodRequest.findById(id);

    // Send confirmations asynchronously
    setImmediate(async () => {
      try {
        const donorName = donor.userId?.fullName || donor.fullName || 'A donor';

        // ── FCM push to donor: thank-you banner ──────────────────────────────
        await sendAcceptanceConfirmation(donor, request);

        // ── FCM push to requester: donor found ───────────────────────────────
        await sendSeekerNotification(request, donor);
        // ── In-app record for requester inbox ────────────────────────────────
        const details = {
          patientName: request.patientName,
          bloodGroup: request.bloodGroupNeeded,
          urgency: request.urgency,
          hospitalName: request.hospitalName,
          hospitalAddress: request.hospitalAddress,
          hospitalCity: request.hospitalCity,
          hospitalState: request.hospitalState,
          hospitalPincode: request.hospitalPincode,
          contactName: request.contactName,
          contactPhone: request.contactPhone,
          additionalNotes: request.additionalNotes || null,
        };
        await createInAppNotification(
          request.requesterId,
          'donor_accepted',
          `Great news! ${donorName} (${donor.bloodGroup}) has accepted your blood request and is on their way to ${request.hospitalName}.`,
          request._id,
          details
        );
      } catch (err) {
        logger.error('Failed to send confirmation notifications:', err.message);
      }
    });
  }

  logger.info(`Donor #${donor._id} ${response} request #${id}`);

  res.json({
    success: true,
    message:
      response === 'accepted'
        ? 'Thank you for accepting! Hospital details have been sent.'
        : 'Response recorded. Thank you for letting us know.',
  });
});

/**
 * GET /api/donors
 * List donors (admin only for full list).
 */
const getDonors = asyncHandler(async (req, res) => {
  const { blood_group, city, is_available, page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (blood_group) filter.bloodGroup = blood_group;
  if (city) filter['address.city'] = { $regex: new RegExp(`^${city}$`, 'i') };
  if (is_available !== undefined) filter.isAvailable = is_available === 'true';

  const [donors, total] = await Promise.all([
    Donor.find(filter)
      .populate('userId', 'fullName email phone isVerified isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Donor.countDocuments(filter),
  ]);

  // Filter out inactive users
  const activeDonors = donors.filter((d) => d.userId && d.userId.isActive);

  res.json({
    success: true,
    data: {
      donors: activeDonors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    },
  });
});

/**
 * DELETE /api/donors/account
 * Delete donor account (requires password verification).
 */
const deleteDonorAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw new AppError('Password is required to delete your donor account.', 400, 'VALIDATION_ERROR');
  }

  // Verify password
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw new NotFoundError('User');

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Incorrect password. Please try again.', 401, 'AUTH_ERROR');
  }

  // Get donor record
  const donor = await Donor.findOne({ userId: req.user._id });
  if (!donor) throw new NotFoundError('Donor profile');

  // Delete donor responses first
  await DonorResponse.deleteMany({ donorId: donor._id });

  // Delete donor record
  await Donor.findByIdAndDelete(donor._id);

  // Revert user role to requester
  await User.findByIdAndUpdate(req.user._id, { role: 'requester' });

  logger.info(`Donor account deleted: user #${req.user._id}`);

  res.json({
    success: true,
    message: 'Your donor account has been successfully deleted. You can register again anytime.',
  });
});

module.exports = { registerDonor, getMyProfile, updateDonor, toggleAvailability, respondToRequest, getDonors, deleteDonorAccount };
