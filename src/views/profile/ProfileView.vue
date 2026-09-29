<script setup>
/**
 * ProfileView — shared account/profile experience for all roles.
 *
 * Layout:
 *   1. Hero header       — cover image, avatar, name, username, role chip.
 *   2. Tabs navigation   — Personal info | Security | Company
 *   3. Active panel      — only one panel is rendered at a time.
 *
 * Sections (rendered inside the active panel):
 *   - Personal information  (read-only Username/Email; editable
 *      fullName, phone)
 *   - Change password
 *   - Company information   (BUYER / SUPPLIER only; read-only display
 *      with an Edit modal that submits to /companies/me)
 *
 * Admin never sees the Company tab because Admin has no company —
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
import { uploadAvatar, uploadCover } from '@/services/uploadService'
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

// ── Tabs ──────────────────────────────────────────────────────────────
// Tab keys: 'profile' | 'security' | 'company'
// The Company tab is hidden for Admin and when there is no company to show.
const TAB_KEYS = {
  PROFILE:  'profile',
  SECURITY: 'security',
  COMPANY:  'company',
}
const activeTab = ref(TAB_KEYS.PROFILE)

const showCompanySection = ref(false) // forward-declared so the computed below can read it
const companyLoading = ref(false)     // forward-declared for the same reason

const canShowCompany = computed(
  () => !isAdmin.value && (showCompanySection.value || companyLoading.value),
)

// ── Section 1 — Personal information ───────────────────────────────────
const user = ref(null)
const userLoading = ref(false)
const userError = ref(null)

const profileForm = reactive({
  fullName: '',
  phone: '',
  avatarUrl: '',
  coverImageUrl: '',
  // Track Cloudinary publicIds so the backend can delete the old asset
  // when we replace an image. The component returns both URL + publicId
  // from the upload endpoint; we send them back on profile save.
  avatarPublicId: '',
  coverImagePublicId: '',
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
    // publicIds are intentionally NOT loaded here: backend keeps them
    // internal (UserResponse does not expose them). The backend will
    // look up the previous publicId from DB when deciding what to
    // delete on the next save. See UserServiceImpl#replaceUserImage.
    profileForm.avatarPublicId     = ''
    profileForm.coverImagePublicId = ''
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
      // Send the new publicIds so the backend can replace (delete old
      // + save new) atomically. Empty string is treated as "no change".
      avatarPublicId:     profileForm.avatarPublicId.trim()     || null,
      coverImagePublicId: profileForm.coverImagePublicId.trim() || null,
    }
    const updated = await updateCurrentUser(payload)
    user.value = updated
    // Reflect new values into the auth store so the user menu updates.
    auth.currentUser = {
      ...(auth.currentUser || {}),
      fullName:  updated.fullName,
      avatarUrl: updated.avatarUrl,
    }
    // publicIds were one-shot signals for this save. The backend has
    // already done the destroy+swap. Clear them so a subsequent save
    // without re-uploading is a no-op (would otherwise send the same
    // publicId again and potentially confuse delete logic).
    profileForm.avatarPublicId     = ''
    profileForm.coverImagePublicId = ''
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
const company = ref(null)
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

// ── Hero image upload (cover + avatar) ────────────────────────────────
// `BaseImageUploader` is rendered in `bare` mode inside the hero so it
// doesn't dump its label/help/buttons into the layout. The parent owns
// the file inputs, validation, and upload service calls.

const MAX_IMAGE_BYTES  = 5 * 1024 * 1024
const AVATAR_ACCEPT    = 'image/jpeg,image/png,image/webp,image/gif'
// Vue 3 does NOT support `ref="heroFileInputs.cover"` style binding for
// assigning into a nested object property — that syntax creates a new
// local ref `heroFileInputs.cover` instead, so `?.click()` finds null.
// Use two separate refs and look them up by `which`.
const coverFileInput   = ref(null)
const avatarFileInput  = ref(null)
const heroUploading    = reactive({ cover: false, avatar: false })

function pickHeroFile(which) {
  const input = which === 'cover' ? coverFileInput.value : avatarFileInput.value
  input?.click()
}

async function onHeroFileChange(which, event) {
  const file = event.target.files?.[0]
  // Reset so the same file can be re-picked after a clear.
  event.target.value = ''
  if (!file) return

  if (!file.type || !file.type.startsWith('image/')) {
    toast.error('Vui lòng chọn một tệp hình ảnh.')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error('Hình ảnh vượt quá 5 MB. Vui lòng chọn ảnh nhỏ hơn.')
    return
  }

  const uploadFn  = which === 'cover' ? uploadCover : uploadAvatar
  const fieldKey  = which === 'cover' ? 'coverImageUrl' : 'avatarUrl'
  const publicIdKey = which === 'cover' ? 'coverImagePublicId' : 'avatarPublicId'
  heroUploading[which] = true
  try {
    const result  = await uploadFn(file)
    const newUrl      = typeof result === 'string' ? result : result?.url
    const newPublicId = typeof result === 'string' ? '' : (result?.publicId ?? '')
    if (!newUrl) throw new Error('Upload service returned no URL')
    profileForm[fieldKey]    = newUrl
    profileForm[publicIdKey] = newPublicId
    toast.success(which === 'cover' ? 'Đã cập nhật ảnh bìa' : 'Đã cập nhật ảnh đại diện')
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message || 'Tải ảnh lên thất bại. Vui lòng thử lại.')
  } finally {
    heroUploading[which] = false
  }
}

function clearHeroImage(which) {
  const fieldKey    = which === 'cover' ? 'coverImageUrl'     : 'avatarUrl'
  const publicIdKey = which === 'cover' ? 'coverImagePublicId' : 'avatarPublicId'
  profileForm[fieldKey]    = ''
  profileForm[publicIdKey] = ''
  const input = which === 'cover' ? coverFileInput.value : avatarFileInput.value
  if (input) input.value = ''
}

onMounted(() => {
  loadUser()
  loadCompany()
})
</script>

<template>
  <div class="profile-view">
    <!-- ── Hero header ───────────────────────────────────────────────── -->
    <header class="profile-view__hero">
      <!-- Cover image at the top, full-bleed. `bare` keeps the
           BaseImageUploader from dumping its label/help/buttons into
           the hero. We render our own single control button at the
           cover's bottom-right corner. -->
      <div class="profile-view__hero-cover">
        <BaseImageUploader
          v-model:url="profileForm.coverImageUrl"
          variant="cover"
          alt-text="Ảnh bìa"
          bare
          :error="profileErrors.coverImageUrl"
        />
        <button
          type="button"
          class="profile-view__hero-cover-btn"
          :disabled="heroUploading.cover"
          @click="pickHeroFile('cover')"
        >
          {{ heroUploading.cover ? 'Đang tải...' : (profileForm.coverImageUrl ? 'Đổi ảnh bìa' : 'Tải ảnh bìa') }}
        </button>
        <input
          ref="coverFileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="profile-view__hero-file-input"
          :disabled="heroUploading.cover"
          @change="onHeroFileChange('cover', $event)"
        />
      </div>

      <!-- Identity row: avatar (with its own compact controls) | meta. -->
      <div class="profile-view__hero-identity">
        <div class="profile-view__hero-avatar">
          <div class="profile-view__hero-avatar-preview">
            <BaseImageUploader
              v-model:url="profileForm.avatarUrl"
              variant="avatar"
              alt-text="Ảnh đại diện"
              bare
              :error="profileErrors.avatarUrl"
            />
          </div>
          <div class="profile-view__hero-avatar-actions">
            <button
              type="button"
              class="profile-view__hero-avatar-btn"
              :disabled="heroUploading.avatar"
              @click="pickHeroFile('avatar')"
            >
              {{ heroUploading.avatar ? 'Đang tải...' : 'Thay đổi' }}
            </button>
            <button
              v-if="profileForm.avatarUrl"
              type="button"
              class="profile-view__hero-avatar-btn profile-view__hero-avatar-btn--ghost"
              :disabled="heroUploading.avatar"
              @click="clearHeroImage('avatar')"
            >
              Xóa
            </button>
          </div>
          <p class="profile-view__hero-avatar-help">PNG, JPG, WEBP hoặc GIF. Tối đa 5 MB.</p>
          <input
            ref="avatarFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="profile-view__hero-file-input"
            :disabled="heroUploading.avatar"
            @change="onHeroFileChange('avatar', $event)"
          />
        </div>

        <div class="profile-view__hero-meta">
          <h1 class="profile-view__hero-name">{{ user?.fullName || '—' }}</h1>
          <p class="profile-view__hero-username">
            <template v-if="user?.username">@{{ user.username }}</template>
            <template v-else>&nbsp;</template>
          </p>
          <div class="profile-view__hero-badges">
            <span class="profile-view__hero-role">
              {{ ROLE_LABEL[role] || role || '—' }}
            </span>
            <span v-if="user?.email" class="profile-view__hero-email">
              {{ user.email }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Tabs navigation ──────────────────────────────────────────── -->
    <nav class="profile-view__tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="profile-view__tab"
        :class="{ 'profile-view__tab--active': activeTab === TAB_KEYS.PROFILE }"
        :aria-selected="activeTab === TAB_KEYS.PROFILE"
        @click="activeTab = TAB_KEYS.PROFILE"
      >
        Thông tin cá nhân
      </button>
      <button
        type="button"
        role="tab"
        class="profile-view__tab"
        :class="{ 'profile-view__tab--active': activeTab === TAB_KEYS.SECURITY }"
        :aria-selected="activeTab === TAB_KEYS.SECURITY"
        @click="activeTab = TAB_KEYS.SECURITY"
      >
        Bảo mật
      </button>
      <button
        v-if="canShowCompany"
        type="button"
        role="tab"
        class="profile-view__tab"
        :class="{ 'profile-view__tab--active': activeTab === TAB_KEYS.COMPANY }"
        :aria-selected="activeTab === TAB_KEYS.COMPANY"
        @click="activeTab = TAB_KEYS.COMPANY"
      >
        Công ty
      </button>
    </nav>

    <!-- ── Panel: Personal info ─────────────────────────────────────── -->
    <section
      v-show="activeTab === TAB_KEYS.PROFILE"
      class="profile-view__panel"
      role="tabpanel"
    >
      <div class="profile-view__panel-card">
        <header class="profile-view__panel-header">
          <h2 class="profile-view__panel-title">Thông tin cá nhân</h2>
          <p class="profile-view__panel-sub">Cập nhật họ tên và số điện thoại của bạn.</p>
        </header>

        <div v-if="userLoading" class="profile-view__panel-state">
          <BaseLoading label="Đang tải hồ sơ..." />
        </div>

        <div v-else-if="userError" class="profile-view__panel-state">
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
              v-model="profileForm.phone"
              label="Số điện thoại"
              placeholder="Số điện thoại liên hệ"
              :error="profileErrors.phone"
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
      </div>
    </section>

    <!-- ── Panel: Change password ───────────────────────────────────── -->
    <section
      v-show="activeTab === TAB_KEYS.SECURITY"
      class="profile-view__panel"
      role="tabpanel"
    >
      <div class="profile-view__panel-card">
        <header class="profile-view__panel-header">
          <h2 class="profile-view__panel-title">Bảo mật</h2>
          <p class="profile-view__panel-sub">Đổi mật khẩu đăng nhập.</p>
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
      </div>
    </section>

    <!-- ── Panel: Company information ───────────────────────────────── -->
    <section
      v-if="canShowCompany"
      v-show="activeTab === TAB_KEYS.COMPANY"
      class="profile-view__panel"
      role="tabpanel"
    >
      <div class="profile-view__panel-card">
        <header class="profile-view__panel-header">
          <div>
            <h2 class="profile-view__panel-title">Thông tin công ty</h2>
            <p class="profile-view__panel-sub">
              {{ company?.name || 'Cập nhật thông tin doanh nghiệp của bạn.' }}
            </p>
          </div>
          <BaseButton v-if="company" variant="primary" @click="openCompanyEdit">
            Cập nhật
          </BaseButton>
        </header>

        <div v-if="companyLoading" class="profile-view__panel-state">
          <BaseLoading label="Đang tải thông tin công ty..." />
        </div>

        <div v-else-if="companyError" class="profile-view__panel-state">
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
      </div>
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

/* ── Hero header ─────────────────────────────────────────────────── */
.profile-view__hero {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* Cover sits at the top, full-bleed. The BaseImageUploader's 'cover'
   preview is 160px tall by default; we just hold the relative wrapper
   so the change-button can pin to the cover's bottom-right corner. */
.profile-view__hero-cover {
  position: relative;
  width: 100%;
}

.profile-view__hero-cover-btn {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: var(--space-1) var(--space-3);
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  cursor: pointer;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background-color var(--transition-fast);
}

.profile-view__hero-cover-btn:hover:not(:disabled) {
  background: var(--color-surface);
}

.profile-view__hero-cover-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Hidden native file input — the cover button triggers it. */
.profile-view__hero-file-input {
  display: none;
}

/* Identity row: grid with avatar column on the left and meta on the
   right. The avatar column sits half over the cover via a single,
   deterministic negative top margin so there's no flex reflow fight. */
.profile-view__hero-identity {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: var(--space-5);
  row-gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  /* Pull the avatar up by 48px so half of it overlaps the cover image
     (avatar is 96px tall, half = 48px). This margin is constant and
     token-independent so the overlap is pixel-stable across screens. */
  margin-top: -48px;
}

/* Avatar column = preview + compact action buttons + help line. */
.profile-view__hero-avatar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
}

