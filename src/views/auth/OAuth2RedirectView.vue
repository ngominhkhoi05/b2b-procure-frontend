<script setup>
/**
 * OAuth2 redirect callback view.
 *
 * The backend's OAuth2AuthenticationSuccessHandler redirects the browser
 * to the configured `OAUTH2_REDIRECT_URI` with query parameters that
 * describe the outcome of the Google OAuth2 flow:
 *
 *   - status=SUCCESS        + accessToken, userId, username, role, avatarUrl, expiresIn
 *   - status=NEED_REGISTER  + registrationToken  (Google account is new)
 *   - status=ERROR          + error              (handled failures)
 *   - error=...             (early failures like unsupported_provider)
 *
 * This view is the single entry point that consumes those params,
 * normalises them through the existing auth architecture, and routes
 * the user to the appropriate destination:
 *
 *   SUCCESS         → save token, populate store, redirect to intended page
 *   NEED_REGISTER   → save registration token to sessionStorage, redirect to /register?mode=oauth2
 *   error / unknown → show message, redirect to /login
 */

import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const statusMessage = ref('Đang hoàn tất đăng nhập với Google...')

// ── Helpers ─────────────────────────────────────────────────────────────────

function intendedRedirect() {
  // The backend may carry a `redirect` query parameter that the
  // application should respect after successful login. Fall back to '/'.
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/'
}

function persistRegistrationToken(token) {
  try {
    // Registration token is short-lived (10 minutes) and only valid for
    // the next /api/v1/auth/oauth2/register call. We keep it in
    // sessionStorage so a refresh on /register does not lose it.
    window.sessionStorage.setItem('oauth2_registration_token', token)
  } catch {
    /* ignore storage errors */
  }
}

function extractErrorMessage(query) {
  // Order of preference: explicit error param, then status=ERROR error param.
  if (typeof query.error === 'string' && query.error.trim()) {
    return query.error
  }
  if (query.status === 'ERROR' && typeof query.error === 'string') {
    return query.error
  }
  return 'Đăng nhập bằng Google không thành công. Vui lòng thử lại.'
}

// ── Main flow ───────────────────────────────────────────────────────────────

onMounted(async () => {
  const query = route.query

  // Case A — Successful login (existing user)
  if (query.status === 'SUCCESS' && typeof query.accessToken === 'string') {
    authStore.loginWithOAuth2Success({
      accessToken: query.accessToken,
      userId: Number(query.userId),
      username: String(query.username || ''),
      role: String(query.role || ''),
      avatarUrl: typeof query.avatarUrl === 'string' && query.avatarUrl
        ? query.avatarUrl
        : null,
    })

    // Optionally refresh currentUser in background so we get the canonical
    // /users/me payload (cover_image_url, phone, etc.).
    authStore.fetchCurrentUser().catch(() => { /* keep what we have */ })

    toast.success('Đăng nhập bằng Google thành công!')
    router.replace(intendedRedirect())
    return
  }

  // Case B — New user, needs to complete registration
  if (query.status === 'NEED_REGISTER' && typeof query.registrationToken === 'string') {
    persistRegistrationToken(query.registrationToken)
    toast.info('Vui lòng hoàn tất thông tin công ty để tiếp tục.')
    router.replace({
      path: '/register',
      query: { mode: 'oauth2', redirect: intendedRedirect() },
    })
    return
  }

  // Case C — Failure or unknown status
  const errorMessage = extractErrorMessage(query)
  statusMessage.value = errorMessage
  toast.error(errorMessage)

  // Give the user a moment to read the toast before bouncing to login.
  setTimeout(() => {
    router.replace({
      path: '/login',
      query: { redirect: intendedRedirect() },
    })
  }, 1200)
})
</script>

<template>
  <div class="oauth2-redirect">
    <div class="oauth2-redirect__card" role="status" aria-live="polite">
      <div class="oauth2-redirect__spinner" aria-hidden="true" />
      <p class="oauth2-redirect__message">{{ statusMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.oauth2-redirect {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background-color: var(--color-background);
}

.oauth2-redirect__card {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-lg);
  max-width: 420px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.oauth2-redirect__spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: oauth2-spin 0.9s linear infinite;
}

.oauth2-redirect__message {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

@keyframes oauth2-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
