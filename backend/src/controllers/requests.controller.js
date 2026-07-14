const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Donor = require('../models/Donor');
const DonorResponse = require('../models/DonorResponse');
const Notification = require('../models/Notification');
const { asyncHandler, formatPhoneE164 } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, AppError } = require('../utils/errors');
const { findMatchingDonors } = require('../services/matching.service');
const { sendDonorNotification } = require('../services/fcm.service');
const { logger } = require('../utils/logger');

/**
 * POST /api/requests
 * Create a new blood request and trigger donor matching.
 * Migrated from MySQL to Mongoose. All business logic preserved.
 */
const createRequest = asyncHandler(async (req, res) => {
  const {
    patient_name, blood_group_needed, units_needed, urgency,
    hospital_name, hospital_address, hospital_city, hospital_state, hospital_pincode,
    contact_name, contact_phone, additional_notes,
    latitude, longitude, medical_proof_url,
  } = req.body;

  const expiryHours = parseInt(process.env.REQUEST_EXPIRY_HOURS, 10) || 24;
  const formattedPhone = formatPhoneE164(contact_phone);
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // Create request
  const request = await BloodRequest.create({
    requesterId: req.user._id,
    patientName: patient_name,
    bloodGroupNeeded: blood_group_needed,
    unitsNeeded: units_needed,
    urgency,
    hospitalName: hospital_name,
    hospitalAddress: hospital_address,
    hospitalCity: hospital_city,
    hospitalState: hospital_state,
    hospitalPincode: hospital_pincode,
    hospitalLocation: latitude && longitude
      ? { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] }
      : undefined,
    contactName: contact_name,
    contactPhone: formattedPhone,
    additionalNotes: additional_notes || null,
    medicalProofUrl: medical_proof_url || null,
    status: 'pending_verification',
    expiresAt,
  });

  // Update status to matching
  request.status = 'matching';
  await request.save();

  // Trigger matching engine asynchronously
  setImmediate(async () => {
    try {
      const matchingDonors = await findMatchingDonors(request);

      if (matchingDonors.length > 0) {
        let notifiedCount = 0;

        for (const donor of matchingDonors) {
          const sent = await sendDonorNotification(donor, request);
          if (sent) notifiedCount++;

          // Create donor response record
          try {
            await DonorResponse.create({
              requestId: request._id,
              donorId: donor._id,
              notificationStatus: sent ? 'sent' : 'failed',
              notificationId: sent ? 'fcm_push' : null,
            });
          } catch (err) {
            // Ignore duplicate key errors
            if (err.code !== 11000) {
              logger.error(`Failed to create donor_response for donor ${donor._id}:`, err.message);
            }
          }
        }

        // Update request with notification count
        await BloodRequest.findByIdAndUpdate(request._id, {
          status: 'matched',
          donorsNotified: notifiedCount,
        });

        logger.info(`Request #${request._id}: ${notifiedCount} donors notified`);
      } else {
        await BloodRequest.findByIdAndUpdate(request._id, { status: 'pending' });
        logger.warn(`Request #${request._id}: No matching donors found`);
      }
    } catch (error) {
      logger.error(`Matching failed for request #${request._id}:`, error.message);
      await BloodRequest.findByIdAndUpdate(request._id, { status: 'pending' });
    }

    // Send in-app notifications to matching users
    try {
      const notifMessage = `Someone needs your ${blood_group_needed} blood group blood! A patient requires urgent help — please check the details below.`;

      // Find all matching users (by blood_group on User model and Donor model)
      const matchingUsers = await User.find({
        bloodGroup: blood_group_needed,
        isActive: true,
        _id: { $ne: req.user._id },
      }).select('_id');

      const matchingDonorUsers = await Donor.find({
        bloodGroup: blood_group_needed,
      })
        .populate({ path: 'userId', match: { isActive: true, _id: { $ne: req.user._id } }, select: '_id' })
        .lean();

      // Merge and deduplicate recipient IDs
      const allIds = new Set([
        ...matchingUsers.map((u) => u._id.toString()),
        ...matchingDonorUsers
          .filter((d) => d.userId)
          .map((d) => d.userId._id.toString()),
      ]);

      if (allIds.size > 0) {
        const notifications = [];
        for (const uid of allIds) {
          notifications.push({
            recipientId: uid,
            requestId: request._id,
            type: 'blood_request',
            message: notifMessage,
            bloodRequestDetails: {
              patientName: patient_name,
              bloodGroup: blood_group_needed,
              urgency,
              hospitalName: hospital_name,
              hospitalAddress: hospital_address,
              hospitalCity: hospital_city,
              hospitalState: hospital_state,
              hospitalPincode: hospital_pincode,
              contactName: contact_name,
              contactPhone: contact_phone,
              additionalNotes: additional_notes || null,
            },
          });
        }

        await Notification.insertMany(notifications);
        logger.info(`Request #${request._id}: in-app notifications sent to ${allIds.size} users`);
      }
    } catch (notifError) {
      logger.error(`Failed to create in-app notifications for request #${request._id}:`, notifError.message);
    }
  });

  res.status(201).json({
    success: true,
    data: {
      request: {
        id: request._id,
        status: 'pending',
        blood_group_needed,
        units_needed,
        urgency,
        created_at: request.createdAt,
        expires_at: request.expiresAt,
      },
      message: 'Request submitted. Matching donors will be notified shortly.',
    },
  });
});

