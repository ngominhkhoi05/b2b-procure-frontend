<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { getOAuth2AuthorizeUrl } from '@/services/authService'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

// ── Form state ─────────────────────────────────────────────────────────────

const form = reactive({
  username: '',
  password: '',
})

const errors = reactive({
  username: '',
  password: '',
  general: '',
})

const isSubmitting = ref(false)
const isOAuth2Starting = ref(false)

// ── Validation ─────────────────────────────────────────────────────────────

function validate() {
  let valid = true
  errors.username = ''
  errors.password = ''
  errors.general = ''

  if (!form.username.trim()) {
    errors.username = 'Tên đăng nhập là bắt buộc'
    valid = false
  }

  if (!form.password) {
    errors.password = 'Mật khẩu là bắt buộc'
    valid = false
  }

  return valid
}

// ── Submit ─────────────────────────────────────────────────────────────────

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  errors.general = ''

  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
    })

    toast.success('Đăng nhập thành công!')

    // Redirect to the saved target route, or home
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' ? redirect : '/')
  } catch (err) {
    const { message, errors: fieldErrors } = handleApiError(err)

    // Try to map backend field errors to form fields
    if (fieldErrors && typeof fieldErrors === 'object') {
      // Backend may return { username: [...], password: [...] }
      if (fieldErrors.username) {
        errors.username = Array.isArray(fieldErrors.username)
          ? fieldErrors.username[0]
          : fieldErrors.username
      }
      if (fieldErrors.password) {
        errors.password = Array.isArray(fieldErrors.password)
          ? fieldErrors.password[0]
          : fieldErrors.password
      }
    }

    // If no field-level mapping, show general error
    if (!errors.username && !errors.password) {
      errors.general = message
    }
  } finally {
    isSubmitting.value = false
  }
}

// ── OAuth2 Google Login ─────────────────────────────────────────────────────

/**
 * Redirect the browser to the backend's OAuth2 authorization endpoint.
 *
 * A full-page navigation is required because the backend will bounce the
 * browser through Google's consent screen and back to the configured
 * OAUTH2_REDIRECT_URI ({appOrigin}/oauth2/redirect). That callback is
 * handled by OAuth2RedirectView, not by an XHR flow.
 */
function handleGoogleLogin() {
  const redirect = typeof route.query.redirect === 'string'
    ? route.query.redirect
    : '/'

  isOAuth2Starting.value = true
  // Disable briefly so the user cannot double-click; the browser will
  // navigate away within milliseconds in the success path.
  setTimeout(() => {
    window.location.href = getOAuth2AuthorizeUrl('google', redirect)
  }, 50)
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- Header -->
      <div class="auth-card__header">
        <h1 class="auth-card__title">Đăng nhập</h1>
        <p class="auth-card__subtitle">
          Chào mừng bạn quay trở lại B2B Procure
        </p>
      </div>

      <!-- General error -->
      <div v-if="errors.general" class="auth-card__error" role="alert">
        {{ errors.general }}
      </div>

      <!-- Form -->
      <form class="auth-form" novalidate @submit.prevent="handleSubmit">
        <BaseInput
          v-model="form.username"
          label="Tên đăng nhập"
          placeholder="Nhập tên đăng nhập"
          autocomplete="username"
          :error="errors.username"
          required
        />

        <BaseInput
          v-model="form.password"
          type="password"
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          autocomplete="current-password"
          :error="errors.password"
          required
        />

        <BaseButton
          type="submit"
          variant="primary"
          block
          :loading="isSubmitting"
          :disabled="isSubmitting"
        >
          Đăng nhập
        </BaseButton>
      </form>

      <!-- Divider -->
      <div class="auth-divider" role="separator">
        <span>hoặc</span>
      </div>

      <!-- OAuth2 Google button -->
      <BaseButton
        type="button"
        variant="google"
        block
        :loading="isOAuth2Starting"
        :disabled="isOAuth2Starting || isSubmitting"
        @click="handleGoogleLogin"
      >
        <span class="auth-google__btn">
          <svg
            class="auth-google__icon"
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
          </svg>
          <span>Đăng nhập bằng Google</span>
        </span>
      </BaseButton>

      <!-- Footer -->
      <div class="auth-card__footer">
        <span>Chưa có tài khoản?</span>
        <RouterLink to="/register" class="auth-card__link">
          Đăng ký ngay
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background-color: var(--color-background);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-lg);
}

.auth-card__header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.auth-card__title {
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2);
}

.auth-card__subtitle {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.auth-card__error {
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-size: var(--font-sm);
  margin-bottom: var(--space-4);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── Divider ─────────────────────────────────────────────────────────── */
.auth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-5) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-sm);
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: var(--color-border);
}

/* ── Google button ────────────────────────────────────────────────────── */
.auth-google__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
}

.auth-google__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.auth-card__footer {
  margin-top: var(--space-6);
  text-align: center;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.auth-card__link {
  margin-left: var(--space-1);
  font-weight: var(--weight-medium);
}

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .auth-card {
    padding: var(--space-6);
  }
}
</style>
