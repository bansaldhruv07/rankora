import mongoose from 'mongoose'

export const BONUS_STATUSES = ['not_eligible', 'eligible', 'approved', 'issued']

// A milestone reward (gift card). Created as "eligible" when the teacher's unique paying students reach the milestone;
// an admin approves it and later marks it issued. Nothing is paid or issued automatically. One per teacher per milestone.
const teacherBonusSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    milestone: { type: Number, required: true, min: 1 },
    giftValuePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    partnerTeacher: { type: Boolean, default: false },
    status: { type: String, enum: BONUS_STATUSES, default: 'eligible' },
    reachedAt: { type: Date, default: Date.now },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedAt: Date,
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true },
)
teacherBonusSchema.index({ teacher: 1, milestone: 1 }, { unique: true })

export const TeacherBonus = mongoose.model('TeacherBonus', teacherBonusSchema)
