const mongoose = require('mongoose');

/**
 * User Schema — replaces the MySQL `users` table.
 * 
 * Changes from original:
 * - `role` enum: 'patient' → 'requester' for clarity
 * - Added `bloodGroup` field directly on user (was only on donors table before)
 * - Added `avatar` field for profile pictures
 * - Passwords are stored as `passwordHash` (same as original)
 */
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never return in queries by default
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['requester', 'donor', 'admin'],
      default: 'requester',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null, // Cloudinary URL
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──
userSchema.index({ role: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ bloodGroup: 1 });

// ── Virtual: donor profile ──
userSchema.virtual('donorProfile', {
  ref: 'Donor',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

module.exports = mongoose.model('User', userSchema);
