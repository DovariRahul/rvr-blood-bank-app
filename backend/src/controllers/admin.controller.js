const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const DonorResponse = require('../models/DonorResponse');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, AppError } = require('../utils/errors');
const { sendPushNotification, sendDonorNotification } = require('../services/fcm.service');
const { findMatchingDonors } = require('../services/matching.service');
const { logger } = require('../utils/logger');

/**
 * GET /api/admin/analytics
 * Migrated from MySQL aggregations to MongoDB aggregation pipelines.
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const [
    totalRequests,
    activeRequests,
    totalDonors,
    availableDonors,
    fulfilledRequests,
    avgResponseTime,
    monthlyRequests,
    bloodGroupDemand,
    cityDistribution,
    monthlyTrend,
  ] = await Promise.all([
    BloodRequest.countDocuments(),
    BloodRequest.countDocuments({ status: { $in: ['pending', 'matching', 'matched'] } }),
    Donor.countDocuments(),
    Donor.countDocuments({ isAvailable: true }),
    BloodRequest.countDocuments({ status: 'fulfilled' }),
    DonorResponse.aggregate([
      {
        $match: {
          response: { $ne: 'no_response' },
          responseTime: { $ne: null },
        },
      },
      {
        $project: {
          responseMinutes: {
            $divide: [{ $subtract: ['$responseTime', '$notificationSentAt'] }, 60000],
          },
        },
      },
      { $group: { _id: null, avgMinutes: { $avg: '$responseMinutes' } } },
    ]),
    BloodRequest.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
    BloodRequest.aggregate([
      { $group: { _id: '$bloodGroupNeeded', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { blood_group: '$_id', count: 1, _id: 0 } },
    ]),
    Donor.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $match: { 'user.isActive': true } },
      { $group: { _id: '$address.city', donors: { $sum: 1 } } },
      { $sort: { donors: -1 } },
      { $limit: 10 },
      { $project: { city: '$_id', donors: 1, _id: 0 } },
    ]),
    BloodRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          requests: { $sum: 1 },
          fulfilled: {
            $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', requests: 1, fulfilled: 1, _id: 0 } },
    ]),
  ]);

  const matchSuccessRate =
    totalRequests > 0 ? ((fulfilledRequests / totalRequests) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: {
      total_requests: totalRequests,
      active_requests: activeRequests,
      total_donors: totalDonors,
      available_donors: availableDonors,
      match_success_rate: parseFloat(matchSuccessRate),
      avg_response_time_minutes: Math.round(avgResponseTime[0]?.avgMinutes || 0),
      requests_this_month: monthlyRequests,
      blood_group_demand: bloodGroupDemand,
      city_distribution: cityDistribution,
      monthly_trend: monthlyTrend,
    },
  });
});

/**
 * GET /api/admin/requests/active
 */
const getActiveRequests = asyncHandler(async (req, res) => {
  const requests = await BloodRequest.find({
    status: { $in: ['pending', 'pending_verification', 'matching', 'matched'] },
  })
    .populate('requesterId', 'fullName phone')
    .sort({ urgency: 1, createdAt: -1 })
    .lean();

  res.json({ success: true, data: { requests } });
});

/**
 * GET /api/admin/requests/pending-verification
 * Get requests awaiting admin verification.
 */
const getPendingVerification = asyncHandler(async (req, res) => {
  const requests = await BloodRequest.find({
    status: 'pending_verification',
    verificationStatus: 'pending',
  })
    .populate('requesterId', 'fullName email phone')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: { requests } });
});

/**
 * PATCH /api/admin/requests/:id/verify
 * Admin verifies (approves or rejects) a blood request.
 */
const verifyRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    throw new AppError("Action must be 'approve' or 'reject'.", 400, 'VALIDATION_ERROR');
  }

  const request = await BloodRequest.findById(id);
  if (!request) throw new NotFoundError('Request');

  if (request.verificationStatus !== 'pending') {
    throw new AppError(`Request is already ${request.verificationStatus}.`, 422, 'UNPROCESSABLE_ENTITY');
  }

  if (action === 'approve') {
    request.verificationStatus = 'verified';
    request.status = 'matching'; // will be updated to matched/pending after donor search
    request.verifiedBy = req.user._id;
    request.verifiedAt = new Date();

    const approveMessage = `Your blood request for ${request.bloodGroupNeeded} has been verified and is now active. Matching donors will be notified shortly.`;

    // ── In-app notification for requester (with full patient details) ──────
    await Notification.create({
      recipientId: request.requesterId,
      requestId: request._id,
      type: 'request_verified',
      message: approveMessage,
      // Embed all patient/hospital details so the mobile Notifications tab
      // can display them instantly without an extra network round-trip.
      bloodRequestDetails: {
        patientName:     request.patientName,
        bloodGroup:      request.bloodGroupNeeded,
        urgency:         request.urgency,
        hospitalName:    request.hospitalName,
        hospitalAddress: request.hospitalAddress,
        hospitalCity:    request.hospitalCity,
        hospitalState:   request.hospitalState,
        hospitalPincode: request.hospitalPincode,
        contactName:     request.contactName,
        contactPhone:    request.contactPhone,
        additionalNotes: request.additionalNotes || null,
      },
    });

    // ── FCM push banner for requester ──────────────────────────────────────
    setImmediate(async () => {
      try {
        const requester = await User.findById(request.requesterId).select('fullName fcmToken').lean();
        if (requester) {
          await sendPushNotification(
            requester,
            '✅ Blood Request Approved',
            approveMessage,
            { type: 'request_verified', requestId: request._id.toString() }
          );
        }
      } catch (e) {
        logger.error('FCM push failed for request approval notification to requester:', e.message);
      }

      // ── Donor Matching + FCM Push to Donors ────────────────────────────
      // This is the core: find matching donors and fire FCM phone banners.
      try {
        const matchingDonors = await findMatchingDonors(request);

        if (matchingDonors.length > 0) {
          let notifiedCount = 0;

          for (const donor of matchingDonors) {
            // sendDonorNotification sends FCM push AND creates in-app notification record
            const sent = await sendDonorNotification(donor, request);
            if (sent) notifiedCount++;

            // Track that this donor was notified (for respond endpoint)
            try {
              await DonorResponse.create({
                requestId: request._id,
                donorId: donor._id,
                notificationStatus: sent ? 'sent' : 'failed',
                notificationId: sent ? 'fcm_push' : null,
              });
            } catch (err) {
              if (err.code !== 11000) {
                logger.error(`Failed to create donor_response for donor ${donor._id}:`, err.message);
              }
            }
          }

          // Update request status to matched
          await BloodRequest.findByIdAndUpdate(request._id, {
            status: 'matched',
            donorsNotified: notifiedCount,
          });

          logger.info(`Request #${request._id} approved: ${notifiedCount} donors notified via FCM.`);
        } else {
          // No donors found — keep as pending so admin can try again later
          await BloodRequest.findByIdAndUpdate(request._id, { status: 'pending' });
          logger.warn(`Request #${request._id} approved but no matching donors found.`);
        }
      } catch (matchErr) {
        logger.error(`Donor matching failed for approved request #${request._id}:`, matchErr.message);
        await BloodRequest.findByIdAndUpdate(request._id, { status: 'pending' });
      }
    });

  } else {
    request.verificationStatus = 'rejected';
    request.status = 'cancelled';
    request.rejectionReason = rejection_reason || 'Request did not meet verification criteria.';
    request.verifiedBy = req.user._id;
    request.verifiedAt = new Date();

    const rejectMessage = `Your blood request has been rejected. Reason: ${request.rejectionReason}`;

    // In-app inbox record (with patient details so user knows which request)
    await Notification.create({
      recipientId: request.requesterId,
      requestId: request._id,
      type: 'request_rejected',
      message: rejectMessage,
      bloodRequestDetails: {
        patientName:     request.patientName,
        bloodGroup:      request.bloodGroupNeeded,
        urgency:         request.urgency,
        hospitalName:    request.hospitalName,
        hospitalAddress: request.hospitalAddress,
        hospitalCity:    request.hospitalCity,
        hospitalState:   request.hospitalState,
        hospitalPincode: request.hospitalPincode,
        contactName:     request.contactName,
        contactPhone:    request.contactPhone,
        additionalNotes: request.additionalNotes || null,
      },
    });

    // FCM push — device banner
    setImmediate(async () => {
      try {
        const requester = await User.findById(request.requesterId).select('fullName fcmToken').lean();
        if (requester) {
          await sendPushNotification(
            requester,
            '❌ Blood Request Rejected',
            rejectMessage,
            { type: 'request_rejected', requestId: request._id.toString() }
          );
        }
      } catch (e) {
        logger.error('FCM push failed for request rejection:', e.message);
      }
    });
  }

  await request.save();

  // Audit log
  await AuditLog.create({
    adminId: req.user._id,
    action: action === 'approve' ? 'verify_request' : 'reject_request',
    targetType: 'request',
    targetId: id,
    details: { action, rejection_reason },
  });

  logger.info(`Admin #${req.user._id} ${action}d request #${id}`);

  res.json({
    success: true,
    message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
  });
});

/**
 * PATCH /api/admin/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active, role } = req.body;

  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User');

  const updates = {};
  if (is_active !== undefined) updates.isActive = !!is_active;
  if (role) updates.role = role;

  if (Object.keys(updates).length === 0) {
    return res.json({ success: true, message: 'No changes made.' });
  }

  await User.findByIdAndUpdate(id, updates);

  // Audit log
  await AuditLog.create({
    adminId: req.user._id,
    action: is_active === false ? 'ban_user' : 'update_user',
    targetType: 'user',
    targetId: id,
    details: req.body,
  });

  logger.info(`Admin #${req.user._id} updated user #${id}:`, req.body);

  res.json({
    success: true,
    message: `User updated successfully.`,
  });
});

/**
 * GET /api/admin/audit-log
 */
const getAuditLog = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find()
      .populate('adminId', 'fullName')
      .sort({ performedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(),
  ]);

  res.json({
    success: true,
    data: {
      logs: logs.map((l) => ({
        ...l,
        admin_name: l.adminId?.fullName,
      })),
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
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, is_active, search, page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (role) filter.role = role;
  if (is_active !== undefined) filter.isActive = is_active === 'true';
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('fullName email phone role isVerified isActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      users,
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
 * GET /api/admin/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-passwordHash').lean();
  if (!user) throw new NotFoundError('User');

  let donor = null;
  if (user.role === 'donor') {
    donor = await Donor.findOne({ userId: id }).setOptions({ skipPopulate: true }).lean();
  }

  const requests = await BloodRequest.find({ requesterId: id })
    .select('patientName bloodGroupNeeded unitsNeeded urgency hospitalName status createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  let donorResponses = [];
  if (donor) {
    donorResponses = await DonorResponse.find({ donorId: donor._id })
      .populate({
        path: 'requestId',
        select: 'bloodGroupNeeded hospitalName urgency patientName',
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
  }

  res.json({
    success: true,
    data: {
      user,
      donor,
      requests,
      donor_responses: donorResponses,
    },
  });
});

module.exports = {
  getAnalytics,
  getActiveRequests,
  getPendingVerification,
  verifyRequest,
  updateUser,
  getAuditLog,
  getUsers,
  getUserById,
};
