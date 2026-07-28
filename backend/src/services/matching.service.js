const Donor = require('../models/Donor');
const DonorResponse = require('../models/DonorResponse');
const { logger } = require('../utils/logger');

/**
 * Blood group compatibility map.
 * Preserved from original server.
 * Key = patient's needed group, Value = compatible donor groups (ordered by preference).
 */
const COMPATIBILITY_MAP = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

/**
 * AI-Powered Donor Scoring Weights.
 * 
 * Total Score = (Blood Match × 0.35) + (Distance × 0.30) + (Availability × 0.20) + (Recency × 0.15)
 */
const WEIGHTS = {
  BLOOD_MATCH: 0.35,
  DISTANCE: 0.30,
  AVAILABILITY: 0.20,
  RECENCY: 0.15,
};

/**
 * Score a donor's blood group match.
 * @returns {number} Score 0–100
 */
function scoreBloodMatch(donorBloodGroup, requestedBloodGroup) {
  if (donorBloodGroup === requestedBloodGroup) return 100; // Exact match
  const compatibleGroups = COMPATIBILITY_MAP[requestedBloodGroup] || [];
  if (compatibleGroups.includes(donorBloodGroup)) return 60; // Compatible
  return 0; // Incompatible
}

/**
 * Score a donor's distance from the hospital.
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} Score 0–100
 */
function scoreDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return 30; // No location data — neutral score
  if (distanceKm <= 5) return 100;
  if (distanceKm <= 10) return 85;
  if (distanceKm <= 15) return 70;
  if (distanceKm <= 25) return 50;
  if (distanceKm <= 50) return 30;
  if (distanceKm <= 100) return 15;
  return 5;
}

/**
 * Score a donor's availability status.
 * @returns {number} Score 0–100
 */
function scoreAvailability(donor) {
  let score = 0;

  // Base availability
  if (donor.isAvailable) score += 50;

  // Notification opt-in
  if (donor.notificationOptIn) score += 30;

  // Eligibility (56-day rule)
  if (!donor.lastDonationDate) {
    score += 20; // Never donated — fully eligible
  } else {
    const daysSince = Math.floor((Date.now() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24));
    if (daysSince >= 56) score += 20;
  }

  return score;
}

/**
 * Score a donor's recency (time since last donation).
 * Donors who haven't donated recently are prioritized to distribute load.
 * @returns {number} Score 0–100
 */
function scoreRecency(donor) {
  if (!donor.lastDonationDate) return 100; // Never donated — highest priority

  const daysSince = Math.floor((Date.now() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24));

  if (daysSince > 365) return 95; // Over a year
  if (daysSince > 180) return 85; // Over 6 months
  if (daysSince > 90) return 70; // Over 3 months
  if (daysSince > 56) return 50; // Just eligible
  return 0; // Not eligible
}

/**
 * Calculate total donor score using the weighted 4-factor algorithm.
 */
function calculateDonorScore(donor, requestedBloodGroup, distanceKm = null) {
  const bloodScore = scoreBloodMatch(donor.bloodGroup, requestedBloodGroup);
  const distScore = scoreDistance(distanceKm);
  const availScore = scoreAvailability(donor);
  const recencyScore = scoreRecency(donor);

  const totalScore =
    bloodScore * WEIGHTS.BLOOD_MATCH +
    distScore * WEIGHTS.DISTANCE +
    availScore * WEIGHTS.AVAILABILITY +
    recencyScore * WEIGHTS.RECENCY;

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    breakdown: {
      bloodMatch: bloodScore,
      distance: distScore,
      availability: availScore,
      recency: recencyScore,
    },
  };
}

/**
 * Get search radius based on urgency level.
 * Preserved from original server.
 */
function getSearchRadius(urgency) {
  const radiusMap = {
    critical: 15,
    urgent: 25,
    standard: 50,
  };
  return radiusMap[urgency] || parseInt(process.env.MATCHING_RADIUS_KM, 10) || 25;
}

/**
 * Find matching donors for a blood request using AI-powered scoring.
 * 
 * Migrated from MySQL raw SQL to MongoDB aggregation pipeline.
 * Uses $geoNear for distance calculation (replaces Haversine SQL formula).
 * 
 * @param {Object} request - The blood request record
 * @returns {Array} Matching donors sorted by score (highest first)
 */
