/**
 * Shared Axios instance for the B2B Procure frontend.
 *
 * Usage:
 *   import { api } from '@/services/api'
 *   const data = await api.get('/products')
 *   await api.post('/orders', payload)
 *
 * All business API calls go through this single instance so that
 * request / response interceptors are applied uniformly.
 */

import axios from 'axios'
import { getAccessToken, removeAccessToken } from '@/utils/auth'
import { normalizeError } from '@/utils/errorHandler'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// ── Axios instance ────────────────────────────────────────────────────────────

const api = axios.create({
  // base URL is read from the Vite environment so it can be swapped
  // per environment without changing code.
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',

  // Sensible defaults — override per-request where needed.
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  // 60-second timeout accommodates:
  //   • Backend cold start (Spring Boot may take 30s on first request after boot).
  //   • BUYER flow: GET /products + 12 parallel GET /products/{id}/prices in worst case.
  //   • Large pages on a 1M-row products table.
  // Override per-request for tighter SLA endpoints.
  timeout: 60_000,
})

// ── Request interceptor ────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ──────────────────────────────────────────────────────

/**
 * Tracks whether a global 401 redirect is already in flight so we don't
 * trigger more than one navigation per expiry event. A dashboard that
 * fans out 5 parallel calls would otherwise stack 5 redirects.
 */
let isRedirectingOn401 = false

function handleUnauthorized() {
  // Clear the persisted token + Pinia auth state.
  removeAccessToken()
  try {
    const auth = useAuthStore()
    if (auth && typeof auth.clearSession === 'function') {
      auth.clearSession()
    }
  } catch {
    // Pinia may not be active yet during early bootstrapping — ignore.
  }

  if (isRedirectingOn401) return
  isRedirectingOn401 = true

  const currentRoute = router.currentRoute.value
  const target = currentRoute?.name === 'login'
    ? null
    : (currentRoute?.fullPath ?? '/')

  router
    .replace(target ? { name: 'login', query: { redirect: target } } : { name: 'login' })
    .finally(() => {
      // Re-arm after a tick so a subsequent legitimate 401 still redirects.
      setTimeout(() => {
        isRedirectingOn401 = false
      }, 500)
    })
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalise first so call-sites always see a structured ApiError.
    const normalised = normalizeError(error)

    // Global 401 handler: a token that was valid at boot has now expired
    // (or been revoked). Clear the session and bounce the buyer to /login.
    if (normalised?.status === 401) {
      handleUnauthorized()
    }

    return Promise.reject(normalised)
  }
)

export { api }
