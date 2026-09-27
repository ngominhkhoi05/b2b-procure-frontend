/**
 * Order service — shared order API calls (BUYER, SUPPLIER, ADMIN).
 *
 * Reuses the shared `api` instance.
 *
 * Visibility is enforced at the SQL layer based on the currently
 * authenticated principal — the client NEVER sends a buyer / supplier
 * company id to override it.
 */

import { api } from './api'

/**
 * Fetch a paginated list of orders visible to the current user.
 *
 * Backend endpoint:
 *   GET /api/v1/orders
 *
 * @param {{
 *   status?: string,
 *   paymentMethod?: string,
 *   paymentStatus?: string,
 *   page?: number,
 *   size?: number,
 *   sort?: string,
 * }} [params]
 * @returns {Promise<PageResponse<OrderResponse>>}
 */
export async function listOrders(params = {}) {
  const {
    status,
    paymentMethod,
    paymentStatus,
    page = 0,
    size = 20,
    sort = 'createdAt,desc',
  } = params

  const queryParams = { page, size, sort }
  if (status) queryParams.status = status
  if (paymentMethod) queryParams.paymentMethod = paymentMethod
  if (paymentStatus) queryParams.paymentStatus = paymentStatus

  const response = await api.get('/orders', { params: queryParams })
  return response.data.data
}

/**
 * Fetch a single order by id, including items + status history + payment summary.
 *
 * Backend endpoint:
 *   GET /api/v1/orders/{id}
 *
 * Used by the Phase 6 checkout result page to read the latest payment
 * status after a ZaloPay redirect, and by the Phase 7 order detail view.
 * Backend translates access-denied to 404 to avoid leaking order existence.
 *
 * @param {number|string} id
 * @returns {Promise<OrderDetailResponse>}
 */
export async function getOrderById(id) {
  const response = await api.get(`/orders/${id}`)
  return response.data.data
}

/**
 * @typedef {Object} OrderResponse
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
 * @property {string|null}                  paymentMethod
 * @property {string|null}                  paymentStatus
 */

/**
 * Fetch the status-change history for a given order.
 *
 * Backend endpoint:
 *   GET /api/v1/orders/{id}/history
 *
 * Returns an empty array when the history is unavailable or the call fails.
 * This method is non-critical — the detail view should still render even if
 * the history call fails.
 *
 * @param {number|string} id
 * @returns {Promise<OrderStatusHistoryResponse[]>}
 */
export async function getOrderHistory(id) {
  const response = await api.get(`/orders/${id}/history`)
  return response.data.data || []
}

/**
 * Request cancellation of an order.
 *
 * Backend endpoint:
 *   POST /api/v1/orders/{id}/cancel
 *
 * Backend allows cancellation only when order status is PENDING_CONFIRMATION
 * or PAID. The reason field is required on the frontend (1–500 characters).
 *
 * @param {number|string} id
 * @param {{ reason: string }} body  — cancellation reason, 1–500 chars
 * @returns {Promise<OrderResponse>}
 */
export async function cancelOrder(id, body) {
  const response = await api.post(`/orders/${id}/cancel`, body)
  return response.data.data
}

// ─── Supplier lifecycle actions ────────────────────────────────────────────────

/**
 * Supplier confirms an order, moving it from PENDING_CONFIRMATION → CONFIRMED.
 *
 * Backend endpoint:
 *   POST /api/v1/supplier/orders/{orderId}/confirm
 *
 * Backend allows confirmation when the current status is PENDING_CONFIRMATION.
 * For COD orders the status becomes CONFIRMED immediately; for online-paid
 * orders the status remains PAID until the payment webhook fires.
 *
 * @param {number|string} id
 * @returns {Promise<OrderResponse>}
 */
export async function confirmSupplierOrder(id) {
  const response = await api.post(`/supplier/orders/${id}/confirm`)
  return response.data.data
}

