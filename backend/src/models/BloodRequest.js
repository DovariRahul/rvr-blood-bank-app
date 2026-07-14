const mongoose = require('mongoose');

/**
 * BloodRequest Schema — replaces the MySQL `blood_requests` table.
 * 
 * Key changes:
 * - Added admin verification workflow: `verificationStatus`, `verifiedBy`, `rejectionReason`
 * - Added `medicalProofUrl` for Cloudinary-stored medical proof documents
 * - Hospital location uses GeoJSON for geo-based donor matching
 * - Status enum expanded with 'pending_verification' step
 */
const bloodRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    bloodGroupNeeded: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
    },
    unitsNeeded: {
      type: Number,
      required: [true, 'Units needed is required'],
      min: 1,
      max: 10,
    },
    urgency: {
      type: String,
      enum: ['critical', 'urgent', 'standard'],
      default: 'standard',
    },
    // Hospital details
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    hospitalAddress: {
      type: String,
      required: [true, 'Hospital address is required'],
      trim: true,
    },
    hospitalCity: {
      type: String,
      required: [true, 'Hospital city is required'],
      trim: true,
    },
    hospitalState: {
      type: String,
      required: [true, 'Hospital state is required'],
      trim: true,
    },
    hospitalPincode: {
      type: String,
      required: [true, 'Hospital pincode is required'],
      match: [/^\d{6}$/, 'Enter a valid 6-digit PIN code'],
    },
    // GeoJSON for hospital location (used by matching engine)
    hospitalLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    // Contact info
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
    },
    additionalNotes: {
      type: String,
      maxlength: 500,
      default: null,
    },
    // Medical proof (Cloudinary URL)
    medicalProofUrl: {
      type: String,
      default: null,
    },
    // Request status
    status: {
      type: String,
      enum: ['pending_verification', 'pending', 'matching', 'matched', 'fulfilled', 'cancelled', 'expired'],
      default: 'pending_verification',
    },
    // Admin verification
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    // Matching stats
    donorsNotified: {
      type: Number,
      default: 0,
    },
    donorsAccepted: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──
bloodRequestSchema.index({ status: 1 });
bloodRequestSchema.index({ bloodGroupNeeded: 1 });
bloodRequestSchema.index({ requesterId: 1 });
bloodRequestSchema.index({ urgency: 1, status: 1 });
bloodRequestSchema.index({ hospitalLocation: '2dsphere' });
bloodRequestSchema.index({ verificationStatus: 1 });

// ── Virtuals ──
bloodRequestSchema.virtual('isExpired').get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
