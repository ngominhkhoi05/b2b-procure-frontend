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
import { getAccessToken } from '@/utils/auth'
import { normalizeError } from '@/utils/errorHandler'

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

  // 15-second timeout keeps the UX from hanging indefinitely on a dead backend.
  timeout: 15_000,
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalise and rethrow as a structured ApiError so every catch-site
    // receives the same shape regardless of whether this was a 4xx, 5xx,
    // network error, or something unexpected.
    return Promise.reject(normalizeError(error))
  }
)

export { api }
