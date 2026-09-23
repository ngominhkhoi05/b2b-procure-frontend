/**
 * Authentication / JWT storage helpers.
 *
 * Phase 1: infrastructure only.
 * - No refresh-token handling.
 * - No automatic refresh logic.
 * - Single key in localStorage; can be replaced with cookie / httpOnly
 *   storage in a later phase without changing call sites.
 */

const ACCESS_TOKEN_KEY = 'b2b_access_token'

function safeGet(key) {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value)
    }
  } catch {
    /* storage may be disabled (private mode, quota) — silently ignore */
  }
}

function safeRemove(key) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

export function getAccessToken() {
  return safeGet(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token) {
  if (!token) {
    removeAccessToken()
    return
  }
  safeSet(ACCESS_TOKEN_KEY, token)
}

export function removeAccessToken() {
  safeRemove(ACCESS_TOKEN_KEY)
}

export function hasAccessToken() {
  const token = getAccessToken()
  return Boolean(token && token.trim().length > 0)
}

export const AUTH_TOKEN_KEY = ACCESS_TOKEN_KEY
