import { Teacher } from '../../models/Teacher.js'
import { badRequest } from '../../utils/AppError.js'
import { normalizeCode, phoneKey } from './codes.js'

export const findTeacherByCode = (code) => {
  const normalized = normalizeCode(code)
  return normalized ? Teacher.findOne({ code: normalized }) : null
}

// A teacher may not redeem their own code: the account's email or phone matches the teacher's.
export function isTeacherSelf(teacher, user) {
  if (!teacher || !user) return false
  if (teacher.email && user.email && teacher.email.toLowerCase() === String(user.email).toLowerCase()) return true
  const teacherPhone = phoneKey(teacher.phone)
  return Boolean(teacherPhone && phoneKey(user.phone) === teacherPhone)
}

// Why this teacher code cannot be used by this user right now, or null when it can.
export function teacherCodeProblem(teacher, user) {
  if (teacher.blocked) return 'This code is no longer available.'
  if (!teacher.active) return 'This teacher code is not active.'
  if (isTeacherSelf(teacher, user)) return 'You cannot use your own teacher code.'
  return null
}

// Strict = the user typed it (explain the problem); otherwise a saved link is ignored quietly.
export async function usableTeacher(code, user, { strict = false } = {}) {
  const teacher = await findTeacherByCode(code)
  if (!teacher) return null
  const problem = teacherCodeProblem(teacher, user)
  if (problem) {
    if (strict) throw badRequest(problem)
    return null
  }
  return teacher
}
