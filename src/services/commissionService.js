/**
 * Commission Rate service — admin-scoped commission rate APIs.
 *
 * Backend endpoints (ADMIN only):
 *   GET  /api/v1/admin/commission-rates           (PageResponse<CommissionRateResponse>)
 *   POST /api/v1/admin/commission-rates           body CreateCommissionRateRequest
 *
 * Business rule (documented):
 *   The active commission rate for a completed order is selected as the
 *   rate with the most recent `effectiveFrom` that is still <= order
 *   completion time. The frontend MUST NOT recalculate commission.
 *
 * Reuses the shared `api` instance.
 */

import { api } from './api'

/**
 * Fetch a paginated list of commission rates (ADMIN only).
 *
 * @param {{
 *   page?: number,
 *   size?: number,
 *   sort?: string,
 * }} [params]
 * @returns {Promise<PageResponse<CommissionRateResponse>>}
 */
export async function listCommissionRates(params = {}) {
  const { page = 0, size = 20, sort = 'effectiveFrom,desc' } = params
  const queryParams = { page, size, sort }
  const response = await api.get('/admin/commission-rates', { params: queryParams })
  return response.data.data
}

/**
 * Create a new commission rate (ADMIN only).
 *
 * @param {CreateCommissionRateRequest} body
 * @returns {Promise<CommissionRateResponse>}
 */
export async function createCommissionRate(body) {
  const response = await api.post('/admin/commission-rates', body)
  return response.data.data
}

// ── Types ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CommissionRateResponse
 * @property {number}      id
 * @property {number|string} rate              — BigDecimal as percentage; e.g. 5 = 5%
 * @property {string}      effectiveFrom
 * @property {string|null} createdAt
 * @property {number|null} createdById
 * @property {string|null} createdByFullName
 */

/**
 * @typedef {Object} CreateCommissionRateRequest
 * @property {number|string} rate              — required, ≥ 0
 * @property {string}        effectiveFrom     — required, ISO date-time
 */

/**
 * @typedef {Object} PageResponse
 * @property {CommissionRateResponse[]} content
 * @property {number}                   pageNo
 * @property {number}                   pageSize
 * @property {number}                   totalElements
 * @property {number}                   totalPages
 * @property {boolean}                  last
 * @property {boolean}                  first
 */
