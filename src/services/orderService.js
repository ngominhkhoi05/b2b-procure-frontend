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
 * Fetch a single order by id.
 *
 * Backend endpoint:
 *   GET /api/v1/orders/{id}
 *
 * Returns 404 when the authenticated user cannot access the order
 * (existence-hiding — the response body does not leak whether the order
 * exists at all).
 *
 * @param {number|string} id
 * @returns {Promise<OrderDetailResponse>}
 */
export async function getOrderById(id) {
  const response = await api.get(`/orders/${id}`)
  return response.data.data
}

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
