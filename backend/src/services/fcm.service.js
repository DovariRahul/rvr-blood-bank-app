const { admin, getFirebaseInitStatus } = require('../config/firebase');
const NotificationLog = require('../models/NotificationLog');
const User = require('../models/User');
const { logger } = require('../utils/logger');

/**
 * Log notification to database.
 * Migrated from MySQL INSERT to Mongoose create().
 */
async function logNotification(userId, requestId, message, status, externalId = null) {
  try {
    await NotificationLog.create({
      recipientId: userId,
      type: 'push',
      relatedRequest: requestId || null,
      messageBody: message,
      status,
      externalId,
    });
  } catch (err) {
    logger.error(`Failed to log notification for user ${userId}:`, err.message);
  }
}

/**
 * Send a generic push notification to a user's FCM token.
 * Preserved from original server.
 */
async function sendPushNotification(user, title, body, data = {}) {
  if (!user.fcmToken) {
    logger.info(`User ${user._id || user.id} has no FCM token. Cannot send push notification.`);
    return false;
  }

  if (!getFirebaseInitStatus()) {
    logger.info(`[SIMULATED PUSH] To: ${user.fullName} | Title: ${title} | Body: ${body}`);
    await logNotification(user._id || user.id, data.requestId || null, body, 'delivered', 'simulated_fcm');
    return true;
  }

  const message = {
    notification: { title, body },
    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    token: user.fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`Push notification sent to user ${user._id || user.id}. Message ID: ${response}`);
    await logNotification(user._id || user.id, data.requestId || null, body, 'sent', response);
    return true;
  } catch (error) {
    logger.error(`Error sending push notification to user ${user._id || user.id}:`, error);
    await logNotification(user._id || user.id, data.requestId || null, body, 'failed', null);

    // If token is invalid, clear it from DB
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      await User.findByIdAndUpdate(user._id || user.id, { fcmToken: null });
      logger.info(`Cleared invalid FCM token for user ${user._id || user.id}`);
    }

    return false;
  }
}

/**
 * Notify a donor about a new blood request match.
 * Preserved from original server.
 */
async function sendDonorNotification(donor, request) {
  const urgencyLabel = request.urgency.toUpperCase();
  const title = `🚨 ${urgencyLabel} Blood Request: ${request.bloodGroupNeeded}`;
  const body = `Hi ${donor.userId?.fullName || 'Donor'}, an urgent request for ${request.bloodGroupNeeded} blood at ${request.hospitalName} (${request.hospitalCity}) needs your help. Tap to view and respond!`;

  const data = {
    type: 'blood_request',
    requestId: (request._id || request.id).toString(),
    urgency: request.urgency,
  };

  // The donor object might have populated userId or just a plain object
  const userObj = donor.userId && typeof donor.userId === 'object'
    ? donor.userId
    : { _id: donor.userId, fcmToken: donor.fcmToken, fullName: donor.fullName };

  return await sendPushNotification(userObj, title, body, data);
}

/**
 * Send confirmation to a donor when they accept a request.
 */
async function sendAcceptanceConfirmation(donor, request) {
  const donorName = donor.userId?.fullName || donor.fullName || 'Donor';
  const title = 'Thank You for Accepting! ❤️';
  const body = `Thank you, ${donorName}! Please proceed to ${request.hospitalName}. Contact: ${request.contactName} at ${request.contactPhone}.`;

  const userObj = donor.userId && typeof donor.userId === 'object'
    ? donor.userId
    : { _id: donor.userId, fcmToken: donor.fcmToken, fullName: donorName };

  return await sendPushNotification(userObj, title, body, {
    type: 'acceptance_confirmation',
    requestId: (request._id || request.id).toString(),
  });
}

/**
 * Notify the requester when a donor accepts.
 */
async function sendSeekerNotification(request, donor) {
  const requester = await User.findById(request.requesterId).select('fullName fcmToken');
  if (!requester) return false;

  const donorName = donor.userId?.fullName || donor.fullName || 'A donor';
  const title = 'Good News! Donor Found 🩸';
  const body = `${donorName} (${donor.bloodGroup}) has accepted your blood request for ${request.hospitalName} and is on their way.`;

  return await sendPushNotification(requester, title, body, {
    type: 'donor_accepted',
    requestId: (request._id || request.id).toString(),
  });
}

module.exports = {
  sendPushNotification,
  sendDonorNotification,
  sendAcceptanceConfirmation,
  sendSeekerNotification,
};
