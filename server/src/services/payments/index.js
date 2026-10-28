import { env } from '../../config/env.js'
import { createMockProvider } from './mock.js'
import { createRazorpayProvider } from './razorpay.js'

let provider

// Single seam for the gateway. Tests may swap it with setProvider().
export function getProvider() {
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
