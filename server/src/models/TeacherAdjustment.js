import mongoose from 'mongoose'

// A negative amount owed back by a teacher: the order behind an already-paid commission was refunded.
// It is deducted from the next payout. One per order.
const teacherAdjustmentSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    amountPaise: { type: Number, required: true, max: -1, validate: Number.isInteger },
    reason: { type: String, maxlength: 200, default: 'order refunded after payout' },
    status: { type: String, enum: ['open', 'applied'], default: 'open' },
    payout: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPayout' },
  },
  { timestamps: true },
)

export const TeacherAdjustment = mongoose.model('TeacherAdjustment', teacherAdjustmentSchema)
