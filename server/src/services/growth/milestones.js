import mongoose from 'mongoose'
import { growth, refundWindowMs } from '../../config/growth.js'
import { Order } from '../../models/Order.js'
import { Teacher } from '../../models/Teacher.js'
import { TeacherBonus } from '../../models/TeacherBonus.js'
import { conflict, notFound } from '../../utils/AppError.js'

const oid = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)))

// Unique paying students: distinct buyer ACCOUNTS whose order was confirmed by the webhook, is past the refund
// window and was not refunded. Clicks, sign-ups and repeat orders by the same student never add to it.
export async function qualifiedStudentCount(teacherId, now = new Date()) {
  const cutoff = new Date(now.getTime() - refundWindowMs())
  const rows = await Order.aggregate([
    { $match: { teacherId: oid(teacherId), status: 'paid', saleConfirmedAt: { $exists: true }, paidAt: { $lte: cutoff } } },
    { $group: { _id: '$user' } },
    { $count: 'students' },
  ])
  return rows[0]?.students ?? 0
}

// Creates a bonus as "eligible" the first time a milestone is reached (once per teacher per milestone). A refund that
// drops the count back below a milestone that is still only "eligible" sets it back to "not_eligible"; an approved
// or issued bonus is never touched. Nothing is paid or issued here.
export async function evaluateMilestones(teacherId, now = new Date()) {
  const students = await qualifiedStudentCount(teacherId, now)
  for (const milestone of growth.MILESTONES) {
    const existing = await TeacherBonus.findOne({ teacher: oid(teacherId), milestone: milestone.students })
    if (students >= milestone.students) {
      if (!existing) {
        try {
          await TeacherBonus.create({
            teacher: oid(teacherId),
            milestone: milestone.students,
            giftValuePaise: milestone.giftValuePaise,
            partnerTeacher: Boolean(milestone.partnerTeacher),
            status: 'eligible',
            reachedAt: now,
          })
        } catch (err) {
          if (err?.code !== 11000) throw err
        }
      } else if (existing.status === 'not_eligible') {
        await TeacherBonus.updateOne({ _id: existing._id, status: 'not_eligible' }, { $set: { status: 'eligible', reachedAt: now } })
      }
    } else if (existing?.status === 'eligible') {
      await TeacherBonus.updateOne({ _id: existing._id, status: 'eligible' }, { $set: { status: 'not_eligible' } })
    }
  }
  return students
}

// Admin decision: eligible -> approved. Approving the "Partner Teacher" milestone also flags the teacher.
export async function approveBonus(bonusId, adminId, now = new Date()) {
  const bonus = await TeacherBonus.findOneAndUpdate(
    { _id: bonusId, status: 'eligible' },
    { $set: { status: 'approved', approvedAt: now, approvedBy: adminId } },
    { returnDocument: 'after' },
  )
  if (!bonus) {
    const exists = await TeacherBonus.exists({ _id: bonusId })
    throw exists ? conflict('Only an eligible bonus can be approved.') : notFound('Bonus not found')
  }
  if (bonus.partnerTeacher) await Teacher.updateOne({ _id: bonus.teacher }, { $set: { partnerTeacher: true } })
  return bonus
}

// Admin records that the gift was given (card details etc. go in the note): approved -> issued.
export async function issueBonus(bonusId, adminId, note, now = new Date()) {
  const bonus = await TeacherBonus.findOneAndUpdate(
    { _id: bonusId, status: 'approved' },
    { $set: { status: 'issued', issuedAt: now, issuedBy: adminId, note } },
    { returnDocument: 'after' },
  )
  if (!bonus) {
    const exists = await TeacherBonus.exists({ _id: bonusId })
    throw exists ? conflict('Approve the bonus before marking it issued.') : notFound('Bonus not found')
  }
  return bonus
}
