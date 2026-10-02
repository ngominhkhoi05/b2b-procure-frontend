<script setup>
/**
 * CommissionListView — Admin commission rate management.
 *
 * ADMIN only. Lists commission rates sorted by `effectiveFrom` DESC and
 * lets the admin create new rates. There is no edit / delete UI because
 * the backend does NOT expose those endpoints.
 *
 * Important: the active rate for a completed order is computed by the
 * backend (most recent `effectiveFrom` ≤ completion time). The frontend
 * MUST NOT recompute or display order commission impact.
 */
import { ref, reactive, onMounted } from 'vue'
import {
  listCommissionRates,
  createCommissionRate,
} from '@/services/commissionService'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatDateTime, formatNumber } from '@/utils/format'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const toast = useToastStore()

// ── Pagination ────────────────────────────────────────────────────────
const filters = reactive({
  page: 0,
  size: 20,
})

const rates = ref([])
const pageData = ref({ pageNo: 0, totalElements: 0, totalPages: 0, first: true, last: true })
const loading = ref(false)
const error = ref(null)

// ── Create modal ───────────────────────────────────────────────────────
const showCreate = ref(false)
const createForm = reactive({ rate: '', effectiveFrom: '' })
const createSubmitting = ref(false)
const createErrors = reactive({ general: '', rate: '', effectiveFrom: '' })

