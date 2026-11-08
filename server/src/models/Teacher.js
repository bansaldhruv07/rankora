import mongoose from 'mongoose'
import { growth } from '../config/growth.js'

// An offline teacher who shares a code with students. Teachers have no login: they see their numbers on a
// read-only page addressed by the secret `statsToken`. There is no public sign-up; an admin creates them.
const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 15 }, // digits only
    email: { type: String, lowercase: true, trim: true, maxlength: 254 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9]{4,16}$/ },
    discountPercent: { type: Number, default: () => growth.TEACHER_STUDENT_DISCOUNT_PERCENT, min: 0, max: 90, validate: Number.isInteger },
    commissionPercent: { type: Number, default: () => growth.TEACHER_COMMISSION_PERCENT, min: 0, max: 90, validate: Number.isInteger },
    active: { type: Boolean, default: true },
    // A blocked code is refused with its own message (fraud, misuse); `active` is the everyday on/off switch.
    blocked: { type: Boolean, default: false },
    statsToken: { type: String, required: true, unique: true },
    // Set when the "Partner Teacher" milestone bonus is approved.
    partnerTeacher: { type: Boolean, default: false },
    notes: { type: String, maxlength: 500, default: '' },
  },
  { timestamps: true },
)

export const Teacher = mongoose.model('Teacher', teacherSchema)
