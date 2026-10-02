<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { registerOAuth2 } from '@/services/authService'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

// ── Company type options ────────────────────────────────────────────────────

const COMPANY_TYPE_OPTIONS = [
  { value: 'BUYER', label: 'Nhà mua hàng (Buyer)' },
  { value: 'SUPPLIER', label: 'Nhà cung cấp (Supplier)' },
]

// ── Mode detection ──────────────────────────────────────────────────────────
// 'oauth2'  → user arrived here from the Google OAuth2 NEED_REGISTER callback.
//             Username / password / email / fullName come from the
//             registration token (Google account); only company info is
//             collected here. Form fields for those values are hidden.
// 'traditional' (default) → standard username/password registration.

const isOAuth2Mode = computed(() => route.query.mode === 'oauth2')

// Read the OAuth2 registration token from query string (preferred) or
// sessionStorage (set by OAuth2RedirectView before redirecting here).
let registrationToken = ''
if (typeof route.query.token === 'string') {
  registrationToken = route.query.token
} else if (typeof window !== 'undefined') {
  try {
    registrationToken = window.sessionStorage.getItem('oauth2_registration_token') || ''
  } catch {
    registrationToken = ''
  }
}

onMounted(() => {
  if (isOAuth2Mode.value && !registrationToken) {
    // Token missing or expired — bounce back to login with a clear message.
    toast.error('Phiên đăng ký Google đã hết hạn. Vui lòng thử lại.')
    router.replace('/login')
  }
})

// ── Form state ─────────────────────────────────────────────────────────────

const form = reactive({
  // Account (only used in traditional mode)
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  email: '',
  phone: '',

  // Company type (required for new company)
  companyType: '',

  // New company details
  companyName: '',
  companyTaxCode: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
})

const errors = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  email: '',
  phone: '',
  companyType: '',
  companyName: '',
  companyTaxCode: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  general: '',
})

const isSubmitting = ref(false)
const intendedRedirect = computed(() => {
  const r = route.query.redirect
  // After registration, send users to the application shell by default.
  return typeof r === 'string' && r.startsWith('/') && r !== '/' ? r : '/dashboard'
})

// ── Validation ──────────────────────────────────────────────────────────────

function validate() {
  let valid = true

  // Reset per-field errors
  Object.keys(errors).forEach((k) => { errors[k] = '' })
  errors.general = ''

  // Account fields — only validated in traditional mode
  if (!isOAuth2Mode.value) {
    if (!form.username.trim()) {
      errors.username = 'Tên đăng nhập là bắt buộc'
      valid = false
    } else if (form.username.length < 3 || form.username.length > 50) {
      errors.username = 'Tên đăng nhập phải từ 3 đến 50 ký tự'
      valid = false
    }

    if (!form.password) {
      errors.password = 'Mật khẩu là bắt buộc'
      valid = false
    } else if (form.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
      valid = false
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
      valid = false
    }

    if (!form.fullName.trim()) {
      errors.fullName = 'Họ và tên là bắt buộc'
      valid = false
    }

    if (!form.email.trim()) {
      errors.email = 'Email là bắt buộc'
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Định dạng email không hợp lệ'
      valid = false
    }
  }

  // Company type (required)
  if (!form.companyType) {
    errors.companyType = 'Loại tài khoản là bắt buộc'
    valid = false
  }

  // Company details (required when creating new company)
  if (!form.companyName.trim()) {
    errors.companyName = 'Tên công ty là bắt buộc'
    valid = false
  }

  if (!form.companyTaxCode.trim()) {
    errors.companyTaxCode = 'Mã số thuế là bắt buộc'
    valid = false
  }

  return valid
}