// ── Loader ─────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await listCommissionRates({
      page: filters.page,
      size: filters.size,
      sort: 'effectiveFrom,desc',
    })
    rates.value = data.content || []
    pageData.value = {
      pageNo: data.pageNo,
      pageSize: data.pageSize,
      totalElements: data.totalElements,
      totalPages: data.totalPages,
      first: data.first,
      last: data.last,
    }
  } catch (err) {
    const { message } = handleApiError(err)
    error.value = err
    toast.error(message)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goToPage(p) {
  if (p < 0 || p >= pageData.value.totalPages) return
  filters.page = p
  load()
}

// ── Create ─────────────────────────────────────────────────────────────
function openCreate() {
  createForm.rate = ''
  createForm.effectiveFrom = ''
  createErrors.general = ''
  createErrors.rate = ''
  createErrors.effectiveFrom = ''
  showCreate.value = true
}

function validateCreate() {
  createErrors.general = ''
  createErrors.rate = ''
  createErrors.effectiveFrom = ''

  if (createForm.rate === '' || createForm.rate === null) {
    createErrors.rate = 'Vui lòng nhập tỷ lệ hoa hồng.'
  } else {
    const n = Number(createForm.rate)
    if (isNaN(n)) {
      createErrors.rate = 'Tỷ lệ phải là số hợp lệ.'
    } else if (n < 0) {
      createErrors.rate = 'Tỷ lệ phải lớn hơn hoặc bằng 0.'
    }
  }

  if (!createForm.effectiveFrom) {
    createErrors.effectiveFrom = 'Vui lòng chọn ngày giờ hiệu lực.'
  }
  return !createErrors.rate && !createErrors.effectiveFrom
}

async function submitCreate() {
  if (!validateCreate()) return
  createSubmitting.value = true
  try {
    // Convert local datetime-local value to ISO string for the backend.
    const iso = new Date(createForm.effectiveFrom).toISOString()
    await createCommissionRate({
      rate: Number(createForm.rate),
      effectiveFrom: iso,
    })
    toast.success('Tạo tỷ lệ hoa hồng thành công')
    showCreate.value = false
    // Jump back to page 0 so the new entry is visible.
    filters.page = 0
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    const fieldErrors = err?.errors
    if (fieldErrors && typeof fieldErrors === 'object') {
      for (const [k, v] of Object.entries(fieldErrors)) {
        const msg = Array.isArray(v) ? v[0] : v
        if (k in createErrors && typeof msg === 'string') {
          createErrors[k] = msg
        }
      }
    }
    createErrors.general = message
  } finally {
    createSubmitting.value = false
  }
}

// ── Display helpers ────────────────────────────────────────────────────
function formatRate(rate) {
  if (rate == null || rate === '') return '—'
  const n = Number(rate)
  if (isNaN(n)) return '—'
  return `${formatNumber(n)}%`
}
</script>

<template>
  <div class="commission-list-view">
    <!-- Header -->
    <header class="commission-list-view__header">
      <div>
        <h1 class="commission-list-view__title">Quản lý hoa hồng</h1>
        <p class="commission-list-view__subtitle">
          Tỷ lệ hoa hồng áp dụng cho đơn hàng hoàn thành. Tỷ lệ có hiệu lực
          được chọn theo <code>effectiveFrom</code> gần nhất tại thời điểm hoàn thành
          đơn — hệ thống tự tính, không cần nhập tay.
        </p>
      </div>
      <div class="commission-list-view__actions">
        <BaseButton variant="primary" @click="openCreate">
          Tạo tỷ lệ hoa hồng
        </BaseButton>
      </div>
    </header>

    <!-- States -->
    <div v-if="loading && rates.length === 0" class="commission-list-view__state">
      <BaseLoading label="Đang tải danh sách tỷ lệ hoa hồng..." />
    </div>

    <div v-else-if="error && rates.length === 0" class="commission-list-view__state">
      <BaseError
        title="Không tải được danh sách tỷ lệ hoa hồng"
        :error="error"
        @retry="load"
      />
    </div>

    <div v-else-if="rates.length === 0" class="commission-list-view__state">
      <BaseEmpty
        title="Chưa có tỷ lệ hoa hồng nào"
        description="Tạo tỷ lệ hoa hồng đầu tiên để hệ thống có thể tính phí nền tảng khi đơn hàng hoàn thành."
      >
        <BaseButton variant="primary" @click="openCreate">Tạo tỷ lệ hoa hồng</BaseButton>
      </BaseEmpty>
    </div>

    <!-- Table -->
    <div v-else class="commission-list-view__table-wrap">
      <table class="commission-list-view__table">
        <thead>
          <tr>
            <th scope="col">Tỷ lệ</th>
            <th scope="col">Hiệu lực từ</th>
            <th scope="col">Ngày tạo</th>
            <th scope="col">Người tạo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rates" :key="r.id" class="commission-list-view__row">
            <td>
              <span class="commission-list-view__rate">{{ formatRate(r.rate) }}</span>
            </td>
            <td>{{ r.effectiveFrom ? formatDateTime(r.effectiveFrom) : '—' }}</td>
            <td>{{ r.createdAt ? formatDateTime(r.createdAt) : '—' }}</td>
            <td>
              <template v-if="r.createdByFullName">{{ r.createdByFullName }} <span class="commission-list-view__creator-id">(#{{ r.createdById }})</span></template>
              <template v-else-if="r.createdById">#{{ r.createdById }}</template>
              <template v-else>—</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <nav
      v-if="!loading && rates.length > 0 && pageData.totalPages > 1"
      class="commission-list-view__pagination"
      aria-label="Phân trang"
    >
      <button
        type="button"
        class="commission-list-view__page-btn"
        :disabled="pageData.first"
        @click="goToPage(filters.page - 1)"
      >
        ← Trước
      </button>
      <span class="commission-list-view__page-info">
        Trang <strong>{{ pageData.pageNo + 1 }}</strong> / {{ pageData.totalPages }}
        <span class="commission-list-view__page-total">
          ({{ formatNumber(pageData.totalElements) }} tỷ lệ)
        </span>
      </span>
      <button
        type="button"
        class="commission-list-view__page-btn"
        :disabled="pageData.last"
        @click="goToPage(filters.page + 1)"
      >
        Sau →
      </button>
    </nav>

    <!-- Create modal -->
    <BaseModal v-model="showCreate" title="Tạo tỷ lệ hoa hồng" size="md">
      <form class="commission-list-view__form" @submit.prevent="submitCreate">
        <BaseInput
          v-model="createForm.rate"
          label="Tỷ lệ hoa hồng (%)"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Ví dụ: 5 — nghĩa là 5%"
          :error="createErrors.rate"
        />
        <p class="commission-list-view__form-hint">
          Tỷ lệ được tính theo phần trăm trên tổng giá trị đơn hàng hoàn thành.
          Ví dụ nhập <strong>5</strong> tương đương <strong>5%</strong>.
        </p>

        <div class="commission-list-view__field">
          <label for="commission-effective-from" class="commission-list-view__field-label">
            Hiệu lực từ <span class="commission-list-view__required">*</span>
          </label>
          <input
            id="commission-effective-from"
            v-model="createForm.effectiveFrom"
            type="datetime-local"
            class="commission-list-view__input"
            required
          />
          <p v-if="createErrors.effectiveFrom" class="commission-list-view__error" role="alert">
            {{ createErrors.effectiveFrom }}
          </p>
        </div>

        <div v-if="createErrors.general" class="commission-list-view__form-error" role="alert">
          {{ createErrors.general }}
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          class="commission-list-view__modal-btn commission-list-view__modal-btn--ghost"
          :disabled="createSubmitting"
          @click="showCreate = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="commission-list-view__modal-btn commission-list-view__modal-btn--primary"
          :disabled="createSubmitting"
          @click="submitCreate"
        >
          <span v-if="createSubmitting" class="commission-list-view__spinner" aria-hidden="true" />
          Tạo
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.commission-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.commission-list-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.commission-list-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.commission-list-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  max-width: 720px;
  line-height: var(--leading-relaxed);
}

.commission-list-view__subtitle code {
  background: var(--color-surface-alt);
  padding: 1px var(--space-1);
  border-radius: var(--radius-sm);
  font-size: 0.95em;
}

.commission-list-view__actions {
  display: flex;
  gap: var(--space-2);
}

.commission-list-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.commission-list-view__table-wrap {
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.commission-list-view__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.commission-list-view__table thead {
  background: var(--color-surface-alt);
}

.commission-list-view__table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.commission-list-view__table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.commission-list-view__row:last-child td {
  border-bottom: none;
}

.commission-list-view__rate {
  display: inline-flex;
  align-items: center;
  padding: 4px var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: var(--weight-semibold);
  font-size: var(--font-sm);
}

.commission-list-view__creator-id {
  color: var(--color-text-muted);
  font-size: var(--font-xs);
  margin-left: 2px;
}

.commission-list-view__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.commission-list-view__page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-surface);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.commission-list-view__page-btn:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
}

.commission-list-view__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.commission-list-view__page-info {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.commission-list-view__page-info strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}

.commission-list-view__page-total {
  margin-left: var(--space-2);
  color: var(--color-text-muted);
}

/* ── Form ─────────────────────────────────────────────────── */
.commission-list-view__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.commission-list-view__form-hint {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
}

.commission-list-view__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.commission-list-view__field-label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
}

.commission-list-view__required {
  color: var(--color-danger);
  margin-left: 2px;
}

.commission-list-view__input {
  height: 38px;
  padding: 0 var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-base);
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.commission-list-view__input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.commission-list-view__error {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-danger);
}

.commission-list-view__form-error {
  padding: var(--space-2) var(--space-3);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.commission-list-view__modal-btn {
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

.commission-list-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.commission-list-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.commission-list-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.commission-list-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.commission-list-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.commission-list-view__spinner {
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
</style>
