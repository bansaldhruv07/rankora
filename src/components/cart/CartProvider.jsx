import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartContext } from '../../hooks/useCart'

const KEY = 'jeedge.cart'
const LEGACY_KEY = 'rankora.cart' // saved carts from before the rename are picked up once, then moved to KEY
export const MAX_CART_ITEMS = 20

// The cart is only a list of note slugs kept in this browser. Prices, ownership and discounts are all worked out by the
// server (POST /api/cart/quote and POST /api/orders), so a tampered list can never change what is charged.
function read() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY))
    if (!Array.isArray(raw)) return []
    return [...new Set(raw.filter((slug) => typeof slug === 'string' && /^[a-z0-9-]{1,80}$/.test(slug)))].slice(0, MAX_CART_ITEMS)
  } catch {
    return []
  }
}

export default function CartProvider({ children }) {
  const [slugs, setSlugs] = useState(read)

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(slugs))
      window.localStorage.removeItem(LEGACY_KEY)
    } catch {
      // Private windows can refuse storage; the cart then lasts for this visit only.
    }
  }, [slugs])

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === KEY) setSlugs(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((slug) => {
    let added = true
    setSlugs((current) => {
      if (current.includes(slug)) return current
      if (current.length >= MAX_CART_ITEMS) {
        added = false
        return current
      }
      return [...current, slug]
    })
    return added
  }, [])

  const remove = useCallback((...gone) => setSlugs((current) => current.filter((slug) => !gone.includes(slug))), [])
  const clear = useCallback(() => setSlugs([]), [])

  const value = useMemo(() => ({ slugs, count: slugs.length, has: (slug) => slugs.includes(slug), add, remove, clear }), [slugs, add, remove, clear])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
