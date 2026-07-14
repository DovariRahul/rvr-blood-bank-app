const mongoose = require('mongoose');

/**
 * Notification Schema — replaces the MySQL `user_notifications` table.
 * In-app notification inbox for all users.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null,
    },
    type: {
      type: String,
      enum: ['blood_request', 'donor_accepted', 'request_verified', 'request_rejected', 'general'],
      default: 'blood_request',
    },
    message: {
      type: String,
      required: true,
    },
    // Embedded blood request details for quick display without populating
    bloodRequestDetails: {
      patientName: String,
      bloodGroup: String,
      urgency: String,
      hospitalName: String,
      hospitalAddress: String,
      hospitalCity: String,
      hospitalState: String,
      hospitalPincode: String,
      contactName: String,
      contactPhone: String,
      additionalNotes: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
