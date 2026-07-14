const mongoose = require('mongoose');

/**
 * DonorResponse Schema — replaces the MySQL `donor_responses` table.
 * Tracks how each donor responds to a blood request.
 */
const donorResponseSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
    },
    response: {
      type: String,
      enum: ['accepted', 'declined', 'no_response'],
      default: 'no_response',
    },
    responseTime: {
      type: Date,
      default: null,
    },
    notificationSentAt: {
      type: Date,
      default: Date.now,
    },
    notificationStatus: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'queued'],
      default: 'queued',
    },
    notificationId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
// Compound unique index: one response per donor per request
donorResponseSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
donorResponseSchema.index({ requestId: 1 });
donorResponseSchema.index({ donorId: 1 });

module.exports = mongoose.model('DonorResponse', donorResponseSchema);
