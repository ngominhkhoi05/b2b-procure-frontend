/**
 * Admin service — admin-scoped API calls (Statistics overview).
 *
 * Reuses the shared `api` instance so the JWT interceptor and
 * normalised ApiError handling are applied uniformly.
 */

import { api } from './api'

/**
 * Fetch the admin statistics overview.
 *
 * Backend endpoint:
 *   GET /api/v1/admin/statistics/overview
 *
 * @param {{ fromDate?: string, toDate?: string }} [params]
 *   Optional ISO date filters (yyyy-MM-dd). Both are inclusive.
 * @returns {Promise<AdminStatisticsResponse>}
 */
export async function getStatisticsOverview(params = {}) {
  const response = await api.get('/admin/statistics/overview', { params })
  // Backend wraps response in { success, message, data }
  return response.data.data
}

/**
 * @typedef {Object} AdminStatisticsResponse
 * @property {number}                       totalOrders
 * @property {number}                       completedOrders
 * @property {number}                       pendingConfirmationOrders
 * @property {number}                       cancelledOrders
 * @property {number}                       rejectedOrders
 * @property {string|number|null}           totalOrderValue     BigDecimal as string from Jackson
 * @property {string|number|null}           totalCommission     BigDecimal as string from Jackson
 * @property {string|null}                  fromDate
 * @property {string|null}                  toDate
 */
