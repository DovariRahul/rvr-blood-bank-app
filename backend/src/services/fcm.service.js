const { admin, getFirebaseInitStatus } = require('../config/firebase');
const NotificationLog = require('../models/NotificationLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { logger } = require('../utils/logger');

/**
 * Create an in-app notification DB record (the inbox entry shown in the
 * Notifications tab). Call this alongside every FCM push so both the
 * device banner and the in-app inbox are always in sync.
 *
 * @param {string|ObjectId} userId     - Recipient's User._id
 * @param {string}          type       - Notification.type enum value
 * @param {string}          message    - Human-readable notification body
 * @param {string|ObjectId} [requestId] - Related BloodRequest._id (optional)
 */
async function createInAppNotification(userId, type, message, requestId = null, bloodRequestDetails = null) {
  try {
    await Notification.create({
      recipientId: userId,
      requestId: requestId || null,
      type,
      message,
      bloodRequestDetails,
    });
  } catch (err) {
    // Non-fatal — log but don't throw so the push still completes
    logger.error(`Failed to create in-app notification for user ${userId}:`, err.message);
  }
}

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
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    // Required by FCM HTTP v1 to route to the correct channel on Android 8+.
    // Without channelId the notification is silently dropped on modern Android.
    android: {
      notification: {
        channelId: 'default',
      },
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
 * Also creates an in-app notification record so FCM push and inbox are always in sync.
 */
async function sendDonorNotification(donor, request) {
  const urgencyLabel = request.urgency.toUpperCase();
  const title = `🚨 ${urgencyLabel} Blood Request: ${request.bloodGroupNeeded}`;
  const body = `Hi ${donor.userId?.fullName || 'Donor'}, your blood group is needed by someone. Please check the notification section in the RVR Blood Bank app.`;

  const data = {
    type: 'blood_request',
    requestId: (request._id || request.id).toString(),
    urgency: request.urgency,
  };

  // The donor object might have populated userId or just a plain object
  const userObj = donor.userId && typeof donor.userId === 'object'
    ? donor.userId
    : { _id: donor.userId, fcmToken: donor.fcmToken, fullName: donor.fullName };

  const sent = await sendPushNotification(userObj, title, body, data);

  // ── Always create the in-app notification record ──────────────────────────
  // This guarantees the Notifications tab always shows the request,
  // even if FCM delivery fails or the device is offline.
  const recipientId = userObj._id || userObj.id;
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

  await createInAppNotification(recipientId, 'blood_request', body, request._id || request.id, details);

  return sent;
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
  createInAppNotification,
  sendPushNotification,
  sendDonorNotification,
  sendAcceptanceConfirmation,
  sendSeekerNotification,
};
