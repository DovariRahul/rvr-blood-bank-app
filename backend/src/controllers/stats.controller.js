const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const { asyncHandler, calculateAge } = require('../utils/helpers');

/**
 * GET /api/stats/public
 * Public statistics for the home page.
 * Migrated from MySQL to MongoDB aggregation.
 */
const getPublicStats = asyncHandler(async (req, res) => {
  const [totalDonors, fulfilledRequests, totalRequests, bloodGroupAvailability] = await Promise.all([
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
      { $count: 'count' },
    ]),
    BloodRequest.countDocuments({ status: 'fulfilled' }),
    BloodRequest.countDocuments(),
    Donor.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$bloodGroup', available_count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { blood_group: '$_id', available_count: 1, _id: 0 } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      total_donors: totalDonors[0]?.count || 0,
      total_requests: totalRequests,
      requests_fulfilled: fulfilledRequests,
      lives_saved: fulfilledRequests,
      blood_group_availability: bloodGroupAvailability,
    },
  });
});

/**
 * GET /api/stats/public/donors
 * Public list of donors by blood group.
 */
const getPublicDonorsByGroup = asyncHandler(async (req, res) => {
  const { blood_group } = req.query;
  if (!blood_group) {
    return res.status(400).json({ success: false, message: 'Blood group is required.' });
  }

  const donors = await Donor.find({
    bloodGroup: blood_group,
    isAvailable: true,
  })
    .populate({
      path: 'userId',
      match: { isActive: true },
      select: 'fullName phone',
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  // Filter null (inactive users) and mask phone numbers
  const formattedDonors = donors
    .filter((d) => d.userId)
    .map((d) => {
      let maskedPhone = d.userId.phone;
      if (maskedPhone && maskedPhone.length >= 10) {
        const last4 = maskedPhone.slice(-4);
        maskedPhone = maskedPhone.slice(0, maskedPhone.length - 8) + '****' + last4;
      }

      return {
        name: d.userId.fullName,
        phone: maskedPhone,
        blood_group: d.bloodGroup,
        city: d.address?.city,
        state: d.address?.state,
        gender: d.gender,
        age: calculateAge(d.dateOfBirth),
      };
    });

  res.json({ success: true, data: formattedDonors });
});

module.exports = { getPublicStats, getPublicDonorsByGroup };
