const mongoose = require('mongoose');

/**
 * Donor Schema — replaces the MySQL `donors` table.
 * 
 * Key changes:
 * - Address is an embedded sub-document
 * - Location uses GeoJSON Point for MongoDB $geoNear queries
 *   (replaces the Haversine SQL formula from matching.service.js)
 * - `2dsphere` index enables efficient geospatial donor search
 */
const donorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    weightKg: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [50, 'Minimum weight for donation is 50 kg'],
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    medicalConditions: {
      type: String,
      maxlength: 500,
      default: null,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // Embedded address sub-document
    address: {
      line: {
        type: String,
        required: [true, 'Address line is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      pincode: {
        type: String,
        required: [true, 'Pincode is required'],
        match: [/^\d{6}$/, 'Enter a valid 6-digit PIN code'],
      },
    },
    // GeoJSON Point for geospatial queries
    location: {
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
    notificationOptIn: {
      type: Boolean,
      default: true,
    },
    totalDonations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──
donorSchema.index({ bloodGroup: 1, isAvailable: 1 }); // Compound for matching
donorSchema.index({ location: '2dsphere' }); // Geospatial

// ── Virtuals ──
donorSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
});

donorSchema.virtual('isEligible').get(function () {
  if (!this.lastDonationDate) return true;
  const daysSince = Math.floor((Date.now() - new Date(this.lastDonationDate)) / (1000 * 60 * 60 * 24));
  return daysSince >= 56;
});

donorSchema.virtual('daysUntilEligible').get(function () {
  if (!this.lastDonationDate) return 0;
  const daysSince = Math.floor((Date.now() - new Date(this.lastDonationDate)) / (1000 * 60 * 60 * 24));
  return Math.max(0, 56 - daysSince);
});

// ── Populate user info by default ──
donorSchema.pre(/^find/, function () {
  // Only populate if not explicitly skipped
  if (!this.getOptions().skipPopulate) {
    this.populate('userId', 'fullName email phone isVerified fcmToken');
  }
});

module.exports = mongoose.model('Donor', donorSchema);