/* White ring around the avatar so it pops off the cover image. */
.profile-view__hero-avatar-preview {
  width: 96px;
  height: 96px;
  background: var(--color-surface);
  border-radius: var(--radius-full);
  padding: 4px;
  box-shadow: var(--shadow-md);
  flex-shrink: 0;
}

.profile-view__hero-avatar-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.profile-view__hero-avatar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.profile-view__hero-avatar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-view__hero-avatar-btn:not(.profile-view__hero-avatar-btn--ghost) {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.profile-view__hero-avatar-btn:not(.profile-view__hero-avatar-btn--ghost):hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.profile-view__hero-avatar-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.profile-view__hero-avatar-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.profile-view__hero-avatar-help {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.profile-view__hero-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-view__hero-name {
  margin: 0;
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
  /* Truncate on narrow viewports instead of wrapping awkwardly. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-view__hero-username {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.profile-view__hero-badges {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-1);
}

.profile-view__hero-role {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 var(--space-3);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
}

.profile-view__hero-email {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

/* ── Tabs ─────────────────────────────────────────────────────────── */
.profile-view__tabs {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-2);
  overflow-x: auto;
  scrollbar-width: thin;
}

.profile-view__tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast), border-color var(--transition-fast);
  margin-bottom: -1px;
}

