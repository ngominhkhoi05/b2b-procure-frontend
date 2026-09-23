/**
 * Auth store — authentication state management.
 *
 * Responsibilities:
 *   - Persist / retrieve the JWT access token via localStorage.
 *   - Manage authentication state (token, currentUser).
 *   - Provide login, register, logout, fetchCurrentUser actions.
 *   - Bootstrap token state on app startup.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from '@/utils/auth'
import * as authService from '@/services/authService'
import { useToastStore } from '@/stores/toast'

export const useAuthStore = defineStore('auth', () => {
  // ── State ─────────────────────────────────────────────────────────────────

  /** @type {import('vue').Ref<string|null>} */
  const token = ref(null)

  /** @type {import('vue').Ref<object|null>} */
  const currentUser = ref(null)

  /** Whether a bootstrap / fetchCurrentUser request is in flight. */
  const isLoadingUser = ref(false)

  // ── Computed ───────────────────────────────────────────────────────────────

  const isAuthenticated = computed(() => Boolean(token.value) && currentUser.value !== null)

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  /**
   * Bootstrap token from localStorage on app startup.
   * Called once from main.js before the router is installed.
   */
  function bootstrapFromStorage() {
    token.value = getAccessToken()
  }

  /**
   * Attempt to restore full session after a token is present.
   * Call this on app mount when a token exists, or after login.
   * Silently clears the session on 401.
   */
  async function fetchCurrentUser() {
    if (!token.value) return

    isLoadingUser.value = true
    try {
      const user = await authService.getCurrentUser()
      currentUser.value = user
    } catch (err) {
      // 401 → token is invalid; clear session
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        clearSession()
      }
      // Other errors: keep currentUser as-is; let callers handle
    } finally {
      isLoadingUser.value = false
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Login with username and password.
   *
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<void>}
   */
  async function login(credentials) {
    const response = await authService.login(credentials)
    setToken(response.accessToken)
    // Login response already contains user info — use it directly
    currentUser.value = {
      id: response.userId,
      username: response.username,
      role: response.role,
      avatarUrl: response.avatarUrl,
    }
  }

  /**
   * Register a new user.
   *
   * @param {object} data — RegisterRequest payload
   * @returns {Promise<void>}
   */
  async function register(data) {
    const response = await authService.register(data)
    setToken(response.accessToken)
    currentUser.value = {
      id: response.userId,
      username: response.username,
      role: response.role,
      avatarUrl: response.avatarUrl,
    }
  }

  /**
   * Logout — clears token, user, and redirects to login.
   * No backend call needed; JWT removal is sufficient for this architecture.
   */
  function logout() {
    clearSession()
    const toast = useToastStore()
    toast.success('Đăng xuất thành công')
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Persist a new access token.
   * @param {string} newToken
   */
  function setToken(newToken) {
    token.value = newToken
    setAccessToken(newToken)
  }

  /**
   * Clear all session state (token + user) without toast.
   */
  function clearSession() {
    token.value = null
    currentUser.value = null
    removeAccessToken()
  }

  /**
   * Persist an OAuth2 callback session using the token issued by the
   * backend's OAuth2AuthenticationSuccessHandler.
   *
   * The backend redirects the browser to the application's OAuth2 redirect
   * page with the application JWT already issued (status=SUCCESS). This
   * method performs the same wiring as a password login: store the token,
   * populate the current user, then let the caller redirect to the
   * intended route.
   *
   * @param {{ accessToken: string, userId: number, username: string, role: string, avatarUrl?: string|null }} payload
   */
  function loginWithOAuth2Success(payload) {
    setToken(payload.accessToken)
    currentUser.value = {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
      avatarUrl: payload.avatarUrl ?? null,
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // State
    token,
    currentUser,
    isLoadingUser,

    // Computed
    isAuthenticated,

    // Bootstrap
    bootstrapFromStorage,
    fetchCurrentUser,

    // Actions
    login,
    register,
    logout,
    loginWithOAuth2Success,

    // Internal helpers (exposed for router guard)
    setToken,
    clearSession,
  }
})
