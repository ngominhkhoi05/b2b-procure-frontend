/**
 * Shared formatting utilities.
 *
 * No business logic — only display formatting.
 * Uses native Intl APIs; no extra dependencies.
 */

/* ─── Currency ─────────────────────────────────────────── */

/**
 * Format a number as Vietnamese Dong (VND).
 *
 * @param {number|string|null|undefined} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}  e.g. "100.000 ₫"  or "" if value is falsy
 */
export function formatCurrency(value, options = {}) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (isNaN(num)) return ''

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(num)
}

/* ─── Date / DateTime ───────────────────────────────────── */

/**
 * Format an ISO / Date-compatible value as dd/MM/yyyy.
 *
 * @param {string|Date|null|undefined} value
 * @returns {string}  e.g. "23/09/2026"  or "" if value is falsy
 */
export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Format an ISO / Date-compatible value as dd/MM/yyyy HH:mm.
 *
 * @param {string|Date|null|undefined} value
 * @returns {string}  e.g. "23/09/2026 15:30"  or "" if value is falsy
 */
export function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/**
 * Format an ISO / Date-compatible value as HH:mm (24 h).
 *
 * @param {string|Date|null|undefined} value
 * @returns {string}  e.g. "15:30"  or "" if value is falsy
 */
export function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/* ─── Number ────────────────────────────────────────────── */

/**
 * Format a number with thousand separators (vi-VN).
 *
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('vi-VN').format(num)
}

/* ─── Text helpers ─────────────────────────────────────── */

/**
 * Truncate a string to `maxLen` characters, appending "…" if truncated.
 *
 * @param {string|null|undefined} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 80) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

/**
 * Capitalise the first letter of a string.
 *
 * @param {string|null|undefined} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
