const mongoose = require('mongoose');

/**
 * NotificationLog Schema — replaces the MySQL `notifications_log` table.
 * Audit trail for push/SMS notification delivery.
 */
const notificationLogSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['push', 'sms', 'email'],
      required: true,
    },
    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null,
    },
    messageBody: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'queued'],
      default: 'queued',
    },
    externalId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
notificationLogSchema.index({ recipientId: 1 });
notificationLogSchema.index({ relatedRequest: 1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