.profile-view__tab:hover {
  color: var(--color-text-primary);
}

.profile-view__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: var(--weight-semibold);
}

/* ── Panel + card ─────────────────────────────────────────────────── */
.profile-view__panel {
  /* Only one panel is visible at a time, but keep them in flow
     so the page height doesn't jump when switching tabs. */
}

.profile-view__panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.profile-view__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-3);
}

.profile-view__panel-title {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.profile-view__panel-sub {
  margin: var(--space-1) 0 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.profile-view__panel-state {
  padding: var(--space-6) 0;
}

/* ── Form shared ──────────────────────────────────────────────────── */
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

/* ── Company detail list ─────────────────────────────────────────── */
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

/* ── Modal buttons (kept for compatibility with BaseModal footer) ── */
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

/* ── Responsive ──────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .profile-view__hero-identity {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    row-gap: var(--space-3);
    /* Smaller overlap on mobile: avatar is still 96px but we let the
       meta sit cleanly below it. The cover is 160px; pull up by 48px
       (half the avatar) so the avatar straddles the cover boundary. */
    margin-top: -48px;
    padding: var(--space-4) var(--space-4) var(--space-4);
  }
  .profile-view__hero-avatar {
    align-items: center;
  }
  .profile-view__hero-avatar-actions {
    justify-content: center;
  }
  .profile-view__hero-avatar-help {
    text-align: center;
  }
  .profile-view__hero-badges {
    justify-content: center;
  }
  .profile-view__hero-meta {
    align-items: center;
  }
  .profile-view__form-grid {
    grid-template-columns: 1fr;
  }
  .profile-view__detail-row {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
  .profile-view__panel-card {
    padding: var(--space-4);
  }
}
</style>
