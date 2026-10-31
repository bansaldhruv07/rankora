import { env } from '../../config/env.js'
import { AppError } from '../../utils/AppError.js'
import { createMockProvider } from './mock.js'
import { createRazorpayProvider } from './razorpay.js'

let provider

// Single seam for the gateway. Tests may swap it with setProvider().
export function getProvider() {
  if (env.paymentProvider === 'disabled') {
    throw new AppError(503, 'PAYMENTS_UNAVAILABLE', 'Payments are not open yet. Please check back soon.')
  }
  if (!provider) {
    provider =
      env.paymentProvider === 'razorpay'
        ? createRazorpayProvider(env.razorpay)
        : createMockProvider(env.mockPaymentSecret)
  }
  return provider
}

export const setProvider = (next) => {
  provider = next
}
