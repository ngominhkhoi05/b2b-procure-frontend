/**
 * User service — admin-scoped user APIs and shared profile APIs.
 *
 * Admin endpoints (ADMIN only):
 *   GET    /api/v1/admin/users                       (PageResponse<UserResponse>)
 *   GET    /api/v1/admin/users/{userId}             (UserResponse)
 *   PATCH  /api/v1/admin/users/{userId}/status      body { status }
 *
 * Shared profile endpoints (any authenticated role):
 *   GET    /api/v1/users/me
 *   PUT    /api/v1/users/me        body UpdateUserRequest
 *   PATCH  /api/v1/users/me/password body ChangePasswordRequest
 *
 * Reuses the shared `api` instance so the JWT interceptor and
 * normalised ApiError handling are applied uniformly.
 */

import { api } from './api'

// ── Admin user management ────────────────────────────────────────────────

/**
 * Fetch a paginated list of users (ADMIN only).
 *
 * @param {{
 *   role?: string,        // 'ADMIN' | 'BUYER' | 'SUPPLIER'
 *   status?: string,      // 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
 *   keyword?: string,
 *   page?: number,
 *   size?: number,
 *   sort?: string,
 * }} [params]
 * @returns {Promise<PageResponse<UserResponse>>}
 */
export async function listUsers(params = {}) {
  const {
    role,
    status,
    keyword,
    page = 0,
    size = 20,
    sort = 'id,asc',
  } = params

  const queryParams = { page, size, sort }
  if (role)     queryParams.role     = role
  if (status)   queryParams.status   = status
  if (keyword)  queryParams.keyword  = keyword

  const response = await api.get('/admin/users', { params: queryParams })
  return response.data.data
}

/**
 * Fetch a single user by id (ADMIN only).
 *
 * @param {number|string} userId
 * @returns {Promise<UserResponse>}
 */
export async function getUserById(userId) {
  const response = await api.get(`/admin/users/${userId}`)
  return response.data.data
}

/**
 * Update a user's status (ADMIN only).
 *
 * @param {number|string} userId
 * @param {'ACTIVE'|'INACTIVE'|'BLOCKED'} status
 * @returns {Promise<UserResponse>}
 */
export async function updateUserStatus(userId, status) {
  const response = await api.patch(`/admin/users/${userId}/status`, { status })
  return response.data.data
}

// ── Shared profile APIs ─────────────────────────────────────────────────

/**
 * Fetch the currently authenticated user's profile.
 *
 * @returns {Promise<UserResponse>}
 */
export async function getCurrentUser() {
  const response = await api.get('/users/me')
  return response.data.data
}

/**
 * Update the currently authenticated user's profile.
 *
 * @param {UpdateUserRequest} body
 * @returns {Promise<UserResponse>}
 */
export async function updateCurrentUser(body) {
  const response = await api.put('/users/me', body)
  return response.data.data
}

/**
 * Change the currently authenticated user's password.
 *
 * @param {{ currentPassword: string, newPassword: string }} body
 * @returns {Promise<void>}
 */
export async function changePassword(body) {
  await api.patch('/users/me/password', body)
}

// ── Types ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} UserResponse
 * @property {number}         id
 * @property {number}         roleId
 * @property {string}         roleName              — 'ADMIN' | 'BUYER' | 'SUPPLIER'
 * @property {number|null}    companyId
 * @property {string|null}    companyName
 * @property {string}         username
 * @property {string}         fullName
 * @property {string}         email
 * @property {string|null}    phone
 * @property {string|null}    avatarUrl
 * @property {string|null}    coverImageUrl
 * @property {string}         status                — 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
 * @property {string|null}    createdAt
 * @property {string|null}    updatedAt
 */

/**
 * @typedef {Object} UpdateUserRequest
 * @property {string}         fullName              — required
 * @property {string|null}    [phone]               — max 20 chars
 * @property {string|null}    [avatarUrl]           — max 500 chars
 * @property {string|null}    [coverImageUrl]       — max 500 chars
 */

/**
 * @typedef {Object} PageResponse
 * @property {UserResponse[]} content
 * @property {number}         pageNo
 * @property {number}         pageSize
 * @property {number}         totalElements
 * @property {number}         totalPages
 * @property {boolean}        last
 * @property {boolean}        first
 */
