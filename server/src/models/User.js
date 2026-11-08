import mongoose from 'mongoose'

export const ROLES = ['student', 'editor', 'admin']

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    // Only ever set from the server (create-admin script or an admin action), never from a request body.
    role: { type: String, enum: ROLES, default: 'student' },
    tokenVersion: { type: Number, default: 0, select: false },
    suspendedAt: Date,
    // Optional contact number (digits only); used to stop a teacher redeeming their own code.
    phone: { type: String, trim: true, maxlength: 15 },
    // Shown on /refer and shared as /?ref=CODE. Created the first time it is needed.
    referralCode: { type: String, uppercase: true, trim: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
)

userSchema.index({ createdAt: -1 })
userSchema.index({ referralCode: 1 }, { unique: true, partialFilterExpression: { referralCode: { $type: 'string' } } })

userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), name: this.name, email: this.email, phone: this.phone ?? null, role: this.role, createdAt: this.createdAt }
}

export const User = mongoose.model('User', userSchema)
