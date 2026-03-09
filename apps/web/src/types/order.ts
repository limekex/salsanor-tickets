/**
 * Order and payment-related types
 */

/**
 * Order status
 */
export type OrderStatus = 
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'REFUNDED'
  | 'CANCELLED'

/**
 * Payment status
 */
export type PaymentStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'

/**
 * Payment provider
 */
export type PaymentProvider = 
  | 'STRIPE'
  | 'VIPPS'
  | 'INVOICE'
  | 'MANUAL'

/**
 * Core order data
 */
export interface Order {
  id: string
  orderNumber: string | null
  userId: string
  organizerId: string
  periodId: string | null
  subtotalCents: number
  discountCents: number
  totalCents: number
  mvaCents: number
  mvaRate: number
  status: OrderStatus
  pricingSnapshot: any // JSON
  createdAt: Date
  updatedAt: Date
}

/**
 * Order with line items
 */
export interface OrderWithItems extends Order {
  Registration: Array<{
    id: string
    trackId: string
    chosenRole: string
    status: string
  }>
  EventRegistration: Array<{
    id: string
    eventId: string
    quantity: number
    status: string
  }>
}

/**
 * Payment data
 */
export interface Payment {
  id: string
  orderId: string
  provider: PaymentProvider
  providerPaymentId: string | null
  amount: number
  currency: string
  status: PaymentStatus
  metadata: any // JSON
  createdAt: Date
  updatedAt: Date
}

/**
 * Order with payments
 */
export interface OrderWithPayments extends OrderWithItems {
  Payment: Payment[]
}

/**
 * Cart item types
 */
export type CartItemType = 'course' | 'event' | 'membership'

/**
 * Course cart item
 */
export interface CourseCartItem {
  type: 'course'
  trackId: string
  periodId: string
  role: 'LEADER' | 'FOLLOWER' | 'ANY'
  hasPartner: boolean
  partnerEmail?: string
  trackTitle: string
  periodName: string
  organizerId: string
  organizerName: string
  pricePerItem: number // in cents
  selectedSlots?: number[] // For PRIVATE template: slot indices
  selectedWeeks?: number[] // For PRIVATE template: week indices (per-week booking)
}

/**
 * Event cart item
 */
export interface EventCartItem {
  type: 'event'
  eventId: string
  eventTitle: string
  quantity: number
  organizerId: string
  organizerName: string
  pricePerTicket: number // in cents
}

/**
 * Membership cart item
 */
export interface MembershipCartItem {
  type: 'membership'
  tierId: string
  tierName: string
  organizerId: string
  organizerName: string
  priceCents: number
}

/**
 * Union type for all cart items
 */
export type CartItem = CourseCartItem | EventCartItem | MembershipCartItem

/**
 * Pricing breakdown
 */
export interface PricingBreakdown {
  subtotalCents: number
  discountCents: number
  mvaCents: number
  totalCents: number
  appliedRules: Array<{
    ruleId: string
    name: string
    amountCents: number
  }>
}
