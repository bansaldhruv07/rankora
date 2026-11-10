import { Router } from 'express'
import { requireStaff } from '../../middleware/auth.js'
import authRoutes from './auth.js'
import couponRoutes from './coupons.js'
import growthRoutes from './growth.js'
import insightRoutes from './insights.js'
import orderRoutes from './orders.js'
import productRoutes from './products.js'
import referralGiftRoutes from './referralGifts.js'
import supportRoutes from './support.js'
import userRoutes from './users.js'

// Everything under /api/admin except sign-in requires a valid staff session AND a specific permission
// (declared per router in middleware/auth.js PERMISSIONS). The frontend only hides links; this enforces.
const router = Router()
router.use('/auth', authRoutes)
router.use(requireStaff)
router.use('/products', productRoutes)
router.use('/coupons', couponRoutes)
router.use('/growth', growthRoutes)
router.use('/referral-gifts', referralGiftRoutes)
router.use('/orders', orderRoutes)
router.use('/users', userRoutes)
router.use('/support', supportRoutes)
router.use('/', insightRoutes)

export default router
