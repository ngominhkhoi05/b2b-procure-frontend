<script setup>
import { ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import { api } from '@/services/api'

const toast = useToastStore()
const auth = useAuthStore()

// ── Demo form state ──────────────────────────────────────────────────────────
const formValue = ref('')
const selected = ref(null)
const options = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'supplier', label: 'Nhà cung cấp' },
  { value: 'buyer', label: 'Người mua' },
]

// ── Modal demo ───────────────────────────────────────────────────────────────
const showModal = ref(false)

// ── Loading / error states ────────────────────────────────────────────────────
const loading = ref(false)
const errorObj = ref(null)

// ── Formatted values ─────────────────────────────────────────────────────────
const demoCurrency = formatCurrency(1250000)
const demoDate = formatDate('2026-09-23T15:30:00')
const demoDateTime = formatDateTime('2026-09-23T15:30:00')

// ── Token display ────────────────────────────────────────────────────────────
const hasToken = auth.isAuthenticated
const tokenPreview = auth.token
  ? auth.token.slice(0, 20) + '…'
  : 'Không có token'

// ── Actions ───────────────────────────────────────────────────────────────────
function showToast(type) {
  toast[type]('Đây là thông báo ' + type + '!')
}

function triggerApiError() {
  loading.value = true
  errorObj.value = null
  api.get('/nonexistent-endpoint-404')
    .catch((e) => {
      errorObj.value = e
    })
    .finally(() => {
      loading.value = false
    })
}

function clearError() {
  errorObj.value = null
}
</script>

