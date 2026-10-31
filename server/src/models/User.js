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
    lastLoginAt: Date,
  },
  { timestamps: true },
)

userSchema.index({ createdAt: -1 })

userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), name: this.name, email: this.email, role: this.role, createdAt: this.createdAt }
}

export const User = mongoose.model('User', userSchema)
