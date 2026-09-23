/**
 * Global API error normalisation.
 *
 * Converts raw Axios errors into a stable ApiError shape so every
 * consumer handles errors identically.
 *
 * Usage:
 *   import { normalizeError, handleApiError } from '@/utils/errorHandler'
 *
 *   try {
 *     await api.get('/products')
 *   } catch (err) {
 *     const error = normalizeError(err)
 *     // { status, code, message, errors, raw }
 *   }
 */

/**
 * @typedef {Object} ApiError
 * @property {number}      status   HTTP status code (0 = network error)
 * @property {string}     code     Machine-readable error code
 * @property {string}     message  Human-readable message
 * @property {*}          [errors] Backend field-validation errors / detail array
 * @property {Error}      raw      Original error object
 */

/**
 * Maps HTTP status codes to machine-readable codes.
 * Expand this map as the backend introduces new codes.
 */
const STATUS_CODE_MAP = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
}

const DEFAULT_CODE = 'UNKNOWN_ERROR'

/**
 * Extracts a human-readable message from various error shapes.
 */
function extractMessage(data, fallback) {
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim()
  }
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim()
  }
  return fallback
}

/**
 * Normalise a raw error (typically an Axios error) into an ApiError.
 *
 * @param {Error|import('axios').AxiosError} err
 * @returns {ApiError}
 */
export function normalizeError(err) {
  const response = err?.response
  const data = response?.data

  // Network / CORS / timeout — no HTTP response
  if (!response) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
      errors: null,
      raw: err,
    }
  }

  const status = response.status
  const code = STATUS_CODE_MAP[status] ?? DEFAULT_CODE

  // Try to read Spring Boot ApiResponse shape: { code, message, data, errors }
  const backendCode = data?.code
  const backendMessage = extractMessage(data, null)
  const fieldErrors = data?.errors ?? null

  // Prefer backend message if provided, otherwise fall back to a default
  const message =
    backendMessage ??
    (status === 0
      ? 'Không thể kết nối đến máy chủ.'
      : `Yêu cầu thất bại (HTTP ${status})`)

  return {
    status,
    code: backendCode ?? code,
    message,
    errors: fieldErrors,
    raw: err,
  }
}

/**
 * Centralised handler for API errors.
 *
 * NOTE: The Axios response interceptor in `services/api.js` already
 * runs `normalizeError` on every rejected request, so the error
 * passed here is already a normalised ApiError. Calling
 * `normalizeError` again would double-wrap it (the normalised object
 * has no `.response`, causing it to fall back to the network branch
 * even though the backend returned a real 4xx/5xx response).
 *
 * Accepts an optional `on401` callback so the router can be wired in Phase 2.
 *
 * @param {ApiError} err
 * @param {{ on401?: () => void }} [options]
 * @returns {{ code: string, message: string }}
 */
export function handleApiError(err, options = {}) {
  // err is already an ApiError from the response interceptor
  const error = err?.status !== undefined && err?.message !== undefined
    ? err
    : normalizeError(err)

  if (error.status === 401 && typeof options.on401 === 'function') {
    options.on401()
  }

  if (import.meta.env.DEV) {
    console.warn('[ApiError]', {
      status: error.status,
      code: error.code,
      message: error.message,
      errors: error.errors,
    })
  }

  return { code: error.code, message: error.message }
}
