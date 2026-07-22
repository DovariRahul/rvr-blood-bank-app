const BloodRequest = require('../models/BloodRequest');
const DonorResponse = require('../models/DonorResponse');
const { asyncHandler, formatPhoneE164 } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * POST /api/requests
 * Create a new blood request.
 *
 * NOTE: Donor matching and FCM push notifications are intentionally NOT triggered
 * here. The request sits at 'pending_verification' until an admin approves it.
 * The full matching + notification pipeline runs in admin.controller.js →
 * verifyRequest (approve branch).
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
    // Stays at pending_verification — donors notified ONLY after admin approves.
    status: 'pending_verification',
    expiresAt,
  });

  logger.info(`Blood request #${request._id} submitted by user ${req.user._id}. Awaiting admin verification.`);

  res.status(201).json({
    success: true,
    data: {
      request: {
        id: request._id,
        status: 'pending_verification',
        blood_group_needed,
        units_needed,
        urgency,
        created_at: request.createdAt,
        expires_at: request.expiresAt,
      },
      message: 'Request submitted. Our team will review it and notify matching donors shortly.',
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