// ── Submit ────────────────────────────────────────────────────────────────

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  errors.general = ''

  try {
    if (isOAuth2Mode.value) {
      // ── OAuth2 completion flow ──────────────────────────────────────────
      const response = await registerOAuth2({
        companyType: form.companyType,
        registrationToken,
        company: {
          name: form.companyName.trim(),
          taxCode: form.companyTaxCode.trim(),
          email: form.companyEmail.trim() || undefined,
          phone: form.companyPhone.trim() || undefined,
          address: form.companyAddress.trim() || undefined,
        },
      })

      // Wire the new session using the existing auth architecture.
      authStore.loginWithOAuth2Success({
        accessToken: response.accessToken,
        userId: response.userId,
        username: response.username,
        role: response.role,
        avatarUrl: response.avatarUrl,
      })

      // Clear the one-shot registration token now that it has been used.
      try { window.sessionStorage.removeItem('oauth2_registration_token') } catch { /* ignore */ }

      toast.success('Đăng ký tài khoản Google thành công!')
      router.push(intendedRedirect.value)
    } else {
      // ── Traditional registration flow ───────────────────────────────────
      await authStore.register({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        companyType: form.companyType,
        company: {
          name: form.companyName.trim(),
          taxCode: form.companyTaxCode.trim(),
          email: form.companyEmail.trim() || undefined,
          phone: form.companyPhone.trim() || undefined,
          address: form.companyAddress.trim() || undefined,
        },
      })

      toast.success('Đăng ký thành công! Vui lòng đăng nhập.')
      router.push('/login')
    }
  } catch (err) {
    const { message, errors: fieldErrors } = handleApiError(err)

    // Try to map backend field errors
    if (fieldErrors && typeof fieldErrors === 'object') {
      const fieldMap = {
        username: 'username',
        password: 'password',
        fullName: 'fullName',
        email: 'email',
        phone: 'phone',
        companyType: 'companyType',
        'company.name': 'companyName',
        'company.taxCode': 'companyTaxCode',
        'company.email': 'companyEmail',
        'company.phone': 'companyPhone',
        'company.address': 'companyAddress',
      }

      for (const [backendField, frontendField] of Object.entries(fieldMap)) {
        if (fieldErrors[backendField]) {
          const msgs = fieldErrors[backendField]
          errors[frontendField] = Array.isArray(msgs) ? msgs[0] : msgs
        }
      }
    }

    // Fallback to general error
    if (Object.values(errors).every((e) => !e)) {
      errors.general = message
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- Header -->
      <div class="auth-card__header">
        <h1 class="auth-card__title">
          {{ isOAuth2Mode ? 'Hoàn tất đăng ký Google' : 'Đăng ký' }}
        </h1>
        <p class="auth-card__subtitle">
          {{ isOAuth2Mode
            ? 'Vui lòng cung cấp thông tin công ty để hoàn tất tài khoản Google của bạn.'
            : 'Tạo tài khoản mới trên nền tảng B2B Procure' }}
        </p>
      </div>

      <!-- General error -->
      <div v-if="errors.general" class="auth-card__error" role="alert">
        {{ errors.general }}
      </div>

      <form class="auth-form" novalidate @submit.prevent="handleSubmit">
        <!-- ── Account Information (hidden in OAuth2 mode) ── -->
        <fieldset v-if="!isOAuth2Mode" class="auth-fieldset">
          <legend class="auth-fieldset__legend">Thông tin tài khoản</legend>

          <BaseInput
            v-model="form.username"
            label="Tên đăng nhập"
            placeholder="Nhập tên đăng nhập"
            autocomplete="username"
            :error="errors.username"
            required
          />

          <div class="auth-form__row">
            <BaseInput
              v-model="form.password"
              type="password"
              label="Mật khẩu"
              placeholder="Ít nhất 6 ký tự"
              autocomplete="new-password"
              :error="errors.password"
              required
            />

            <BaseInput
              v-model="form.confirmPassword"
              type="password"
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu"
              autocomplete="new-password"
              :error="errors.confirmPassword"
              required
            />
          </div>
        </fieldset>

        <!-- ── Personal Information (hidden in OAuth2 mode) ── -->
        <fieldset v-if="!isOAuth2Mode" class="auth-fieldset">
          <legend class="auth-fieldset__legend">Thông tin cá nhân</legend>

          <BaseInput
            v-model="form.fullName"
            label="Họ và tên"
            placeholder="Nhập họ và tên đầy đủ"
            autocomplete="name"
            :error="errors.fullName"
            required
          />

          <div class="auth-form__row">
            <BaseInput
              v-model="form.email"
              type="email"
              label="Email"
              placeholder="email@example.com"
              autocomplete="email"
              :error="errors.email"
              required
            />

            <BaseInput
              v-model="form.phone"
              label="Số điện thoại"
              placeholder="0912345678"
              autocomplete="tel"
              :error="errors.phone"
            />
          </div>
        </fieldset>

        <!-- ── Company Information ── -->
        <fieldset class="auth-fieldset">
          <legend class="auth-fieldset__legend">Thông tin công ty</legend>

          <BaseSelect
            v-model="form.companyType"
            label="Loại tài khoản"
            :options="COMPANY_TYPE_OPTIONS"
            placeholder="— Chọn loại tài khoản —"
            :error="errors.companyType"
            required
          />

          <BaseInput
            v-model="form.companyName"
            label="Tên công ty"
            placeholder="Nhập tên công ty"
            :error="errors.companyName"
            required
          />

          <BaseInput
            v-model="form.companyTaxCode"
            label="Mã số thuế"
            placeholder="Nhập mã số thuế"
            :error="errors.companyTaxCode"
            required
          />

          <div class="auth-form__row">
            <BaseInput
              v-model="form.companyEmail"
              type="email"
              label="Email công ty"
              placeholder="company@example.com"
              :error="errors.companyEmail"
            />

            <BaseInput
              v-model="form.companyPhone"
              label="Điện thoại công ty"
              placeholder="0912345678"
              :error="errors.companyPhone"
            />
          </div>

          <BaseInput
            v-model="form.companyAddress"
            label="Địa chỉ công ty"
            placeholder="Nhập địa chỉ công ty"
            :error="errors.companyAddress"
          />
        </fieldset>

        <BaseButton
          type="submit"
          variant="primary"
          block
          :loading="isSubmitting"
          :disabled="isSubmitting"
        >
          {{ isOAuth2Mode ? 'Hoàn tất đăng ký' : 'Đăng ký' }}
        </BaseButton>
      </form>

      <!-- Footer -->
      <div class="auth-card__footer">
        <span>{{ isOAuth2Mode ? 'Đã hoàn tất đăng ký?' : 'Đã có tài khoản?' }}</span>
        <RouterLink to="/login" class="auth-card__link">
          Đăng nhập ngay
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-6) var(--space-4);
  background-color: var(--color-background);
}

.auth-card {
  width: 100%;
  max-width: 560px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-lg);
  margin: 0 auto;
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
  gap: var(--space-5);
}

.auth-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

/* Fieldset */
.auth-fieldset {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-fieldset__legend {
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  width: 100%;
  margin-bottom: var(--space-1);
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
@media (max-width: 560px) {
  .auth-card {
    padding: var(--space-6);
  }

  .auth-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
