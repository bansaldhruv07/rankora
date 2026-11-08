import mongoose from 'mongoose'
import { Order } from '../../models/Order.js'
import { TeacherAdjustment } from '../../models/TeacherAdjustment.js'
import { TeacherPayout } from '../../models/TeacherPayout.js'
import { conflict } from '../../utils/AppError.js'

const oid = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)))

export const payableOrdersFor = (teacherId) =>
  Order.find({ teacherId: oid(teacherId), status: 'paid', commissionStatus: 'payable' }).sort({ paidAt: 1 })

export const openAdjustmentsFor = (teacherId) => TeacherAdjustment.find({ teacher: oid(teacherId), status: 'open' }).sort({ createdAt: 1 })

// Pays out the chosen payable commissions. Any open refund adjustments are deducted automatically, so the money sent
// (amountPaise) is the commissions minus what the teacher owes back. The payout can never be negative.
export async function createPayout({ teacherId, orderIds, upiRef, paidAt = new Date(), note = '', createdBy }) {
  const ids = [...new Set(orderIds.map(String))]
  const orders = await Order.find({ _id: { $in: ids }, teacherId: oid(teacherId), status: 'paid', commissionStatus: 'payable' })
  if (!ids.length || orders.length !== ids.length) throw conflict('Some of the selected orders are not payable (already paid, still in the refund window, or refunded).')

  const adjustments = await openAdjustmentsFor(teacherId)
  const grossPaise = orders.reduce((sum, o) => sum + o.commissionPaise, 0)
  const adjustmentsPaise = adjustments.reduce((sum, a) => sum + a.amountPaise, 0)
  const amountPaise = grossPaise + adjustmentsPaise
  if (amountPaise < 0) throw conflict('Refund adjustments are larger than the selected commissions. Select more orders.')

  const payout = await TeacherPayout.create({
    teacher: oid(teacherId),
    amountPaise,
    grossPaise,
    adjustmentsPaise,
    upiRef,
    paidAt,
    note,
    orders: orders.map((o) => o._id),
    adjustments: adjustments.map((a) => a._id),
    createdBy,
  })

  // Claim the orders atomically. If another admin paid one of them meanwhile, undo this payout.
  const claimed = await Order.updateMany(
    { _id: { $in: ids }, commissionStatus: 'payable' },
    { $set: { commissionStatus: 'paid', commissionPayout: payout._id } },
  )
  if (claimed.modifiedCount !== ids.length) {
    await Order.updateMany({ commissionPayout: payout._id }, { $set: { commissionStatus: 'payable' }, $unset: { commissionPayout: 1 } })
    await TeacherPayout.deleteOne({ _id: payout._id })
    throw conflict('Another payout covered some of these orders. Reload and try again.')
  }
  if (adjustments.length) {
    await TeacherAdjustment.updateMany({ _id: { $in: adjustments.map((a) => a._id) }, status: 'open' }, { $set: { status: 'applied', payout: payout._id } })
  }
  return payout
}
