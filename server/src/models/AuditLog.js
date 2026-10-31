import mongoose from 'mongoose'

// Append-only record of administrative actions.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: String,
    action: { type: String, required: true, maxlength: 80 },
    entityType: { type: String, maxlength: 40 },
    entityId: String,
    summary: { type: String, maxlength: 300 },
    meta: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
