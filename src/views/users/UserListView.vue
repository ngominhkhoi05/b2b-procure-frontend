<script setup>
/**
 * UserListView — Admin user management.
 *
 * ADMIN only. Lists all users with filters (keyword, status, role), shows
 * a read-only detail modal and a status-change modal. Backend never
 * exposes password hashes and the UI never displays them. Role and
 * Company are intentionally NOT editable here — per backend contract.
 *
 * Mirrors the layout/pattern of CategoryManagementView for visual
 * consistency across admin screens.
 */
import { ref, reactive, onMounted } from 'vue'
import { listUsers, getUserById, updateUserStatus } from '@/services/userService'
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
  role: '',
  status: '',
  page: 0,
  size: 20,
})

const users = ref([])
const pageData = ref({ pageNo: 0, totalElements: 0, totalPages: 0, first: true, last: true })
const loading = ref(false)
const error = ref(null)

const roleOptions = [
  { value: 'ADMIN',    label: 'ADMIN' },
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
const detailUser = ref(null)

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
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.role)    params.role    = filters.role
    if (filters.status)  params.status  = filters.status

    const data = await listUsers(params)
    users.value = data.content || []
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

function onSearch() {
  resetAndReload()
}

function onFilterChange() {
  resetAndReload()
}

function clearFilters() {
  filters.keyword = ''
  filters.role = ''
  filters.status = ''
  resetAndReload()
}

function goToPage(p) {
  if (p < 0 || p >= pageData.value.totalPages) return
  filters.page = p
  load()
}

