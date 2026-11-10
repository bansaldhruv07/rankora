import { growth } from '../../config/growth.js'
import { badRequest } from '../../utils/AppError.js'
import { normalizeCode } from './codes.js'
import { attachedReferral, findReferrerByCode, referralEligibility } from './referrals.js'
import { findTeacherByCode, teacherCodeProblem, usableTeacher } from './teachers.js'

// Decides WHICH single discount source applies to an order. It does not compute amounts (pricing.js does).
//
//   1. A teacher always wins: a teacher code or saved teacher link beats a friend discount and any coupon (the
//      welcome coupon included), and the referrer then gets nothing for the order.
//   2. A typed teacher code replaces a saved teacher link. A typed coupon replaces a saved friend link.
//   3. With nothing typed: a saved teacher link, then the friend discount the user already has.
//   4. With none of those, pricing.js applies the welcome coupon on its own.
//   5. Only one source is ever returned: one discount at a time.
//
// Returns { source: 'none' | 'coupon' | 'teacher' | 'referral', ... }. A typed code that cannot be used throws a
// message that is safe to show. A saved link that cannot be used is ignored without an error.
export async function classifyCode({ code, user, attribution = {} }) {
  const typed = normalizeCode(code)
  const teachersOn = growth.teachersEnabled
  const referralsOn = growth.referralsEnabled

  const savedTeacher = teachersOn && attribution.teacherCode ? await usableTeacher(attribution.teacherCode, user) : null

  if (typed) {
    if (teachersOn) {
      const teacher = await findTeacherByCode(typed)
      if (teacher) {
        const problem = teacherCodeProblem(teacher, user)
        if (problem) throw badRequest(problem)
        return { source: 'teacher', teacher, code: typed, typed: true }
      }
    }
    if (referralsOn) {
      const owner = await findReferrerByCode(typed)
      if (owner) {
        // A teacher discount is already in play, so the friend code cannot be added on top (teacher always wins).
        if (savedTeacher) {
          return { source: 'teacher', teacher: savedTeacher, code: savedTeacher.code, notice: 'A teacher discount is already applied, so a friend code cannot be added.' }
        }
        const { problem, referral } = await referralEligibility(user, owner)
        if (problem) throw badRequest(problem)
        return { source: 'referral', referrer: owner, referral, code: typed, typed: true }
      }
    }
    // A teacher is already in play, so a coupon cannot be added (the teacher always wins).
    if (savedTeacher) {
      return { source: 'teacher', teacher: savedTeacher, code: savedTeacher.code, notice: 'A teacher discount is already applied, so a coupon cannot be added.' }
    }
    // Not a teacher or friend code: it has to be a coupon (pricing.js validates it and explains any problem).
    return { source: 'coupon', code: typed, typed: true }
  }

  if (savedTeacher) return { source: 'teacher', teacher: savedTeacher, code: savedTeacher.code }

  if (referralsOn) {
    const attached = await attachedReferral(user)
    if (attached) return { source: 'referral', referral: attached, code: attached.code }
    // A /?ref= link saved before sign-up: used silently when it is valid for this user.
    if (attribution.refCode) {
      const owner = await findReferrerByCode(attribution.refCode)
      if (owner) {
        const { problem, referral } = await referralEligibility(user, owner)
        if (!problem) return { source: 'referral', referrer: owner, referral, code: owner.referralCode }
      }
    }
  }
  return { source: 'none' }
}
