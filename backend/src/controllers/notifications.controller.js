const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * GET /api/notifications
 * Get all notifications for the logged-in user, newest first.
 * Migrated from MySQL to Mongoose.
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.json({
    success: true,
    data: {
      notifications,
      unread_count: unreadCount,
    },
  });
});

/**
 * GET /api/notifications/unread-count
 * Lightweight endpoint for polling.
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipientId: req.user._id,
    isRead: false,
  });

  res.json({
    success: true,
    data: { unread_count: count },
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findById(id);
  if (!notification) throw new NotFoundError('Notification');

  if (notification.recipientId.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only mark your own notifications as read.');
  }

  notification.isRead = true;
  await notification.save();

  res.json({ success: true, message: 'Notification marked as read.' });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for the logged-in user as read.
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipientId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