async function findMatchingDonors(request) {
  const { bloodGroupNeeded, urgency, hospitalCity, hospitalPincode, hospitalLocation } = request;

  // Step 1: Determine blood groups to search
  let bloodGroups = [bloodGroupNeeded];
  if (urgency === 'critical') {
    bloodGroups = COMPATIBILITY_MAP[bloodGroupNeeded] || [bloodGroupNeeded];
  }

  // Step 2: Get search radius
  const radiusKm = getSearchRadius(urgency);
  const expandedRadius = urgency === 'critical' ? Math.min(radiusKm * 3, 100) : radiusKm;

  // Step 3: Get recently over-notified donors (rate limiting)
  // Raise rateLimitPerDay to 1000 in development so testers aren't blocked after 3 tests
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const rateLimitPerDay = isDev ? 1000 : (parseInt(process.env.SMS_RATE_LIMIT_PER_DAY, 10) || 3);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const overNotifiedDonors = await DonorResponse.aggregate([
    { $match: { notificationSentAt: { $gte: twentyFourHoursAgo } } },
    { $group: { _id: '$donorId', count: { $sum: 1 } } },
    { $match: { count: { $gte: rateLimitPerDay } } },
  ]);
  const excludedDonorIds = overNotifiedDonors.map((d) => d._id);

  // Step 4: Check if we can use geospatial matching
  const hasLocation =
    hospitalLocation &&
    hospitalLocation.coordinates &&
    hospitalLocation.coordinates[0] !== 0 &&
    hospitalLocation.coordinates[1] !== 0;

  let donors = [];

  if (hasLocation) {
    // ── GeoNear Aggregation (replaces Haversine SQL) ──
    try {
      donors = await Donor.aggregate([
        {
          $geoNear: {
            near: hospitalLocation,
            distanceField: 'distanceMeters',
            maxDistance: expandedRadius * 1000, // Convert km to meters
            query: {
              bloodGroup: { $in: bloodGroups },
              isAvailable: true,
              notificationOptIn: true,
              _id: { $nin: excludedDonorIds },
              $or: [
                { lastDonationDate: null },
                {
                  lastDonationDate: {
                    $lte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
                  },
                },
              ],
            },
            spherical: true,
          },
        },
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
        { $limit: 30 },
      ]);

      // Calculate distance in km and add score
      donors = donors.map((donor) => {
        const distanceKm = donor.distanceMeters / 1000;
        const score = calculateDonorScore(donor, bloodGroupNeeded, distanceKm);
        return {
          ...donor,
          distanceKm: Math.round(distanceKm * 10) / 10,
          score: score.totalScore,
          scoreBreakdown: score.breakdown,
          // Reconstruct userId as a populated-like object so
          // sendDonorNotification can resolve _id and fcmToken correctly.
          userId: {
            _id: donor.user._id,
            fullName: donor.user.fullName,
            phone: donor.user.phone,
            email: donor.user.email,
            fcmToken: donor.user.fcmToken,
          },
          fullName: donor.user.fullName,
          phone: donor.user.phone,
          email: donor.user.email,
          fcmToken: donor.user.fcmToken,
        };
      });
    } catch (err) {
      logger.error('GeoNear query failed, falling back to non-geo search:', err.message);
      donors = [];
    }
  }

  // Step 5: Fallback — non-geo search by city/pincode
  if (donors.length === 0) {
    logger.info('Using city/pincode matching fallback');

    donors = await Donor.find({
      bloodGroup: { $in: bloodGroups },
      isAvailable: true,
      notificationOptIn: true,
      _id: { $nin: excludedDonorIds },
      $and: [
        {
          $or: [
            { lastDonationDate: null },
            { lastDonationDate: { $lte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } },
          ],
        },
        {
          $or: [
            { 'address.city': { $regex: new RegExp(`^${hospitalCity}$`, 'i') } },
            { 'address.pincode': hospitalPincode },
          ],
        },
      ],
    })
      .populate('userId', 'fullName phone email fcmToken isActive')
      .limit(30)
      .lean();

    // Filter active users and add scores
    donors = donors
      .filter((d) => d.userId && d.userId.isActive)
      .map((donor) => {
        const score = calculateDonorScore(donor, bloodGroupNeeded, null);
        return {
          ...donor,
          distanceKm: null,
          score: score.totalScore,
          scoreBreakdown: score.breakdown,
          fullName: donor.userId.fullName,
          phone: donor.userId.phone,
          email: donor.userId.email,
          fcmToken: donor.userId.fcmToken,
        };
      });
  }

  // Step 6: Sort by score (highest first) and limit
  donors.sort((a, b) => b.score - a.score);
  donors = donors.slice(0, 20);

  logger.info(
    `Found ${donors.length} matching donors for request #${request._id} ` +
    `(blood: ${bloodGroupNeeded}, urgency: ${urgency}, radius: ${expandedRadius}km)`
  );

  if (donors.length > 0) {
    logger.debug(`Top donor score: ${donors[0].score}, Bottom: ${donors[donors.length - 1].score}`);
  }

  return donors;
}

module.exports = { findMatchingDonors, calculateDonorScore, COMPATIBILITY_MAP };
