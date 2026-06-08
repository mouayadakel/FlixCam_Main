/**
 * Checkout page – redirects to cart with expandCheckout=1 (checkout steps now live on cart page).
 */

import { redirect } from 'next/navigation'

export default function CheckoutPage() {
  redirect('/cart?expandCheckout=1')
}
