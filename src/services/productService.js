/**
 * Product service — shared product & price-tier API calls.
 *
 * Backend endpoints:
 *   POST   /api/v1/products                              (ADMIN, SUPPLIER)
 *   GET    /api/v1/products                              (all authenticated, role-scoped)
 *   GET    /api/v1/products/{id}                         (all authenticated, role-scoped)
 *   PUT    /api/v1/products/{id}                         (ADMIN, SUPPLIER owner)
 *   PATCH  /api/v1/products/{id}/status                  (ADMIN, SUPPLIER owner)
 *   GET    /api/v1/products/{productId}/prices           (all authenticated)
 *   POST   /api/v1/products/{productId}/prices           (ADMIN, SUPPLIER owner)
 *   PUT    /api/v1/products/{productId}/prices/{priceId} (ADMIN, SUPPLIER owner)
 *   DELETE /api/v1/products/{productId}/prices/{priceId} (ADMIN, SUPPLIER owner)
 *
 * Role enforcement:
 *   - BUYER  → read-only; backend forces status=ACTIVE, categoryStatus=ACTIVE, requireHasPrices=true.
 *   - SUPPLIER → backend forces supplierCompanyId = currentUser.company.id; create/edit restricted to own products.
 *   - ADMIN  → full access; must supply supplierCompanyId when creating.
 *
 * The frontend NEVER overrides ownership by sending another supplierCompanyId for SUPPLIER.
 */

import { api } from './api'

/**
 * Fetch a paginated list of products visible to the current user.
 *
 * @param {{
 *   keyword?: string,
 *   categoryId?: number,
 *   supplierCompanyId?: number,
 *   status?: string,
 *   page?: number,
 *   size?: number,
 *   sort?: string,
 * }} [params]
 * @returns {Promise<PageResponse<ProductResponse>>}
 */
export async function listProducts(params = {}) {
  const {
    keyword,
    categoryId,
    supplierCompanyId,
    status,
    page = 0,
    size = 20,
    sort = 'id,asc',
  } = params

  const queryParams = { page, size, sort }
  if (keyword) queryParams.keyword = keyword
  if (categoryId != null) queryParams.categoryId = categoryId
  if (supplierCompanyId != null) queryParams.supplierCompanyId = supplierCompanyId
  if (status) queryParams.status = status

  const response = await api.get('/products', { params: queryParams })
  return response.data.data
}

/**
 * Fetch a single product by id.
 *
 * @param {number|string} id
 * @returns {Promise<ProductResponse>}
 */
export async function getProductById(id) {
  const response = await api.get(`/products/${id}`)
  return response.data.data
}

/**
 * Create a new product.
 *
 * The caller is responsible for sending `supplierCompanyId` ONLY when the
 * current user is ADMIN. For SUPPLIER, the backend derives the supplier
 * company from the current user; sending `supplierCompanyId` in that case
 * is ignored / potentially rejected. This helper just forwards the body as-is.
 *
 * @param {CreateProductRequest} body
 * @returns {Promise<ProductResponse>}
 */
export async function createProduct(body) {
  const response = await api.post('/products', body)
  return response.data.data
}

/**
 * Update a product.
 *
 * @param {number|string} id
 * @param {UpdateProductRequest} body
 * @returns {Promise<ProductResponse>}
 */
export async function updateProduct(id, body) {
  const response = await api.put(`/products/${id}`, body)
  return response.data.data
}

/**
 * Update a product's status. Backend accepts "ACTIVE" or "INACTIVE".
 *
 * @param {number|string} id
 * @param {'ACTIVE'|'INACTIVE'} status
 * @returns {Promise<ProductResponse>}
 */
export async function updateProductStatus(id, status) {
  const response = await api.patch(`/products/${id}/status`, { status })
  return response.data.data
}

/**
 * List price tiers for a product.
 *
 * BUYER is restricted by the backend to ACTIVE products with ACTIVE category.
 * Returns a plain array (NOT a Page).
 *
 * @param {number|string} productId
 * @returns {Promise<ProductPriceResponse[]>}
 */
export async function listProductPrices(productId) {
  const response = await api.get(`/products/${productId}/prices`)
  return response.data.data || []
}

/**
 * Create a new price tier for a product.
 *
 * @param {number|string} productId
 * @param {CreateProductPriceRequest} body
 * @returns {Promise<ProductPriceResponse>}
 */
export async function createProductPrice(productId, body) {
  const response = await api.post(`/products/${productId}/prices`, body)
  return response.data.data
}

/**
 * Update an existing price tier.
 *
 * @param {number|string} productId
 * @param {number|string} priceId
 * @param {UpdateProductPriceRequest} body
 * @returns {Promise<ProductPriceResponse>}
 */
export async function updateProductPrice(productId, priceId, body) {
  const response = await api.put(`/products/${productId}/prices/${priceId}`, body)
  return response.data.data
}

/**
 * Delete a price tier.
 *
 * @param {number|string} productId
 * @param {number|string} priceId
 * @returns {Promise<void>}
 */
export async function deleteProductPrice(productId, priceId) {
  await api.delete(`/products/${productId}/prices/${priceId}`)
}

/**
 * @typedef {Object} ProductResponse
 * @property {number} id
 * @property {number} supplierCompanyId
 * @property {string} supplierCompanyName
 * @property {string} sku
 * @property {string} name
 * @property {string|null} description
 * @property {string|null} imageUrl
 * @property {number|null} stockQuantity
 * @property {number|null} reservedQuantity
 * @property {number|null} availableQuantity
 * @property {string} status                — "ACTIVE" or "INACTIVE"
 * @property {number} categoryId
 * @property {string} categoryName
 * @property {string|null} createdAt
 * @property {string|null} updatedAt
 */

/**
 * @typedef {Object} ProductPriceResponse
 * @property {number} id
 * @property {number} productId
 * @property {number} minQuantity
 * @property {number|null} maxQuantity      — null means unlimited (∞)
 * @property {string|number} unitPrice      — BigDecimal serialised as string
 * @property {string|null} createdAt
 * @property {string|null} updatedAt
 */

/**
 * @typedef {Object} CreateProductRequest
 * @property {number} [supplierCompanyId]   — required only when ADMIN
 * @property {number} categoryId
 * @property {string} sku
 * @property {string} name
 * @property {string} [description]
 * @property {string} [imageUrl]
 * @property {number} [stockQuantity]
 */

/**
 * @typedef {Object} UpdateProductRequest
 * @property {number} [categoryId]
 * @property {string} [sku]
 * @property {string} name
 * @property {string} [description]
 * @property {string} [imageUrl]
 * @property {number} [stockQuantity]
 */

/**
 * @typedef {Object} CreateProductPriceRequest
 * @property {number} minQuantity
 * @property {number|null} [maxQuantity]    — null/undefined = unlimited
 * @property {string|number} unitPrice
 */

/**
 * @typedef {Object} UpdateProductPriceRequest
 * @property {number} minQuantity
 * @property {number|null} [maxQuantity]
 * @property {string|number} unitPrice
 */

/**
 * @typedef {Object} PageResponse
 * @property {ProductResponse[]} content
 * @property {number}             pageNo
 * @property {number}             pageSize
 * @property {number}             totalElements
 * @property {number}             totalPages
 * @property {boolean}            last
 * @property {boolean}            first
 */
