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
 *   GET /api/v1/orders/{orderId}
 *
 * Used by the Phase 6 checkout result page to read the latest payment
 * status after a ZaloPay redirect. Backend translates access-denied to
 * 404 to avoid leaking order existence.
 *
 * @param {number|string} orderId
 * @returns {Promise<OrderDetailResponse>}
 */
export async function getOrderById(orderId) {
  const response = await api.get(`/orders/${orderId}`)
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