/**
 * Supplier rejects an order, optionally triggering a refund.
 *
 * Backend endpoint:
 *   POST /api/v1/supplier/orders/{orderId}/reject
 *
 * Backend allows supplier rejection when the current status is
 * PENDING_CONFIRMATION, PAID, or CONFIRMED. The reason field is
 * MANDATORY and is validated by the backend with `@NotBlank @Size(max=500)`.
 * For online-paid orders the backend moves the linked Payment to
 * REFUND_PENDING; the supplier does NOT need to call any refund API.
 *
 * @param {number|string} id
 * @param {{ reason: string }} body  — rejection reason (1–500 chars, non-blank)
 * @returns {Promise<OrderResponse>}
 */
export async function rejectSupplierOrder(id, body) {
  const response = await api.post(`/supplier/orders/${id}/reject`, body)
  return response.data.data
}

/**
 * Supplier marks an order as being prepared, moving it CONFIRMED → PREPARING.
 *
 * Backend endpoint:
 *   PATCH /api/v1/supplier/orders/{orderId}/preparing
 *
 * Backend allows this transition only when the current status is CONFIRMED.
 *
 * @param {number|string} id
 * @returns {Promise<OrderResponse>}
 */
export async function markOrderPreparing(id) {
  const response = await api.patch(`/supplier/orders/${id}/preparing`)
  return response.data.data
}

/**
 * Supplier marks an order as shipped, moving it PREPARING → SHIPPING.
 *
 * Backend endpoint:
 *   PATCH /api/v1/supplier/orders/{orderId}/shipping
 *
 * Backend allows this transition only when the current status is PREPARING.
 *
 * @param {number|string} id
 * @returns {Promise<OrderResponse>}
 */
export async function markOrderShipping(id) {
  const response = await api.patch(`/supplier/orders/${id}/shipping`)
  return response.data.data
}

/**
 * Supplier marks an order as completed, moving it SHIPPING → COMPLETED.
 *
 * Backend endpoint:
 *   PATCH /api/v1/supplier/orders/{orderId}/complete
 *
 * Backend allows this transition only when the current status is SHIPPING.
 *
 * @param {number|string} id
 * @returns {Promise<OrderResponse>}
 */
export async function completeSupplierOrder(id) {
  const response = await api.patch(`/supplier/orders/${id}/complete`)
  return response.data.data
}

/**
 * @typedef {Object} PageResponse
 * @property {OrderResponse[]} content
 * @property {number}          pageNo
 * @property {number}          pageSize
 * @property {number}          totalElements
 * @property {number}          totalPages
 * @property {boolean}         last
 * @property {boolean}         first
 */

/**
 * @typedef {Object} OrderDetailResponse
 * @extends OrderResponse
 * @property {OrderItemResponse[]}        items
 * @property {OrderStatusHistoryResponse[]} statusHistory
 * @property {PaymentSummaryResponse|null} payment
 * @property {string|null}                buyerCompanyName
 * @property {string|null}                supplierCompanyName
 */

/**
 * Snapshot of an ordered product at the time the order was placed.
 *
 * @typedef {Object} OrderItemResponse
 * @property {number}         id
 * @property {number}         productId
 * @property {string}        productName
 * @property {string|null}    productImageUrl
 * @property {number}         quantity
 * @property {string|number}  unitPrice
 * @property {string|number}  subtotal
 */

/**
 * A single entry in the order status-change timeline.
 *
 * @typedef {Object} OrderStatusHistoryResponse
 * @property {number}        id
 * @property {number}        orderId
 * @property {number|null}   changedBy   User ID — no display name exposed by backend
 * @property {string}       status
 * @property {string|null}  note
 * @property {string|null}  createdAt   ISO-8601 string
 */

/**
 * Payment summary embedded inside OrderDetailResponse.
 *
 * @typedef {Object} PaymentSummaryResponse
 * @property {string|null}  paymentMethod
 * @property {string|null}  paymentStatus
 * @property {string|number|null} amount
 * @property {string|null}  paidAt   ISO-8601 string — not exposed for unpaid orders
 */
