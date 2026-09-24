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
 * @typedef {Object} PageResponse
 * @property {OrderResponse[]} content
 * @property {number}          pageNo
 * @property {number}          pageSize
 * @property {number}          totalElements
 * @property {number}          totalPages
 * @property {boolean}         last
 * @property {boolean}         first
 */
