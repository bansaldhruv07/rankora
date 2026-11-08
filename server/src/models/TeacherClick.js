import mongoose from 'mongoose'

// Link visits per teacher per day (day = YYYY-MM-DD, UTC).
const teacherClickSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  count: { type: Number, default: 0, min: 0 },
})
teacherClickSchema.index({ teacher: 1, day: 1 }, { unique: true })

export const TeacherClick = mongoose.model('TeacherClick', teacherClickSchema)
