import { Check, ShoppingBag } from 'lucide-react'
import Button from '../ui/Button'
import { useCart } from '../../hooks/useCart'
import { useToast } from '../../hooks/useToast'
import { ROUTES } from '../../utils/routes'

// Adds a note to the cart, or (once it is there) goes to the cart.
export default function AddToCartButton({ slug, variant = 'outline', size = 'md', className, label = 'Add to cart' }) {
  const cart = useCart()
  const toast = useToast()
  const inCart = cart.has(slug)

  if (inCart) {
    return (
      <Button to={ROUTES.cart} variant={variant} size={size} icon={Check} className={className}>
        In cart · view
      </Button>
    )
  }
  return (
    <Button
      variant={variant}
      size={size}
      icon={ShoppingBag}
      className={className}
      onClick={() => {
        if (cart.add(slug)) toast({ title: 'Added to your cart' })
        else toast({ title: 'Your cart is full', description: 'Check out first, then add more notes.', tone: 'info' })
      }}
    >
      {label}
    </Button>
  )
}
