<script setup>
/**
 * CompanyListView — Admin company management.
 *
 * ADMIN only. Lists all companies with filters (keyword, companyType, status),
 * shows a read-only detail modal (with `userCount` and `productCount` from
 * the admin detail endpoint) and a status-change modal. Per backend
 * contract, no edit form is exposed here.
 */
import { ref, reactive, onMounted } from 'vue'
import {
  listCompanies,
  getCompanyByIdForAdmin,
  updateCompanyStatus,
} from '@/services/companyService'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatDateTime, formatNumber } from '@/utils/format'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const toast = useToastStore()

// ── Filters & pagination ───────────────────────────────────────────────
const filters = reactive({
  keyword: '',
  companyType: '',
  status: '',
  page: 0,
  size: 20,
})

const companies = ref([])
const pageData = ref({ pageNo: 0, totalElements: 0, totalPages: 0, first: true, last: true })
const loading = ref(false)
const error = ref(null)

const typeOptions = [
  { value: 'BUYER',    label: 'BUYER' },
  { value: 'SUPPLIER', label: 'SUPPLIER' },
]
const statusOptions = [
  { value: 'ACTIVE',   label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
  { value: 'BLOCKED',  label: 'BLOCKED' },
]

// ── Detail modal ───────────────────────────────────────────────────────
const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailError = ref(null)
const detailCompany = ref(null)

// ── Status modal ───────────────────────────────────────────────────────
const showStatusModal = ref(false)
const statusTarget = ref(null)
const statusDraft = ref('ACTIVE')
const statusSubmitting = ref(false)

// ── Loader ─────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = null
  try {
    const params = { page: filters.page, size: filters.size, sort: 'id,asc' }
    if (filters.keyword)     params.keyword     = filters.keyword
    if (filters.companyType) params.companyType = filters.companyType
    if (filters.status)      params.status      = filters.status

    const data = await listCompanies(params)
    companies.value = data.content || []
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

function resetAndReload() {
  filters.page = 0
  load()
}

function onSearch() { resetAndReload() }
function onFilterChange() { resetAndReload() }

function clearFilters() {
  filters.keyword = ''
  filters.companyType = ''
  filters.status = ''
  resetAndReload()
}

function goToPage(p) {
  if (p < 0 || p >= pageData.value.totalPages) return
  filters.page = p
  load()
}

// ── Detail ─────────────────────────────────────────────────────────────
async function openDetail(company) {
  showDetailModal.value = true
  detailLoading.value = true
  detailError.value = null
  detailCompany.value = null
  try {
    detailCompany.value = await getCompanyByIdForAdmin(company.id)
  } catch (err) {
    const { message } = handleApiError(err)
    detailError.value = err
    toast.error(message)
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  showDetailModal.value = false
  detailCompany.value = null
  detailError.value = null
}

// ── Status ─────────────────────────────────────────────────────────────
function openStatusModal(company) {
  statusTarget.value = company
  statusDraft.value = company.status || 'ACTIVE'
  showStatusModal.value = true
}

async function submitStatusChange() {
  if (!statusTarget.value) return
  statusSubmitting.value = true
  try {
    await updateCompanyStatus(statusTarget.value.id, statusDraft.value)
    toast.success('Cập nhật trạng thái công ty thành công')
    showStatusModal.value = false
    statusTarget.value = null
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    statusSubmitting.value = false
  }
}

// ── Display helpers ────────────────────────────────────────────────────
const STATUS_TONE = {
  ACTIVE:   'success',
  INACTIVE: 'default',
  BLOCKED:  'danger',
}
const TYPE_LABEL = {
  BUYER:    'Nhà mua hàng',
  SUPPLIER: 'Nhà cung cấp',
}
const STATUS_LABEL = {
  ACTIVE:   'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  BLOCKED:  'Bị khóa',
}

function getStatusLabel(s) { return STATUS_LABEL[s] || s || '—' }
function getStatusTone(s)  { return STATUS_TONE[s]  || 'default' }
function getTypeLabel(t)   { return TYPE_LABEL[t]   || t || '—' }
</script>

<template>
  <div class="company-list-view">
    <!-- Header -->
    <header class="company-list-view__header">
      <div>
        <h1 class="company-list-view__title">Quản lý công ty</h1>
        <p class="company-list-view__subtitle">
          Danh sách các công ty nhà mua hàng và nhà cung cấp trong hệ thống.
          Quản trị viên chỉ có thể thay đổi trạng thái; loại công ty không thể chỉnh sửa.
        </p>
      </div>
    </header>

    <!-- Filters -->
    <section class="company-list-view__filters">
      <div class="company-list-view__filter-keyword">
        <BaseInput
          v-model="filters.keyword"
          label="Từ khóa"
          placeholder="Tên, mã số thuế, email..."
          @keyup.enter="onSearch"
        />
      </div>

      <BaseSelect
        v-model="filters.companyType"
        label="Loại công ty"
        placeholder="Tất cả loại"
        :options="typeOptions"
        @update:modelValue="onFilterChange"
      />

      <BaseSelect
        v-model="filters.status"
        label="Trạng thái"
        placeholder="Tất cả trạng thái"
        :options="statusOptions"
        @update:modelValue="onFilterChange"
      />

      <div class="company-list-view__filter-actions">
        <BaseButton variant="primary" @click="onSearch">Tìm kiếm</BaseButton>
        <BaseButton variant="ghost" @click="clearFilters">Đặt lại</BaseButton>
      </div>
    </section>

    <!-- States -->
    <div v-if="loading && companies.length === 0" class="company-list-view__state">
      <BaseLoading label="Đang tải danh sách công ty..." />
    </div>

    <div v-else-if="error && companies.length === 0" class="company-list-view__state">
      <BaseError
        title="Không tải được danh sách công ty"
        :error="error"
        @retry="load"
      />
    </div>

    <div v-else-if="companies.length === 0" class="company-list-view__state">
      <BaseEmpty
        title="Chưa có công ty nào"
        description="Không tìm thấy công ty phù hợp với bộ lọc hiện tại."
      />
    </div>

    <!-- Table -->
    <div v-else class="company-list-view__table-wrap">
      <table class="company-list-view__table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Tên</th>
            <th scope="col">Mã số thuế</th>
            <th scope="col">Loại</th>
            <th scope="col">Số điện thoại</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Ngày tạo</th>
            <th scope="col" class="company-list-view__col-actions">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in companies" :key="c.id" class="company-list-view__row">
            <td>#{{ c.id }}</td>
            <td>{{ c.name || '—' }}</td>
            <td>{{ c.taxCode || '—' }}</td>
            <td>
              <span class="company-list-view__chip company-list-view__chip--type">
                {{ getTypeLabel(c.companyType) }}
              </span>
            </td>
            <td>{{ c.phone || '—' }}</td>
            <td>
              <span :class="['company-list-view__chip', `company-list-view__chip--${getStatusTone(c.status)}`]">
                {{ getStatusLabel(c.status) }}
              </span>
            </td>
            <td>{{ c.createdAt ? formatDateTime(c.createdAt) : '—' }}</td>
            <td class="company-list-view__col-actions">
              <button
                type="button"
                class="company-list-view__row-action"
                @click="openDetail(c)"
              >
                Chi tiết
              </button>
              <button
                type="button"
                class="company-list-view__row-action company-list-view__row-action--status"
                @click="openStatusModal(c)"
              >
                Đổi trạng thái
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <nav
      v-if="!loading && companies.length > 0 && pageData.totalPages > 1"
      class="company-list-view__pagination"
      aria-label="Phân trang"
    >
      <button
        type="button"
        class="company-list-view__page-btn"
        :disabled="pageData.first"
        @click="goToPage(filters.page - 1)"
      >
        ← Trước
      </button>
      <span class="company-list-view__page-info">
        Trang <strong>{{ pageData.pageNo + 1 }}</strong> / {{ pageData.totalPages }}
        <span class="company-list-view__page-total">
          ({{ formatNumber(pageData.totalElements) }} công ty)
        </span>
      </span>
      <button
        type="button"
        class="company-list-view__page-btn"
        :disabled="pageData.last"
        @click="goToPage(filters.page + 1)"
      >
        Sau →
      </button>
    </nav>

    <!-- Detail modal -->
    <BaseModal
      :modelValue="showDetailModal"
      title="Chi tiết công ty"
      size="lg"
      @update:modelValue="closeDetail"
    >
      <div v-if="detailLoading" class="company-list-view__modal-state">
        <BaseLoading label="Đang tải thông tin công ty..." />
      </div>

      <div v-else-if="detailError" class="company-list-view__modal-state">
        <BaseError
          title="Không tải được thông tin công ty"
          :error="detailError"
          @retry="detailCompany && openDetail(detailCompany)"
        />
      </div>

      <dl v-else-if="detailCompany" class="company-list-view__detail">
        <div class="company-list-view__detail-row">
          <dt>ID</dt>
          <dd>#{{ detailCompany.id }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Tên</dt>
          <dd>{{ detailCompany.name || '—' }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Mã số thuế</dt>
          <dd>{{ detailCompany.taxCode || '—' }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Loại công ty</dt>
          <dd>
            <span class="company-list-view__chip company-list-view__chip--type">
              {{ getTypeLabel(detailCompany.companyType) }}
            </span>
            <span class="company-list-view__detail-note">(không thể thay đổi)</span>
          </dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Email</dt>
          <dd>{{ detailCompany.email || '—' }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Số điện thoại</dt>
          <dd>{{ detailCompany.phone || '—' }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Địa chỉ</dt>
          <dd>{{ detailCompany.address || '—' }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Trạng thái</dt>
          <dd>
            <span :class="['company-list-view__chip', `company-list-view__chip--${getStatusTone(detailCompany.status)}`]">
              {{ getStatusLabel(detailCompany.status) }}
            </span>
          </dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Số người dùng</dt>
          <dd>{{ formatNumber(detailCompany.userCount) }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Số sản phẩm</dt>
          <dd>{{ formatNumber(detailCompany.productCount) }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Ngày tạo</dt>
          <dd>{{ detailCompany.createdAt ? formatDateTime(detailCompany.createdAt) : '—' }}</dd>
        </div>
        <div class="company-list-view__detail-row">
          <dt>Cập nhật lần cuối</dt>
          <dd>{{ detailCompany.updatedAt ? formatDateTime(detailCompany.updatedAt) : '—' }}</dd>
        </div>
      </dl>

      <template #footer>
        <button
          type="button"
          class="company-list-view__modal-btn company-list-view__modal-btn--ghost"
          @click="closeDetail"
        >
          Đóng
        </button>
        <button
          v-if="detailCompany"
          type="button"
          class="company-list-view__modal-btn company-list-view__modal-btn--primary"
          @click="() => { const c = detailCompany; closeDetail(); openStatusModal(c); }"
        >
          Đổi trạng thái
        </button>
      </template>
    </BaseModal>

    <!-- Status change modal -->
    <BaseModal v-model="showStatusModal" title="Đổi trạng thái công ty" size="sm">
      <div class="company-list-view__status-modal">
        <p>
          Công ty: <strong>{{ statusTarget?.name }}</strong>
        </p>
        <p>
          Trạng thái hiện tại:
          <span :class="['company-list-view__chip', `company-list-view__chip--${getStatusTone(statusTarget?.status)}`]">
            {{ getStatusLabel(statusTarget?.status) }}
          </span>
        </p>
        <BaseSelect
          v-model="statusDraft"
          label="Trạng thái mới"
          :options="[
            { value: 'ACTIVE',   label: 'ACTIVE — Đang hoạt động' },
            { value: 'INACTIVE', label: 'INACTIVE — Ngừng hoạt động' },
            { value: 'BLOCKED',  label: 'BLOCKED — Bị khóa' },
          ]"
        />
      </div>
      <template #footer>
        <button
          type="button"
          class="company-list-view__modal-btn company-list-view__modal-btn--ghost"
          :disabled="statusSubmitting"
          @click="showStatusModal = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="company-list-view__modal-btn company-list-view__modal-btn--primary"
          :disabled="statusSubmitting"
          @click="submitStatusChange"
        >
          <span v-if="statusSubmitting" class="company-list-view__spinner" aria-hidden="true" />
          Cập nhật
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.company-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.company-list-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.company-list-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.company-list-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  max-width: 720px;
  line-height: var(--leading-relaxed);
}

.company-list-view__filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: var(--space-3);
  align-items: end;
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.company-list-view__filter-keyword {
  min-width: 0;
}

.company-list-view__filter-actions {
  display: flex;
  gap: var(--space-2);
}

.company-list-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.company-list-view__table-wrap {
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.company-list-view__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.company-list-view__table thead {
  background: var(--color-surface-alt);
}

.company-list-view__table th {
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

.company-list-view__table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.company-list-view__row:last-child td {
  border-bottom: none;
}

.company-list-view__col-actions {
  text-align: right;
  white-space: nowrap;
}

.company-list-view__row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-surface);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  margin-left: var(--space-2);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.company-list-view__row-action:first-child {
  margin-left: 0;
}

.company-list-view__row-action:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.company-list-view__row-action--status {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.company-list-view__row-action--status:hover {
  background-color: var(--color-primary-soft);
}

.company-list-view__chip {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.company-list-view__chip--success {
  background: var(--color-success-bg, #dcfce7);
  color: var(--color-success, #166534);
}

.company-list-view__chip--danger {
  background: var(--color-danger-bg, #fee2e2);
  color: var(--color-danger, #991b1b);
}

.company-list-view__chip--type {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.company-list-view__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.company-list-view__page-btn {
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

.company-list-view__page-btn:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
}

.company-list-view__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.company-list-view__page-info {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.company-list-view__page-info strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}

.company-list-view__page-total {
  margin-left: var(--space-2);
  color: var(--color-text-muted);
}

.company-list-view__modal-state {
  padding: var(--space-6) 0;
}

.company-list-view__detail {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.company-list-view__detail-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  align-items: center;
}

.company-list-view__detail-row:last-child {
  border-bottom: none;
}

.company-list-view__detail-row dt {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}

.company-list-view__detail-row dd {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  word-break: break-word;
}

.company-list-view__detail-note {
  margin-left: var(--space-2);
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.company-list-view__status-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.company-list-view__modal-btn {
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

.company-list-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.company-list-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.company-list-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.company-list-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.company-list-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.company-list-view__spinner {
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

@media (max-width: 1024px) {
  .company-list-view__filters {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .company-list-view__filter-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
  .company-list-view__detail-row {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
}

@media (max-width: 640px) {
  .company-list-view__filters {
    grid-template-columns: 1fr;
  }
}
</style>
