/**
 * Cart service — buyer cart API calls.
 *
 * Reuses the shared `api` instance. Backend restricts all cart endpoints
 * to BUYER role only (`@PreAuthorize("hasRole('BUYER')")` at the controller
 * level, plus `SecurityUtil.isBuyer()` inside the service).
 *
 * Cart operations do NOT reserve stock. Add / Update only check
 * `availableQuantity >= quantity`. Checkout reserves inventory.
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
 * Add a product to the current buyer's cart.
 *
 * Backend behaviour:
 *   - HTTP 201 on success.
 *   - If the product is already in the cart, the quantity is INCREMENTED
 *     (existing.quantity + request.quantity) — both branches enforce
 *     `quantity <= availableQuantity`.
 *   - Returns the single CartItemResponse with recomputed unitPrice and
 *     subtotal.
 *
 * Backend endpoint:
 *   POST /api/v1/cart/items
 *
 * @param {{ productId: number, quantity: number }} payload
 * @returns {Promise<CartItemResponse>}
 */
export async function addToCart({ productId, quantity }) {
  const response = await api.post('/cart/items', {
    productId,
    quantity,
  })
  return response.data.data
}

/**
 * Update an existing cart item's quantity (absolute replacement — not
 * additive).
 *
 * Backend endpoint:
 *   PUT /api/v1/cart/items/{productId}
 *
 * @param {number|string} productId
 * @param {number} quantity — must be >= 1 (backend @Min(1)).
 * @returns {Promise<CartItemResponse>}
 */
export async function updateCartItem(productId, quantity) {
  const response = await api.put(`/cart/items/${productId}`, {
    quantity,
  })
  return response.data.data
}

/**
 * Remove a single product from the cart.
 *
 * Backend endpoint:
 *   DELETE /api/v1/cart/items/{productId}
 *
 * @param {number|string} productId
 * @returns {Promise<void>}
 */
export async function removeCartItem(productId) {
  await api.delete(`/cart/items/${productId}`)
}

/**
 * Hard-clear every item from the current buyer's cart.
 *
 * The cart row itself is preserved; only the items are removed.
 *
 * Backend endpoint:
 *   DELETE /api/v1/cart
 *
 * @returns {Promise<void>}
 */
export async function clearCart() {
  await api.delete('/cart')
}

/**
 * @typedef {Object} AddToCartRequest
 * @property {number} productId   — required
 * @property {number} quantity    — required, >= 1
 */

/**
 * @typedef {Object} UpdateCartItemRequest
 * @property {number} quantity    — required, >= 1
 */

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
