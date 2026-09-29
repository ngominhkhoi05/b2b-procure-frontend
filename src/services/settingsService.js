/**
 * System Settings service — admin-scoped system setting APIs.
 *
 * Backend endpoints (ADMIN only):
 *   GET /api/v1/settings                (List<SystemSettingResponse>)
 *   GET /api/v1/settings/{key}          (SystemSettingResponse; 404 if unknown key)
 *   PUT /api/v1/settings/{key}          body { settingValue }
 *
 * The backend intentionally does NOT expose create / rename / delete
 * endpoints — only updates to existing keys. The UI must respect this.
 *
 * Reuses the shared `api` instance.
 */

import { api } from './api'

/**
 * Fetch all system settings (ADMIN only).
 *
 * @returns {Promise<SystemSettingResponse[]>}
 */
export async function listSettings() {
  const response = await api.get('/settings')
  return response.data.data
}

/**
 * Fetch a single system setting by key (ADMIN only).
 *
 * @param {string} key
 * @returns {Promise<SystemSettingResponse>}
 */
export async function getSettingByKey(key) {
  const response = await api.get(`/settings/${encodeURIComponent(key)}`)
  return response.data.data
}

/**
 * Update the value of an existing system setting (ADMIN only).
 *
 * @param {string} key
 * @param {string} settingValue
 * @returns {Promise<SystemSettingResponse>}
 */
export async function updateSetting(key, settingValue) {
  const response = await api.put(
    `/settings/${encodeURIComponent(key)}`,
    { settingValue }
  )
  return response.data.data
}

// ── Types ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SystemSettingResponse
 * @property {number}      id
 * @property {string}      settingKey
 * @property {string}      settingValue
 * @property {string|null} description
 * @property {string|null} updatedAt
 * @property {number|null} updatedBy
 */
