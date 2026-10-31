import { AuditLog } from '../models/AuditLog.js'
import { logger } from '../utils/logger.js'

// Records an admin action. Never throws: a failed audit write must not undo or block the action,
// but it is logged loudly.
export async function audit(req, action, { type, id, summary, meta } = {}) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action,
      entityType: type,
      entityId: id ? String(id) : undefined,
      summary: summary?.slice(0, 300),
      meta,
      ip: req.ip,
    })
  } catch (err) {
    logger.error('audit write failed', { action, error: err.message })
  }
}
