const mongoose = require('mongoose');

/**
 * AuditLog Schema — replaces the MySQL `admin_audit_log` table.
 * Tracks admin actions for accountability.
 */
const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['user', 'donor', 'request', 'system'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ performedAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
