/**
 * Authentication service — API calls for login, register, OAuth2, and current user.
 *
 * Uses the shared api instance so that the JWT interceptor and
 * error normalisation are applied to all requests.
 */

import { api } from './api'

/**
 * Build the backend OAuth2 authorization URL for a given provider.
 *
 * The Spring Security default authorization endpoint is:
 *   {apiOrigin}/oauth2/authorization/{registrationId}
 *
 * The `redirect` query parameter is preserved so the backend can
 * return the user to the intended page after successful login.
 *
 * @param {string} [provider='google']
 * @param {string} [redirectPath] — application path to return to (e.g. '/' or '/products')
 * @returns {string} absolute URL
 */
export function getOAuth2AuthorizeUrl(provider = 'google', redirectPath) {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

  // Derive backend origin (strip trailing /api/v1[/]).
  const origin = apiBaseUrl.replace(/\/api\/v\d+\/?$/, '')

  const params = new URLSearchParams()
  if (redirectPath) {
    params.set('redirect', redirectPath)
  }

  const query = params.toString()
  return `${origin}/oauth2/authorization/${provider}${query ? `?${query}` : ''}`
}

/**
 * Login with username and password.
 *
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<LoginResponse>}
 */
export async function login(credentials) {
  const response = await api.post('/auth/login', credentials)
  // Backend wraps response in { success, message, data }
  return response.data.data
}

/**
 * Register a new user.
 *
 * @param {RegisterRequest} data
 * @returns {Promise<LoginResponse>}
 */
export async function register(data) {
  const response = await api.post('/auth/register', data)
  return response.data.data
}

/**
 * Complete Google OAuth2 first-time registration.
 *
 * Backend contract:
 *   POST /api/v1/auth/oauth2/register
 *   Authorization: Bearer <registrationToken>  (optional if token is in body)
 *   Body: { companyType, companyId?, company?, registrationToken? }
 *
 * @param {{ companyType: string, companyId?: number, company?: object, registrationToken?: string }} data
 * @returns {Promise<LoginResponse>}
 */
export async function registerOAuth2(data) {
  const { registrationToken, ...payload } = data
  const response = await api.post('/auth/oauth2/register', payload, {
    headers: registrationToken
      ? { Authorization: `Bearer ${registrationToken}` }
      : undefined,
  })
  return response.data.data
}

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
 * @typedef {Object} LoginResponse
 * @property {string} accessToken
 * @property {string} tokenType
 * @property {number} userId
 * @property {string} username
 * @property {string} role
 * @property {string|null} avatarUrl
 * @property {number} expiresIn
 */

/**
 * @typedef {Object} RegisterRequest
 * @property {string} username
 * @property {string} password
 * @property {string} fullName
 * @property {string} email
 * @property {string} [phone]
 * @property {string} [companyType]  — 'BUYER' or 'SUPPLIER'
 * @property {number} [companyId]    — existing company ID
 * @property {CreateCompanyRequest} [company] — new company details
 */

/**
 * @typedef {Object} CreateCompanyRequest
 * @property {string} name
 * @property {string} taxCode
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [address]
 */

/**
 * @typedef {Object} UserResponse
 * @property {number} id
 * @property {number} roleId
 * @property {string} roleName
 * @property {number|null} companyId
 * @property {string|null} companyName
 * @property {string} username
 * @property {string} fullName
 * @property {string} email
 * @property {string|null} phone
 * @property {string|null} avatarUrl
 * @property {string|null} coverImageUrl
 * @property {string} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */
