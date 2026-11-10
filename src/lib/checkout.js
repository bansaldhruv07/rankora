import { api } from './api'
import { loadRazorpay } from './razorpay'

// Creates an order from `body` ({ product } or { items }, plus an optional coupon), takes the payment, and has the server
// verify it. Prices are decided by the server when the order is created, so nothing sent here can change what is charged.
// `onCheckout` runs once the order exists, with the gateway details (so the caller can tell sandbox from real payments).
export async function payOrder(body, title, { onCheckout } = {}) {
  const { order, checkout } = (await api('/orders', { method: 'POST', body })).data
  onCheckout?.(checkout)
  const proof =
    checkout.provider === 'mock'
      ? (await api('/payments/mock/complete', { method: 'POST', body: { orderId: order.id } })).data
      : await loadRazorpay().then((Razorpay) => openRazorpay(Razorpay, checkout, title))
  await api('/payments/verify', { method: 'POST', body: { orderId: order.id, ...proof } })
  return order
}

function openRazorpay(Razorpay, checkout, title) {
  return new Promise((resolve, reject) => {
    const instance = new Razorpay({
      key: checkout.key,
      amount: checkout.amountPaise,
      currency: checkout.currency,
      order_id: checkout.providerOrderId,
      name: 'JEEdge',
      description: title,
      prefill: checkout.prefill,
      theme: { color: '#c2571a' },
      handler: (response) =>
        resolve({ razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }),
      modal: { ondismiss: () => reject(Object.assign(new Error('Payment cancelled'), { code: 'DISMISSED' })) },
    })
    instance.on('payment.failed', (response) =>
      reject(new Error(response.error?.description || 'Payment failed. You have not been charged.')),
    )
    instance.open()
  })
}