/**
 * GET /api/requests/:id
 * Get a single request with donor response summary.
 */
const getRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const request = await BloodRequest.findById(id).lean();
  if (!request) throw new NotFoundError('Request');

  // Access control: owner or admin
  if (req.user.role !== 'admin' && request.requesterId.toString() !== req.user._id.toString()) {
    throw new ForbiddenError('You can only view your own requests.');
  }

  // Get accepted donors
  const acceptedDonors = await DonorResponse.find({
    requestId: id,
    response: 'accepted',
  })
    .populate({
      path: 'donorId',
      populate: { path: 'userId', select: 'fullName' },
    })
    .sort({ responseTime: 1 })
    .lean();

  const maskedDonors = acceptedDonors.map((d) => ({
    first_name: d.donorId?.userId?.fullName?.split(' ')[0] || 'Donor',
    blood_group: d.donorId?.bloodGroup,
    accepted_at: d.responseTime,
  }));

  res.json({
    success: true,
    data: {
      request: {
        ...request,
        accepted_donors: maskedDonors,
      },
    },
  });
});

/**
 * GET /api/requests
 * Get requests (requesters see own, admins see all).
 */
const getRequests = asyncHandler(async (req, res) => {
  const { status, blood_group, urgency, page = 1, limit = 20, sort_by = 'createdAt', sort_order = 'desc' } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  // Role-based filtering
  if (req.user.role !== 'admin') {
    filter.requesterId = req.user._id;
  }

  if (status) filter.status = status;
  if (blood_group) filter.bloodGroupNeeded = blood_group;
  if (urgency) filter.urgency = urgency;

  const allowedSorts = ['createdAt', 'urgency', 'status', 'bloodGroupNeeded', 'unitsNeeded'];
  const sortColumn = allowedSorts.includes(sort_by) ? sort_by : 'createdAt';
  const sortDir = sort_order === 'asc' ? 1 : -1;

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .sort({ [sortColumn]: sortDir })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    BloodRequest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      requests,
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
 * PATCH /api/requests/:id/status
 * Update request status.
 */
const updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const request = await BloodRequest.findById(id);
  if (!request) throw new NotFoundError('Request');

  // Validate status transition (preserved from original)
  const allowedTransitions = {
    pending_verification: ['pending', 'cancelled'],
    pending: ['matching', 'cancelled'],
    matching: ['matched', 'cancelled', 'pending'],
    matched: ['fulfilled', 'cancelled'],
    fulfilled: [],
    cancelled: [],
    expired: [],
  };

  const allowed = allowedTransitions[request.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot transition from '${request.status}' to '${status}'.`, 422, 'UNPROCESSABLE_ENTITY');
  }

  request.status = status;
  if (status === 'fulfilled') request.fulfilledAt = new Date();
  await request.save();

  logger.info(`Request #${id} status changed: ${request.status} → ${status}`);

  res.json({
    success: true,
    data: { id, status },
    message: `Request status updated to '${status}'.`,
  });
});

/**
 * PATCH /api/requests/:id/cancel
 */
const cancelRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const request = await BloodRequest.findById(id);
  if (!request) throw new NotFoundError('Request');

  // Only owner or admin can cancel
  if (req.user.role !== 'admin' && request.requesterId.toString() !== req.user._id.toString()) {
    throw new ForbiddenError('You can only cancel your own requests.');
  }

  if (['fulfilled', 'cancelled', 'expired'].includes(request.status)) {
    throw new AppError(`Cannot cancel a request that is already '${request.status}'.`, 422, 'UNPROCESSABLE_ENTITY');
  }

  request.status = 'cancelled';
  await request.save();

  res.json({
    success: true,
    message: 'Request cancelled successfully.',
  });
});

module.exports = { createRequest, getRequest, getRequests, updateRequestStatus, cancelRequest };
