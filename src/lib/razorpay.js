const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let pending

// Loads Razorpay's hosted checkout script on demand (only when a real gateway is configured).
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  pending ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => {
      pending = undefined
      reject(new Error('Could not load the payment window. Check your connection and try again.'))
    }
    document.head.appendChild(script)
  })
  return pending
}
