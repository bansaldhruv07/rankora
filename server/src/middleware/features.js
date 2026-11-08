import { growth } from '../config/growth.js'
import { notFound } from '../utils/AppError.js'

const FLAGS = { referrals: () => growth.referralsEnabled, teachers: () => growth.teachersEnabled }

export const featureEnabled = (name) => Boolean(FLAGS[name]?.())

// A disabled feature answers like a route that does not exist.
export const requireFeature = (name) => (_req, _res, next) => (featureEnabled(name) ? next() : next(notFound()))