// ── Detail ─────────────────────────────────────────────────────────────
async function openDetail(user) {
  showDetailModal.value = true
  detailLoading.value = true
  detailError.value = null
  detailUser.value = null
  try {
    // Always re-fetch so we get the latest state and never show stale data.
    detailUser.value = await getUserById(user.id)
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
  detailUser.value = null
  detailError.value = null
}

// ── Status ─────────────────────────────────────────────────────────────
function openStatusModal(user) {
  statusTarget.value = user
  statusDraft.value = user.status || 'ACTIVE'
  showStatusModal.value = true
}

async function submitStatusChange() {
  if (!statusTarget.value) return
  statusSubmitting.value = true
  try {
    await updateUserStatus(statusTarget.value.id, statusDraft.value)
    toast.success('Cập nhật trạng thái người dùng thành công')
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

const ROLE_LABEL = {
  ADMIN:    'Quản trị viên',
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
function getRoleLabel(r)   { return ROLE_LABEL[r]   || r || '—' }
</script>

<template>
  <div class="user-list-view">
    <!-- Header -->
    <header class="user-list-view__header">
      <div>
        <h1 class="user-list-view__title">Quản lý người dùng</h1>
        <p class="user-list-view__subtitle">
          Danh sách tất cả người dùng trong hệ thống. Quản trị viên chỉ có thể
          thay đổi trạng thái tài khoản; vai trò và công ty do backend quản lý.
        </p>
      </div>
    </header>

    <!-- Filters -->
    <section class="user-list-view__filters">
      <div class="user-list-view__filter-keyword">
        <BaseInput
          v-model="filters.keyword"
          label="Từ khóa"
          placeholder="Username, họ tên, email..."
          @keyup.enter="onSearch"
        />
      </div>

      <BaseSelect
        v-model="filters.role"
        label="Vai trò"
        placeholder="Tất cả vai trò"
        :options="roleOptions"
        @update:modelValue="onFilterChange"
      />

      <BaseSelect
        v-model="filters.status"
        label="Trạng thái"
        placeholder="Tất cả trạng thái"
        :options="statusOptions"
        @update:modelValue="onFilterChange"
      />

      <div class="user-list-view__filter-actions">
        <BaseButton variant="primary" @click="onSearch">Tìm kiếm</BaseButton>
        <BaseButton variant="ghost" @click="clearFilters">Đặt lại</BaseButton>
      </div>
    </section>

    <!-- States -->
    <div v-if="loading && users.length === 0" class="user-list-view__state">
      <BaseLoading label="Đang tải danh sách người dùng..." />
    </div>

    <div v-else-if="error && users.length === 0" class="user-list-view__state">
      <BaseError
        title="Không tải được danh sách người dùng"
        :error="error"
        @retry="load"
      />
    </div>

    <div v-else-if="users.length === 0" class="user-list-view__state">
      <BaseEmpty
        title="Chưa có người dùng nào"
        description="Không tìm thấy người dùng phù hợp với bộ lọc hiện tại."
      />
    </div>

    <!-- Table -->
    <div v-else class="user-list-view__table-wrap">
      <table class="user-list-view__table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Username</th>
            <th scope="col">Họ tên</th>
            <th scope="col">Email</th>
            <th scope="col">Công ty</th>
            <th scope="col">Vai trò</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Ngày tạo</th>
            <th scope="col" class="user-list-view__col-actions">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="user-list-view__row">
            <td>#{{ u.id }}</td>
            <td>{{ u.username || '—' }}</td>
            <td>{{ u.fullName || '—' }}</td>
            <td>{{ u.email || '—' }}</td>
            <td>{{ u.companyName || '—' }}</td>
            <td>
              <span class="user-list-view__chip user-list-view__chip--role">
                {{ getRoleLabel(u.roleName) }}
              </span>
            </td>
            <td>
              <span :class="['user-list-view__chip', `user-list-view__chip--${getStatusTone(u.status)}`]">
                {{ getStatusLabel(u.status) }}
              </span>
            </td>
            <td>{{ u.createdAt ? formatDateTime(u.createdAt) : '—' }}</td>
            <td class="user-list-view__col-actions">
              <button
                type="button"
                class="user-list-view__row-action"
                @click="openDetail(u)"
              >
                Chi tiết
              </button>
              <button
                type="button"
                class="user-list-view__row-action user-list-view__row-action--status"
                @click="openStatusModal(u)"
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
      v-if="!loading && users.length > 0 && pageData.totalPages > 1"
      class="user-list-view__pagination"
      aria-label="Phân trang"
    >
      <button
        type="button"
        class="user-list-view__page-btn"
        :disabled="pageData.first"
        @click="goToPage(filters.page - 1)"
      >
        ← Trước
      </button>
      <span class="user-list-view__page-info">
        Trang <strong>{{ pageData.pageNo + 1 }}</strong> / {{ pageData.totalPages }}
        <span class="user-list-view__page-total">
          ({{ formatNumber(pageData.totalElements) }} người dùng)
        </span>
      </span>
      <button
        type="button"
        class="user-list-view__page-btn"
        :disabled="pageData.last"
        @click="goToPage(filters.page + 1)"
      >
        Sau →
      </button>
    </nav>

    <!-- Detail modal (read-only) -->
    <BaseModal
      :modelValue="showDetailModal"
      title="Chi tiết người dùng"
      size="lg"
      @update:modelValue="closeDetail"
    >
      <div v-if="detailLoading" class="user-list-view__modal-state">
        <BaseLoading label="Đang tải thông tin người dùng..." />
      </div>

      <div v-else-if="detailError" class="user-list-view__modal-state">
        <BaseError
          title="Không tải được thông tin người dùng"
          :error="detailError"
          @retry="detailUser && openDetail(detailUser)"
        />
      </div>

      <dl v-else-if="detailUser" class="user-list-view__detail">
        <div class="user-list-view__detail-row">
          <dt>ID</dt>
          <dd>#{{ detailUser.id }}</dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Username</dt>
          <dd>{{ detailUser.username || '—' }}</dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Họ tên</dt>
          <dd>{{ detailUser.fullName || '—' }}</dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Email</dt>
          <dd>{{ detailUser.email || '—' }}</dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Số điện thoại</dt>
          <dd>{{ detailUser.phone || '—' }}</dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Vai trò</dt>
          <dd>
            <span class="user-list-view__chip user-list-view__chip--role">
              {{ getRoleLabel(detailUser.roleName) }}
            </span>
            <span class="user-list-view__detail-note">(không thể thay đổi tại đây)</span>
          </dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Công ty</dt>
          <dd>
            <span v-if="detailUser.companyName">{{ detailUser.companyName }} (#{{ detailUser.companyId }})</span>
            <span v-else class="user-list-view__detail-note">— Không thuộc công ty nào —</span>
          </dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Trạng thái</dt>
          <dd>
            <span :class="['user-list-view__chip', `user-list-view__chip--${getStatusTone(detailUser.status)}`]">
              {{ getStatusLabel(detailUser.status) }}
            </span>
          </dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Ảnh đại diện</dt>
          <dd>
            <a v-if="detailUser.avatarUrl" :href="detailUser.avatarUrl" target="_blank" rel="noopener">
              {{ detailUser.avatarUrl }}
            </a>
            <span v-else>—</span>
          </dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Ảnh bìa</dt>
          <dd>
            <a v-if="detailUser.coverImageUrl" :href="detailUser.coverImageUrl" target="_blank" rel="noopener">
              {{ detailUser.coverImageUrl }}
            </a>
            <span v-else>—</span>
          </dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Ngày tạo</dt>
          <dd>{{ detailUser.createdAt ? formatDateTime(detailUser.createdAt) : '—' }}</dd>
        </div>
        <div class="user-list-view__detail-row">
          <dt>Cập nhật lần cuối</dt>
          <dd>{{ detailUser.updatedAt ? formatDateTime(detailUser.updatedAt) : '—' }}</dd>
        </div>
      </dl>

      <template #footer>
        <button
          type="button"
          class="user-list-view__modal-btn user-list-view__modal-btn--ghost"
          @click="closeDetail"
        >
          Đóng
        </button>
        <button
          v-if="detailUser"
          type="button"
          class="user-list-view__modal-btn user-list-view__modal-btn--primary"
          @click="() => { const u = detailUser; closeDetail(); openStatusModal(u); }"
        >
          Đổi trạng thái
        </button>
      </template>
    </BaseModal>

    <!-- Status change modal -->
    <BaseModal v-model="showStatusModal" title="Đổi trạng thái người dùng" size="sm">
      <div class="user-list-view__status-modal">
        <p>
          Người dùng: <strong>{{ statusTarget?.username }}</strong>
          <span v-if="statusTarget?.fullName"> ({{ statusTarget?.fullName }})</span>
        </p>
        <p>
          Trạng thái hiện tại:
          <span :class="['user-list-view__chip', `user-list-view__chip--${getStatusTone(statusTarget?.status)}`]">
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
          class="user-list-view__modal-btn user-list-view__modal-btn--ghost"
          :disabled="statusSubmitting"
          @click="showStatusModal = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="user-list-view__modal-btn user-list-view__modal-btn--primary"
          :disabled="statusSubmitting"
          @click="submitStatusChange"
        >
          <span v-if="statusSubmitting" class="user-list-view__spinner" aria-hidden="true" />
          Cập nhật
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.user-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.user-list-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.user-list-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.user-list-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  max-width: 720px;
  line-height: var(--leading-relaxed);
}

.user-list-view__filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: var(--space-3);
  align-items: end;
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.user-list-view__filter-keyword {
  min-width: 0;
}

.user-list-view__filter-actions {
  display: flex;
  gap: var(--space-2);
}

.user-list-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.user-list-view__table-wrap {
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.user-list-view__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.user-list-view__table thead {
  background: var(--color-surface-alt);
}

.user-list-view__table th {
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

.user-list-view__table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.user-list-view__row:last-child td {
  border-bottom: none;
}

.user-list-view__col-actions {
  text-align: right;
  white-space: nowrap;
}

.user-list-view__row-action {
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

.user-list-view__row-action:first-child {
  margin-left: 0;
}

.user-list-view__row-action:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.user-list-view__row-action--status {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.user-list-view__row-action--status:hover {
  background-color: var(--color-primary-soft);
}

.user-list-view__chip {
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

.user-list-view__chip--success {
  background: var(--color-success-bg, #dcfce7);
  color: var(--color-success, #166534);
}

.user-list-view__chip--danger {
  background: var(--color-danger-bg, #fee2e2);
  color: var(--color-danger, #991b1b);
}

.user-list-view__chip--role {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.user-list-view__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.user-list-view__page-btn {
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

.user-list-view__page-btn:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
}

.user-list-view__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.user-list-view__page-info {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.user-list-view__page-info strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}

.user-list-view__page-total {
  margin-left: var(--space-2);
  color: var(--color-text-muted);
}

/* ── Modals ─────────────────────────────────────────────────── */
.user-list-view__modal-state {
  padding: var(--space-6) 0;
}

.user-list-view__detail {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.user-list-view__detail-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  align-items: center;
}

.user-list-view__detail-row:last-child {
  border-bottom: none;
}

.user-list-view__detail-row dt {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}

.user-list-view__detail-row dd {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  word-break: break-word;
}

.user-list-view__detail-note {
  margin-left: var(--space-2);
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.user-list-view__status-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.user-list-view__modal-btn {
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

.user-list-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-list-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.user-list-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.user-list-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.user-list-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.user-list-view__spinner {
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
  .user-list-view__filters {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .user-list-view__filter-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
  .user-list-view__detail-row {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
}

@media (max-width: 640px) {
  .user-list-view__filters {
    grid-template-columns: 1fr;
  }
}
</style>