<template>
  <main class="home-view">
    <div class="container">
      <!-- Header -->
      <header class="home-header">
        <div class="badge badge--primary">Foundation v1.0</div>
        <h1 class="home-title">B2B Procure — Frontend Foundation</h1>
        <p class="home-subtitle">
          Kiến trúc nền tảng đã sẵn sàng. Vue 3 + Vite + Pinia + Vue Router + Axios.
        </p>
      </header>

      <!-- Token info -->
      <section class="card">
        <h2 class="card-title">JWT / Auth Infrastructure</h2>
        <div class="info-row">
          <span class="info-label">Trạng thái xác thực:</span>
          <span :class="['badge', hasToken ? 'badge--success' : 'badge--muted']">
            {{ hasToken ? 'Đã đăng nhập' : 'Chưa đăng nhập' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Token preview:</span>
          <code class="info-code">{{ tokenPreview }}</code>
        </div>
      </section>

      <!-- Design tokens preview -->
      <section class="card">
        <h2 class="card-title">Design Tokens — Màu chính: Blue #2563EB</h2>
        <div class="color-swatches">
          <div class="swatch" style="background: var(--color-primary)" title="primary" />
          <div class="swatch" style="background: var(--color-primary-hover)" title="primary-hover" />
          <div class="swatch" style="background: var(--color-primary-active)" title="primary-active" />
          <div class="swatch" style="background: var(--color-primary-light)" title="primary-light" />
          <div class="swatch" style="background: var(--color-primary-soft)" title="primary-soft" />
          <div class="swatch" style="background: var(--color-success)" title="success" />
          <div class="swatch" style="background: var(--color-warning)" title="warning" />
          <div class="swatch" style="background: var(--color-danger)" title="danger" />
          <div class="swatch" style="background: var(--color-info)" title="info" />
        </div>

        <div class="format-preview">
          <div class="format-item">
            <span class="format-label">formatCurrency(1250000)</span>
            <span class="format-value">{{ demoCurrency }}</span>
          </div>
          <div class="format-item">
            <span class="format-label">formatDate('2026-09-23T15:30:00')</span>
            <span class="format-value">{{ demoDate }}</span>
          </div>
          <div class="format-item">
            <span class="format-label">formatDateTime('2026-09-23T15:30:00')</span>
            <span class="format-value">{{ demoDateTime }}</span>
          </div>
        </div>
      </section>

      <!-- BaseButton -->
      <section class="card">
        <h2 class="card-title">BaseButton</h2>
        <div class="btn-row">
          <BaseButton variant="primary">Primary</BaseButton>
          <BaseButton variant="secondary">Secondary</BaseButton>
          <BaseButton variant="danger">Danger</BaseButton>
          <BaseButton variant="ghost">Ghost</BaseButton>
          <BaseButton variant="primary" disabled>Disabled</BaseButton>
          <BaseButton variant="primary" loading>Loading…</BaseButton>
          <BaseButton variant="primary" block>Block Button</BaseButton>
        </div>
      </section>

      <!-- BaseInput -->
      <section class="card">
        <h2 class="card-title">BaseInput</h2>
        <div class="form-grid">
          <BaseInput
            v-model="formValue"
            label="Tên sản phẩm"
            placeholder="Nhập tên sản phẩm…"
          />
          <BaseInput
            v-model="formValue"
            label="Với lỗi"
            placeholder="Trường bắt buộc"
            error="Trường này không được để trống"
          />
          <BaseInput
            v-model="formValue"
            label="Disabled"
            placeholder="Không thể chỉnh sửa"
            disabled
          />
        </div>
      </section>

      <!-- BaseSelect -->
      <section class="card">
        <h2 class="card-title">BaseSelect</h2>
        <div class="form-grid">
          <BaseSelect
            v-model="selected"
            label="Loại tài khoản"
            :options="options"
            placeholder="— Chọn vai trò —"
          />
          <BaseSelect
            v-model="selected"
            label="Với lỗi"
            :options="options"
            error="Vui lòng chọn một giá trị"
          />
          <BaseSelect
            v-model="selected"
            label="Disabled"
            :options="options"
            disabled
          />
        </div>
        <p v-if="selected" class="selection-note">
          Đã chọn: <strong>{{ options.find(o => o.value === selected)?.label }}</strong>
        </p>
      </section>

      <!-- BaseModal trigger -->
      <section class="card">
        <h2 class="card-title">BaseModal</h2>
        <BaseButton @click="showModal = true">Mở Modal</BaseButton>
        <BaseModal v-model="showModal" title="Xác nhận thao tác">
          <p style="margin:0; color: var(--color-text-secondary);">
            Bạn có chắc chắn muốn tiếp tục không?
          </p>
          <template #footer>
            <BaseButton variant="secondary" @click="showModal = false">Hủy</BaseButton>
            <BaseButton variant="primary" @click="showModal = false; toast.success('Đã xác nhận!')">
              Xác nhận
            </BaseButton>
          </template>
        </BaseModal>
      </section>

      <!-- BaseLoading -->
      <section class="card">
        <h2 class="card-title">BaseLoading</h2>
        <BaseLoading label="Đang tải dữ liệu…" />
      </section>

      <!-- BaseEmpty -->
      <section class="card">
        <h2 class="card-title">BaseEmpty</h2>
        <BaseEmpty
          title="Không có sản phẩm nào"
          description="Danh sách sản phẩm hiện đang trống. Hãy thêm sản phẩm mới để bắt đầu."
        >
          <BaseButton variant="primary">Thêm sản phẩm</BaseButton>
        </BaseEmpty>
      </section>

      <!-- BaseError -->
      <section class="card">
        <h2 class="card-title">BaseError</h2>
        <div v-if="!errorObj">
          <BaseButton @click="triggerApiError" variant="danger">
            Trigger API Error
          </BaseButton>
        </div>
        <BaseError
          v-else
          :error="errorObj"
          @retry="triggerApiError"
        />
      </section>

      <!-- Toast demo -->
      <section class="card">
        <h2 class="card-title">Toast Notifications</h2>
        <div class="btn-row">
          <BaseButton variant="primary" @click="showToast('success')">Success</BaseButton>
          <BaseButton variant="primary" @click="showToast('error')">Error</BaseButton>
          <BaseButton variant="primary" @click="showToast('warning')">Warning</BaseButton>
          <BaseButton variant="primary" @click="showToast('info')">Info</BaseButton>
        </div>
      </section>

      <!-- Navigation -->
      <section class="card card--muted">
        <h2 class="card-title">Điều hướng</h2>
        <p class="nav-hint">
          Thử truy cập <RouterLink to="/about">/about</RouterLink> hoặc
          <RouterLink to="/does-not-exist">một trang không tồn tại</RouterLink>
          để xác nhận router hoạt động.
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
  padding: var(--space-8) var(--space-4);
}

.container {
  max-width: var(--container-lg);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Header */
.home-header {
  text-align: center;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.home-title {
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  margin: var(--space-3) 0 var(--space-2);
}

.home-subtitle {
  font-size: var(--font-md);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge--primary {
  background: var(--color-primary-light);
  color: var(--color-primary-active);
}
.badge--success {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.badge--muted {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
}

/* Card */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.card--muted {
  background: var(--color-surface-alt);
}

.card-title {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-4);
}

/* Info row */
.info-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.info-label {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  min-width: 160px;
}

.info-code {
  font-size: var(--font-sm);
  background: var(--color-surface-alt);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  word-break: break-all;
}

/* Color swatches */
.color-swatches {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.swatch {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

/* Format preview */
.format-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.format-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-size: var(--font-sm);
}

.format-label {
  color: var(--color-text-muted);
  min-width: 300px;
  font-family: var(--font-family-mono);
}

.format-value {
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}

/* Button row */
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

/* Form grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}

.selection-note {
  margin: var(--space-3) 0 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

/* Nav hint */
.nav-hint {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}
</style>
