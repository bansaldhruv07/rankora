import mongoose from 'mongoose'

// Money actually sent to a teacher (by UPI). `amountPaise` is net: the covered commissions minus any refund
// adjustments that were open at the time.
const teacherPayoutSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    grossPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    adjustmentsPaise: { type: Number, default: 0, max: 0, validate: Number.isInteger },
    upiRef: { type: String, required: true, trim: true, maxlength: 100 },
    paidAt: { type: Date, required: true },
    note: { type: String, maxlength: 300, default: '' },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    adjustments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeacherAdjustment' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const TeacherPayout = mongoose.model('TeacherPayout', teacherPayoutSchema)
