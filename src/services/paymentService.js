/**
 * Payment service — ZaloPay side of the checkout flow.
 *
 * The frontend NEVER constructs ZaloPay URLs or signs payloads. It only
 * triggers the backend step that talks to ZaloPay, and then navigates
 * to whatever `paymentUrl` the backend returns.
 *
 * Lifecycle:
 *   1. POST /checkout                 → creates Order + Payment (PENDING)
 *   2. POST /checkout/zalopay/create-payment → calls ZaloPay, returns paymentUrl
 *   3. browser navigates to paymentUrl
 *   4. ZaloPay posts server-to-server to POST /payments/zalopay/callback
 *      (NO JWT; MAC-protected; frontend MUST NOT call this).
 *   5. Buyer eventually returns to /checkout/result which calls
 *      GET /orders/{orderId} (via orderService) to read the latest
 *      paymentStatus — we never trust the browser-side URL query string
 *      to fake success.
 */

import { api } from './api'

/**
 * Initiate a ZaloPay payment for an existing order.
 *
 * Backend endpoint:
 *   POST /api/v1/checkout/zalopay/create-payment
 *
 * Backend validates ownership, calls ZaloPay `create-order`, stores
 * `app_trans_id` + `provider_transaction_id` on the Payment row, and
 * returns the ZaloPay-hosted `order_url` for the buyer to navigate to.
 *
 * @param {{ paymentId: number, orderId: number }} payload
 * @returns {Promise<ZaloPayCreatePaymentResponse>}
 */
export async function createZaloPayPayment({ paymentId, orderId }) {
  const response = await api.post('/checkout/zalopay/create-payment', {
    paymentId,
    orderId,
  })
  return response.data.data
}

/**
 * Re-initiate ZaloPay payment from the Order Detail page.
 *
 * Backend endpoint:
 *   POST /api/v1/orders/{orderId}/payments/zalopay/retry
 *
 * Used when a buyer closes the ZaloPay tab by accident and wants to resume
 * payment for an order whose status is still PENDING. The backend looks up
 * the latest PENDING ZaloPay Payment for the order and delegates to the
 * same idempotent `ZaloPayService.initiatePayment` used by checkout, so a
 * second call returns the existing ZaloPay URL instead of creating a new
 * order on ZaloPay.
 *
 * @param {number} orderId
 * @returns {Promise<ZaloPayCreatePaymentResponse>}
 */
export async function retryOrderZaloPay(orderId) {
  const response = await api.post(`/orders/${orderId}/payments/zalopay/retry`)
  return response.data.data
}

/**
 * @typedef {Object} ZaloPayCreatePaymentRequest
 * @property {number} paymentId
 * @property {number} orderId
 */

/**
 * @typedef {Object} ZaloPayCreatePaymentResponse
 * @property {number}      paymentId
 * @property {string}      paymentUrl   — ZaloPay-hosted URL the buyer must be sent to
 * @property {string}      orderCode
 */
