/**
 * Cart service — buyer cart API calls.
 *
 * Reuses the shared `api` instance. Backend restricts all cart endpoints
 * to BUYER role only.
 */

import { api } from './api'

/**
 * Fetch the current buyer's cart with dynamic price-tier calculations.
 *
 * Backend endpoint:
 *   GET /api/v1/cart
 *
 * @returns {Promise<CartResponse>}
 */
export async function getCart() {
  const response = await api.get('/cart')
  return response.data.data
}

/**
 * @typedef {Object} CartResponse
 * @property {number}              cartId
 * @property {CartItemResponse[]}  items
 * @property {string|number|null}  totalAmount     BigDecimal as string
 * @property {number}              totalItems
 */

/**
 * @typedef {Object} CartItemResponse
 * @property {number}              id
 * @property {number}              productId
 * @property {string}              sku
 * @property {string}              productName
 * @property {string|null}         productImageUrl
 * @property {number}              supplierCompanyId
 * @property {string}              supplierCompanyName
 * @property {number}              quantity
 * @property {string|number|null}  unitPrice       BigDecimal as string
 * @property {string|number|null}  subtotal        BigDecimal as string
 * @property {string}              productStatus
 * @property {string}              categoryStatus
 * @property {number}              stockQuantity
 * @property {number}              availableQuantity
 * @property {boolean}             available
 */
