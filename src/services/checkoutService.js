/**
 * Checkout service — Buyer checkout flow.
 *
 * All endpoints are BUYER-only (`@PreAuthorize("hasRole('BUYER')")` at the
 * controller level). The frontend never assumes ownership of the order,
 * the supplier, or the buyer company — the backend derives those from
 * the authenticated principal and the cart items being checked out.
 *
 * The backend runs the whole `POST /checkout` flow inside a single
 * `@Transactional(rollbackFor = Exception.class)` boundary:
 *   - acquire pessimistic write locks on products
 *   - validate stock
 *   - reserve stock (bump `reservedQuantity`)
 *   - compute tier pricing
 *   - create Order (`PENDING_CONFIRMATION`) + status history + OrderItems
 *     (snapshot productName, unitPrice, quantity, subtotal)
 *   - create Payment (`PENDING`, `expiredAt` set only for non-COD)
 *   - delete selected CartItems
 *
 * The frontend MUST NOT recreate any of this logic.
 */

import { api } from './api'

/**
 * Execute checkout for one supplier's items.
 *
 * Backend endpoint:
 *   POST /api/v1/checkout
 *
 * @param {{ cartItemIds: number[], paymentMethod: 'COD' | 'ZALOPAY' }} payload
 * @returns {Promise<CheckoutResponse>}
 */
export async function checkout({ cartItemIds, paymentMethod }) {
  const response = await api.post('/checkout', {
    cartItemIds,
    paymentMethod,
  })
  return response.data.data
}

/**
 * Fetch the latest state of an order (items + history + payment summary).
 *
 * Used by the checkout result page to display the post-redirect payment
 * status. Backend endpoint:
 *   GET /api/v1/orders/{orderId}
 *
 * @param {number|string} orderId
 * @returns {Promise<OrderDetailResponse>}
 */
export async function getOrderById(orderId) {
  const response = await api.get(`/orders/${orderId}`)
  return response.data.data
}

/**
 * @typedef {Object} CheckoutRequest
 * @property {number[]} cartItemIds  — required, non-empty, must belong to one cart / one supplier
 * @property {'COD'|'ZALOPAY'} paymentMethod  — required (backend rejects MOMO)
 */

/**
 * @typedef {Object} CheckoutResponse
 * @property {number}      orderId
 * @property {string}      orderCode             — e.g. "ORD-1726900000000-A1B2C3"
 * @property {'COD'|'ZALOPAY'} paymentMethod
 * @property {'PENDING'|'SUCCESS'|'FAILED'|'EXPIRED'|'REFUND_PENDING'|'REFUNDED'} paymentStatus
 * @property {'PENDING_CONFIRMATION'|'PAID'|'CONFIRMED'|'PREPARING'|'SHIPPING'|'COMPLETED'|'REJECTED'|'CANCELLED'} orderStatus
 * @property {string|number|null} subtotal      — BigDecimal as string
 * @property {string|number|null} totalAmount   — BigDecimal as string
 * @property {number}      paymentId
 * @property {string}      paymentCode
 * @property {string|null} paymentExpiredAt     — ISO datetime; null for COD
 * @property {string|null} paymentUrl           — always null here; use POST /checkout/zalopay/create-payment for ZaloPay URL
 * @property {string|null} createdAt            — ISO datetime
 */

/**
 * @typedef {Object} OrderDetailResponse
 * @property {number}                       id
 * @property {string}                       orderCode
 * @property {number}                       buyerCompanyId
 * @property {number}                       supplierCompanyId
 * @property {number}                       createdBy
 * @property {string}                       status
 * @property {string|number|null}           subtotal
 * @property {string|number|null}           commissionRate
 * @property {string|number|null}           commissionAmount
 * @property {string|number|null}           totalAmount
 * @property {string|null}                  shippingCompanyName
 * @property {string|null}                  shippingPhone
 * @property {string|null}                  shippingAddress
 * @property {string|null}                  createdAt
 * @property {string|null}                  updatedAt
 * @property {OrderItemResponse[]}          items
 * @property {OrderStatusHistoryResponse[]} statusHistory
 * @property {PaymentSummaryResponse|null}  payment
 * @property {string|null}                  buyerCompanyName
 * @property {string|null}                  supplierCompanyName
 */

/**
 * @typedef {Object} OrderItemResponse
 * @property {number}               id
 * @property {number}               productId
 * @property {string}               productName
 * @property {string|null}          productImageUrl
 * @property {number}               quantity
 * @property {string|number}        unitPrice
 * @property {string|number}        subtotal
 */

/**
 * @typedef {Object} OrderStatusHistoryResponse
 * @property {number}        id
 * @property {string}        status
 * @property {number|null}   changedBy
 * @property {string|null}   note
 * @property {string|null}   createdAt
 */

/**
 * @typedef {Object} PaymentSummaryResponse
 * @property {string}                paymentMethod
 * @property {string}                paymentStatus
 * @property {string|number}         amount
 * @property {string|null}           paidAt
 */
