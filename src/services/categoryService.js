/**
 * Category service — shared category API calls.
 *
 * Backend endpoints:
 *   GET    /api/v1/categories             (public read for all authenticated roles;
 *                                          Buyer/Supplier only see ACTIVE)
 *   GET    /api/v1/categories/{id}        (same visibility rules as GET list)
 *   POST   /api/v1/admin/categories       (ADMIN)
 *   PUT    /api/v1/admin/categories/{id}  (ADMIN)
 *   PATCH  /api/v1/admin/categories/{id}/status (ADMIN)
 *   DELETE /api/v1/admin/categories/{id}  (ADMIN)
 *
 * Visibility / authorization is enforced server-side. The frontend never
 * sends the user's role to override ownership.
 */

import { api } from './api'

/**
 * Fetch a paginated list of categories.
 *
 * For BUYER / SUPPLIER, the backend returns only ACTIVE categories.
 * For ADMIN, status and keyword filters are honoured.
 *
 * @param {{
 *   status?: string,
 *   keyword?: string,
 *   page?: number,
 *   size?: number,
 *   sort?: string,
 * }} [params]
 * @returns {Promise<PageResponse<CategoryResponse>>}
 */
export async function listCategories(params = {}) {
  const {
    status,
    keyword,
    page = 0,
    size = 100,
    sort = 'id,asc',
  } = params

  const queryParams = { page, size, sort }
  if (status) queryParams.status = status
  if (keyword) queryParams.keyword = keyword

  const response = await api.get('/categories', { params: queryParams })
  return response.data.data
}

/**
 * Fetch a single category by id.
 *
 * For BUYER / SUPPLIER, an INACTIVE category returns 404 (existence is
 * hidden) — the backend raises ResourceNotFoundException for that case.
 *
 * @param {number|string} id
 * @returns {Promise<CategoryResponse>}
 */
export async function getCategoryById(id) {
  const response = await api.get(`/categories/${id}`)
  return response.data.data
}

/**
 * Create a new category. Admin only — backend returns 403 otherwise.
 *
 * @param {{ name: string, description?: string|null }} body
 * @returns {Promise<CategoryResponse>}
 */
export async function createCategory(body) {
  const response = await api.post('/admin/categories', body)
  return response.data.data
}

/**
 * Update a category. Admin only.
 *
 * @param {number|string} id
 * @param {{ name: string, description?: string|null }} body
 * @returns {Promise<CategoryResponse>}
 */
export async function updateCategory(id, body) {
  const response = await api.put(`/admin/categories/${id}`, body)
  return response.data.data
}

/**
 * Update a category's status. Admin only.
 *
 * @param {number|string} id
 * @param {'ACTIVE'|'INACTIVE'} status
 * @returns {Promise<CategoryResponse>}
 */
export async function updateCategoryStatus(id, status) {
  const response = await api.patch(`/admin/categories/${id}/status`, { status })
  return response.data.data
}

/**
 * Hard-delete a category. Admin only.
 *
 * Backend throws 409 if products still reference the category.
 *
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteCategory(id) {
  await api.delete(`/admin/categories/${id}`)
}

/**
 * @typedef {Object} CategoryResponse
 * @property {number} id
 * @property {string} name
 * @property {string|null} description
 * @property {string} status            — "ACTIVE" or "INACTIVE"
 * @property {string|null} createdAt
 * @property {string|null} updatedAt
 */

/**
 * @typedef {Object} PageResponse
 * @property {CategoryResponse[]} content
 * @property {number}               pageNo
 * @property {number}               pageSize
 * @property {number}               totalElements
 * @property {number}               totalPages
 * @property {boolean}              last
 * @property {boolean}              first
 */
