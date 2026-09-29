<script setup>
/**
 * ProfileView — shared account/profile experience for all roles.
 *
 * Sections (always rendered in this order):
 *   1. Personal information   (read-only Username/Email/Role; editable
 *      fullName, phone, avatarUrl, coverImageUrl)
 *   2. Change password
 *   3. Company information    (BUYER / SUPPLIER only; read-only display
 *      with an Edit modal that submits to /companies/me)
 *
 * Admin never sees the Company section because Admin has no company —
 * the backend returns 400 on /companies/me for Admin, and we silently
 * skip the section instead of showing that as a user-facing error.
 *
 * Every section has its own loading / error state so one failure
 * doesn't blank the page.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import {
  getCurrentUser,
  updateCurrentUser,
  changePassword,
} from '@/services/userService'
import {
  getCurrentCompany,
  updateCurrentCompany,
} from '@/services/companyService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatDateTime } from '@/utils/format'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseImageUploader from '@/components/common/BaseImageUploader.vue'

const auth = useAuthStore()
const toast = useToastStore()

// Accept both `role` and `roleName` shapes — same convention used elsewhere.
const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)
const isAdmin = computed(() => role.value === 'ADMIN')

const ROLE_LABEL = {
  ADMIN:    'Quản trị viên',
  BUYER:    'Nhà mua hàng',
  SUPPLIER: 'Nhà cung cấp',
}

// ── Section 1 — Personal information ───────────────────────────────────
const user = ref(null)
const userLoading = ref(false)
const userError = ref(null)

const profileForm = reactive({
  fullName: '',
  phone: '',
  avatarUrl: '',
  coverImageUrl: '',
})
const profileSaving = ref(false)
const profileErrors = reactive({ general: '', fullName: '', phone: '', avatarUrl: '', coverImageUrl: '' })

async function loadUser() {
  userLoading.value = true
  userError.value = null
  try {
    const u = await getCurrentUser()
    user.value = u
    profileForm.fullName      = u.fullName      ?? ''
    profileForm.phone         = u.phone         ?? ''
    profileForm.avatarUrl     = u.avatarUrl     ?? ''
    profileForm.coverImageUrl = u.coverImageUrl ?? ''
  } catch (err) {
    const { message } = handleApiError(err)
    userError.value = err
    toast.error(message)
  } finally {
    userLoading.value = false
  }
}

function validateProfile() {
  profileErrors.general = ''
  profileErrors.fullName = ''
  profileErrors.phone = ''
  profileErrors.avatarUrl = ''
  profileErrors.coverImageUrl = ''

  if (!profileForm.fullName || !profileForm.fullName.trim()) {
    profileErrors.fullName = 'Vui lòng nhập họ tên.'
  } else if (profileForm.fullName.length > 100) {
    profileErrors.fullName = 'Họ tên không được vượt quá 100 ký tự.'
  }
  if (profileForm.phone && profileForm.phone.length > 20) {
    profileErrors.phone = 'Số điện thoại không được vượt quá 20 ký tự.'
  }
  if (profileForm.avatarUrl && profileForm.avatarUrl.length > 500) {
    profileErrors.avatarUrl = 'URL ảnh đại diện không được vượt quá 500 ký tự.'
  }
  if (profileForm.coverImageUrl && profileForm.coverImageUrl.length > 500) {
    profileErrors.coverImageUrl = 'URL ảnh bìa không được vượt quá 500 ký tự.'
  }
  return !profileErrors.fullName && !profileErrors.phone &&
         !profileErrors.avatarUrl && !profileErrors.coverImageUrl
}

async function saveProfile() {
  if (!validateProfile()) return
  profileSaving.value = true
  try {
    const payload = {
      fullName:      profileForm.fullName.trim(),
      phone:         profileForm.phone.trim()         || null,
      avatarUrl:     profileForm.avatarUrl.trim()     || null,
      coverImageUrl: profileForm.coverImageUrl.trim() || null,
    }
    const updated = await updateCurrentUser(payload)
    user.value = updated
    // Reflect new values into the auth store so the user menu updates.
    auth.currentUser = {
      ...(auth.currentUser || {}),
      fullName:  updated.fullName,
      avatarUrl: updated.avatarUrl,
    }
    toast.success('Cập nhật hồ sơ thành công')
  } catch (err) {
    const { message } = handleApiError(err)
    const fieldErrors = err?.errors
    if (fieldErrors && typeof fieldErrors === 'object') {
      for (const [k, v] of Object.entries(fieldErrors)) {
        const msg = Array.isArray(v) ? v[0] : v
        if (k in profileErrors && typeof msg === 'string') {
          profileErrors[k] = msg
        }
      }
    }
    profileErrors.general = message
  } finally {
    profileSaving.value = false
  }
}

// ── Section 2 — Change password ────────────────────────────────────────
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordSaving = ref(false)
const passwordErrors = reactive({ general: '', currentPassword: '', newPassword: '', confirmPassword: '' })

function validatePassword() {
  passwordErrors.general = ''
  passwordErrors.currentPassword = ''
  passwordErrors.newPassword = ''
  passwordErrors.confirmPassword = ''

  if (!passwordForm.currentPassword) {
    passwordErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
  }
  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = 'Vui lòng nhập mật khẩu mới.'
  } else if (passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 100) {
    passwordErrors.newPassword = 'Mật khẩu mới phải có từ 6 đến 100 ký tự.'
  }
  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
  } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    passwordErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  }
  return !passwordErrors.currentPassword && !passwordErrors.newPassword && !passwordErrors.confirmPassword
}

async function submitPasswordChange() {
  if (!validatePassword()) return
  passwordSaving.value = true
  try {
    await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    toast.success('Đổi mật khẩu thành công')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (err) {
    const { message } = handleApiError(err)
    const fieldErrors = err?.errors
    if (fieldErrors && typeof fieldErrors === 'object') {
      for (const [k, v] of Object.entries(fieldErrors)) {
        const msg = Array.isArray(v) ? v[0] : v
        // Backend uses `currentPassword` for the field — map directly.
        if (k === 'currentPassword' && typeof msg === 'string') {
          passwordErrors.currentPassword = msg
        } else if (k === 'newPassword' && typeof msg === 'string') {
          passwordErrors.newPassword = msg
        }
      }
    }
    passwordErrors.general = message
  } finally {
    passwordSaving.value = false
  }
}

// ── Section 3 — Company information ────────────────────────────────────
const showCompanySection = ref(false)
const company = ref(null)
const companyLoading = ref(false)
const companyError = ref(null)

const showCompanyEdit = ref(false)
const companyForm = reactive({ name: '', taxCode: '', email: '', phone: '', address: '' })
const companySaving = ref(false)
const companyErrors = reactive({ general: '', name: '', taxCode: '', email: '', phone: '', address: '' })

async function loadCompany() {
  // Admin does not belong to a company. Skip silently.
  if (isAdmin.value) {
    showCompanySection.value = false
    return
  }
  companyLoading.value = true
  companyError.value = null
  try {
    company.value = await getCurrentCompany()
    showCompanySection.value = true
  } catch (err) {
    // 400: user has no company (e.g. role changes). Skip the section silently.
    if (err?.status === 400) {
      showCompanySection.value = false
    } else {
      const { message } = handleApiError(err)
      companyError.value = err
      toast.error(message)
    }
  } finally {
    companyLoading.value = false
  }
}

function openCompanyEdit() {
  if (!company.value) return
  companyForm.name    = company.value.name    ?? ''
  companyForm.taxCode = company.value.taxCode ?? ''
  companyForm.email   = company.value.email   ?? ''
  companyForm.phone   = company.value.phone   ?? ''
  companyForm.address = company.value.address ?? ''
  companyErrors.general = ''
  companyErrors.name = ''
  companyErrors.taxCode = ''
  companyErrors.email = ''
  companyErrors.phone = ''
  companyErrors.address = ''
  showCompanyEdit.value = true
}

function validateCompany() {
  companyErrors.general = ''
  companyErrors.name = ''
  companyErrors.taxCode = ''
  companyErrors.email = ''
  companyErrors.phone = ''
  companyErrors.address = ''

  if (!companyForm.name || !companyForm.name.trim()) {
    companyErrors.name = 'Vui lòng nhập tên công ty.'
  }
  if (companyForm.email && companyForm.email.trim()) {
    // Mirror backend @Email validation: simple shape check; backend is the final word.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email.trim())) {
      companyErrors.email = 'Email không hợp lệ.'
    }
  }
  return !companyErrors.name && !companyErrors.taxCode && !companyErrors.email &&
         !companyErrors.phone && !companyErrors.address
}

async function saveCompany() {
  if (!validateCompany()) return
  companySaving.value = true
  try {
    const payload = {
      name:    companyForm.name.trim(),
      taxCode: companyForm.taxCode.trim() || null,
      email:   companyForm.email.trim()   || null,
      phone:   companyForm.phone.trim()   || null,
      address: companyForm.address.trim() || null,
    }
    const updated = await updateCurrentCompany(payload)
    company.value = updated
    showCompanyEdit.value = false
    toast.success('Cập nhật thông tin công ty thành công')
  } catch (err) {
    const { message } = handleApiError(err)
    const fieldErrors = err?.errors
    if (fieldErrors && typeof fieldErrors === 'object') {
      for (const [k, v] of Object.entries(fieldErrors)) {
        const msg = Array.isArray(v) ? v[0] : v
        if (k in companyErrors && typeof msg === 'string') {
          companyErrors[k] = msg
        }
      }
    }
    companyErrors.general = message
  } finally {
    companySaving.value = false
  }
}

onMounted(() => {
  loadUser()
  loadCompany()
})
</script>

<template>
  <div class="profile-view">
    <!-- Page header -->
    <header class="profile-view__header">
      <h1 class="profile-view__title">Hồ sơ của tôi</h1>
      <p class="profile-view__subtitle">
        Quản lý thông tin cá nhân, bảo mật tài khoản và thông tin công ty của bạn.
      </p>
    </header>

    <!-- Section 1 — Personal info -->
    <section class="profile-view__section">
      <header class="profile-view__section-header">
        <h2 class="profile-view__section-title">Thông tin cá nhân</h2>
      </header>

      <div v-if="userLoading" class="profile-view__section-state">
        <BaseLoading label="Đang tải hồ sơ..." />
      </div>

      <div v-else-if="userError" class="profile-view__section-state">
        <BaseError
          title="Không tải được hồ sơ"
          :error="userError"
          @retry="loadUser"
        />
      </div>

      <form v-else class="profile-view__form" @submit.prevent="saveProfile">
        <div class="profile-view__form-grid">
          <BaseInput
            v-model="profileForm.fullName"
            label="Họ tên"
            placeholder="Họ và tên"
            required
            :error="profileErrors.fullName"
          />
          <BaseInput
            label="Username"
            :modelValue="user?.username ?? ''"
            disabled
            help="Username không thể thay đổi."
          />
          <BaseInput
            label="Email"
            :modelValue="user?.email ?? ''"
            disabled
            help="Email không thể thay đổi tại đây."
          />
          <div class="profile-view__field">
            <label class="profile-view__field-label">Vai trò</label>
            <div class="profile-view__readonly-chip">{{ ROLE_LABEL[role] || role || '—' }}</div>
            <p class="profile-view__field-help">Vai trò do hệ thống quản lý.</p>
          </div>
          <BaseInput
            v-model="profileForm.phone"
            label="Số điện thoại"
            placeholder="Số điện thoại liên hệ"
            :error="profileErrors.phone"
          />

          <!-- Avatar: file-based upload via Cloudinary, with the resulting
               URL kept in profileForm.avatarUrl so saveProfile() submits it
               to the existing PUT /users/me endpoint unchanged. -->
          <BaseImageUploader
            v-model:url="profileForm.avatarUrl"
            variant="avatar"
            label="Ảnh đại diện"
            alt-text="Ảnh đại diện hiện tại"
            :error="profileErrors.avatarUrl"
          />

          <!-- Cover image: same flow as avatar but with the wide preview shape. -->
          <BaseImageUploader
            v-model:url="profileForm.coverImageUrl"
            variant="cover"
            label="Ảnh bìa"
            alt-text="Ảnh bìa hiện tại"
            :error="profileErrors.coverImageUrl"
          />
        </div>

        <div v-if="profileErrors.general" class="profile-view__form-error" role="alert">
          {{ profileErrors.general }}
        </div>

        <div class="profile-view__form-actions">
          <BaseButton variant="primary" type="submit" :loading="profileSaving">
            Lưu thay đổi
          </BaseButton>
        </div>
      </form>
    </section>

    <!-- Section 2 — Change password -->
    <section class="profile-view__section">
      <header class="profile-view__section-header">
        <h2 class="profile-view__section-title">Bảo mật</h2>
        <p class="profile-view__section-sub">Đổi mật khẩu đăng nhập.</p>
      </header>

      <form class="profile-view__form" @submit.prevent="submitPasswordChange">
        <div class="profile-view__form-grid">
          <BaseInput
            v-model="passwordForm.currentPassword"
            label="Mật khẩu hiện tại"
            type="password"
            required
            autocomplete="current-password"
            :error="passwordErrors.currentPassword"
          />
          <BaseInput
            v-model="passwordForm.newPassword"
            label="Mật khẩu mới"
            type="password"
            required
            autocomplete="new-password"
            placeholder="Tối thiểu 6 ký tự"
            :error="passwordErrors.newPassword"
          />
          <BaseInput
            v-model="passwordForm.confirmPassword"
            label="Xác nhận mật khẩu mới"
            type="password"
            required
            autocomplete="new-password"
            :error="passwordErrors.confirmPassword"
          />
        </div>

        <div v-if="passwordErrors.general" class="profile-view__form-error" role="alert">
          {{ passwordErrors.general }}
        </div>

        <div class="profile-view__form-actions">
          <BaseButton variant="primary" type="submit" :loading="passwordSaving">
            Đổi mật khẩu
          </BaseButton>
        </div>
      </form>
    </section>

    <!-- Section 3 — Company information -->
    <section v-if="!isAdmin && (showCompanySection || companyLoading || companyError)" class="profile-view__section">
      <header class="profile-view__section-header">
        <h2 class="profile-view__section-title">Thông tin công ty</h2>
        <BaseButton v-if="company" variant="primary" @click="openCompanyEdit">
          Cập nhật
        </BaseButton>
      </header>

      <div v-if="companyLoading" class="profile-view__section-state">
        <BaseLoading label="Đang tải thông tin công ty..." />
      </div>

      <div v-else-if="companyError" class="profile-view__section-state">
        <BaseError
          title="Không tải được thông tin công ty"
          :error="companyError"
          @retry="loadCompany"
        />
      </div>

      <dl v-else-if="company" class="profile-view__detail">
        <div class="profile-view__detail-row">
          <dt>Tên công ty</dt>
          <dd>{{ company.name || '—' }}</dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Mã số thuế</dt>
          <dd>{{ company.taxCode || '—' }}</dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Email</dt>
          <dd>{{ company.email || '—' }}</dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Số điện thoại</dt>
          <dd>{{ company.phone || '—' }}</dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Địa chỉ</dt>
          <dd>{{ company.address || '—' }}</dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Loại công ty</dt>
          <dd>
            <span class="profile-view__readonly-chip">
              {{ company.companyType === 'BUYER' ? 'Nhà mua hàng'
                : company.companyType === 'SUPPLIER' ? 'Nhà cung cấp'
                : (company.companyType || '—') }}
            </span>
            <span class="profile-view__field-help">Loại công ty không thể thay đổi.</span>
          </dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Trạng thái</dt>
          <dd>{{ company.status || '—' }}</dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Ngày tạo</dt>
          <dd>{{ company.createdAt ? formatDateTime(company.createdAt) : '—' }}</dd>
        </div>
        <div class="profile-view__detail-row">
          <dt>Cập nhật lần cuối</dt>
          <dd>{{ company.updatedAt ? formatDateTime(company.updatedAt) : '—' }}</dd>
        </div>
      </dl>
    </section>

    <!-- Company edit modal -->
    <BaseModal v-model="showCompanyEdit" title="Cập nhật thông tin công ty" size="md">
      <form class="profile-view__form" @submit.prevent="saveCompany">
        <div class="profile-view__form-grid">
          <BaseInput
            v-model="companyForm.name"
            label="Tên công ty"
            required
            :error="companyErrors.name"
          />
          <BaseInput
            v-model="companyForm.taxCode"
            label="Mã số thuế"
            :error="companyErrors.taxCode"
          />
          <BaseInput
            v-model="companyForm.email"
            label="Email"
            type="email"
            :error="companyErrors.email"
          />
          <BaseInput
            v-model="companyForm.phone"
            label="Số điện thoại"
            :error="companyErrors.phone"
          />
          <BaseInput
            v-model="companyForm.address"
            label="Địa chỉ"
            :error="companyErrors.address"
          />
        </div>

        <p class="profile-view__field-help">
          Loại công ty ({{ company?.companyType }}) không thể thay đổi tại đây.
        </p>

        <div v-if="companyErrors.general" class="profile-view__form-error" role="alert">
          {{ companyErrors.general }}
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          class="profile-view__modal-btn profile-view__modal-btn--ghost"
          :disabled="companySaving"
          @click="showCompanyEdit = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="profile-view__modal-btn profile-view__modal-btn--primary"
          :disabled="companySaving"
          @click="saveCompany"
        >
          <span v-if="companySaving" class="profile-view__spinner" aria-hidden="true" />
          Lưu thay đổi
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-md);
  margin: 0 auto;
  width: 100%;
}

.profile-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-view__title {
  margin: 0;
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.profile-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.profile-view__section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.profile-view__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-3);
}

.profile-view__section-title {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.profile-view__section-sub {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.profile-view__section-state {
  padding: var(--space-6) 0;
}

.profile-view__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.profile-view__form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.profile-view__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-view__field-label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
}

.profile-view__field-help {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.profile-view__readonly-chip {
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 var(--space-3);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  font-weight: var(--weight-medium);
  align-self: flex-start;
}

.profile-view__form-error {
  padding: var(--space-2) var(--space-3);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.profile-view__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.profile-view__detail {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-view__detail-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  align-items: center;
}

.profile-view__detail-row:last-child {
  border-bottom: none;
}

.profile-view__detail-row dt {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}

.profile-view__detail-row dd {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  word-break: break-word;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-view__modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 38px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color var(--transition-fast);
}

.profile-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.profile-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.profile-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.profile-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.profile-view__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .profile-view__form-grid {
    grid-template-columns: 1fr;
  }
  .profile-view__detail-row {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
  .profile-view__section {
    padding: var(--space-4);
  }
}
</style>
