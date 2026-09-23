/**
 * Auth store — infrastructure only.
 *
 * Phase 1 responsibilities:
 *   - Persist / retrieve the JWT access token via localStorage.
 *   - Expose a reactive `isAuthenticated` computed.
 *   - Bootstrap token state on app startup (called from main.js).
 *
 * What this does NOT contain (deferred to Auth phase):
 *   - Login / registration API calls.
 *   - Refresh-token logic.
 *   - Role-specific business logic.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  // ── State ─────────────────────────────────────────────────────────────────

  /** @type {import('vue').Ref<string|null>} */
  const token = ref(null)

  /** @type {import('vue').Ref<object|null>} */
  const user = ref(null)

  // ── Computed ───────────────────────────────────────────────────────────────

  const isAuthenticated = computed(() => Boolean(token.value))

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Bootstrap token from localStorage on app startup.
   * Called once from main.js before the router is installed.
   */
  function bootstrapFromStorage() {
    token.value = getAccessToken()
  }

  /**
   * Persist a new access token.
   * @param {string} newToken
   */
  function setToken(newToken) {
    token.value = newToken
    setAccessToken(newToken)
  }

  /**
   * Clear the current session.
   */
  function clearToken() {
    token.value = null
    user.value = null
    removeAccessToken()
  }

  /**
   * Store minimal user session data.
   * Call this from the login / profile API responses in later phases.
   * @param {object} userData
   */
  function setUser(userData) {
    user.value = userData
  }

  return {
    token,
    user,
    isAuthenticated,
    bootstrapFromStorage,
    setToken,
    clearToken,
    setUser,
  }
})
