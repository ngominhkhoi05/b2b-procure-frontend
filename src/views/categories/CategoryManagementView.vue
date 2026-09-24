<script setup>
/**
 * CategoryManagementView — list / create / edit / status / delete categories.
 *
 * - ADMIN  → full management UI.
 * - SUPPLIER → read-only listing (used as reference; product form pulls its
 *              own category list through categoryService).
 *
 * Mutations are routed through BaseModal confirmations. The backend is the
 * source of truth for validation and 409 duplicate-name detection.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import {
  listCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from '@/services/categoryService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'

import CategoryTable from '@/components/category/CategoryTable.vue'
import CategoryForm from '@/components/category/CategoryForm.vue'
import CategoryStatusBadge from '@/components/category/CategoryStatusBadge.vue'

const auth = useAuthStore()
const toast = useToastStore()

const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)
const isAdmin = computed(() => role.value === 'ADMIN')
const isSupplier = computed(() => role.value === 'SUPPLIER')

const filters = reactive({
  keyword: '',
  status: '',
  page: 0,
  size: 20,
})

const categories = ref([])
const pageData = ref({ pageNo: 0, totalElements: 0, totalPages: 0, first: true, last: true })
const loading = ref(false)
const error = ref(null)

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

// ── Modals ───────────────────────────────────────────────────────────────
const showForm = ref(false)
const editing = ref(null)
const submitting = ref(false)
const formErrors = reactive({})

const showStatusModal = ref(false)
const statusTarget = ref(null)
const statusDraft = ref('ACTIVE')
const statusSubmitting = ref(false)

const showDeleteModal = ref(false)
const deleteTarget = ref(null)
const deleteSubmitting = ref(false)
const deleteError = ref('')

// ── Loader ───────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = null
  try {
    const params = {
      page: filters.page,
      size: filters.size,
      sort: 'id,asc',
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (isAdmin.value && filters.status) params.status = filters.status

    const data = await listCategories(params)
    categories.value = data.content || []
    pageData.value = {
      pageNo: data.pageNo,
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

// ── Filters / pagination ─────────────────────────────────────────────────
function resetAndReload() {
  filters.page = 0
  load()
}

function onSearch() {
  resetAndReload()
}

function clearSearch() {
  filters.keyword = ''
  filters.status = ''
  resetAndReload()
}

function onFilterChange() {
  resetAndReload()
}

function goToPage(p) {
  if (p < 0 || p >= pageData.value.totalPages) return
  filters.page = p
}

// ── Create / Edit ───────────────────────────────────────────────────────
function openCreate() {
  editing.value = null
  Object.keys(formErrors).forEach((k) => { formErrors[k] = '' })
  formErrors.general = ''
  showForm.value = true
}

function openEdit(c) {
  editing.value = c
  Object.keys(formErrors).forEach((k) => { formErrors[k] = '' })
  formErrors.general = ''
  showForm.value = true
}

function mapBackendErrors(err) {
  Object.keys(formErrors).forEach((k) => { formErrors[k] = '' })
  const fieldErrors = err?.errors
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const [key, val] of Object.entries(fieldErrors)) {
      const message = Array.isArray(val) ? val[0] : val
      if (typeof message === 'string') {
        formErrors[key] = message
      }
    }
  }
}

async function handleSubmit(payload) {
  submitting.value = true
  formErrors.general = ''
  try {
    if (editing.value) {
      await updateCategory(editing.value.id, payload)
      toast.success('Cập nhật danh mục thành công')
    } else {
      await createCategory(payload)
      toast.success('Tạo danh mục thành công')
    }
    showForm.value = false
    editing.value = null
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    mapBackendErrors(err)
    formErrors.general = message
  } finally {
    submitting.value = false
  }
}

// ── Status ───────────────────────────────────────────────────────────────
function openStatusModal(c) {
  statusTarget.value = c
  statusDraft.value = c.status || 'ACTIVE'
  showStatusModal.value = true
}

async function submitStatusChange() {
  if (!statusTarget.value) return
  statusSubmitting.value = true
  try {
    await updateCategoryStatus(statusTarget.value.id, statusDraft.value)
    toast.success('Cập nhật trạng thái thành công')
    showStatusModal.value = false
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    statusSubmitting.value = false
  }
}

// ── Delete ───────────────────────────────────────────────────────────────
function openDeleteModal(c) {
  deleteTarget.value = c
  deleteError.value = ''
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteSubmitting.value = true
  deleteError.value = ''
  try {
    await deleteCategory(deleteTarget.value.id)
    toast.success('Xóa danh mục thành công')
    showDeleteModal.value = false
    deleteTarget.value = null
    // After delete, jump back to the previous page if current page is empty
    if (categories.value.length <= 1 && filters.page > 0) {
      filters.page = filters.page - 1
    }
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    deleteError.value = message
    toast.error(message)
  } finally {
    deleteSubmitting.value = false
  }
}
</script>

<template>
  <div class="category-management-view">
    <!-- Header -->
    <header class="category-management-view__header">
      <div>
        <h1 class="category-management-view__title">Danh mục sản phẩm</h1>
        <p class="category-management-view__subtitle">
          <template v-if="isAdmin">Quản lý danh mục trong hệ thống.</template>
          <template v-else>Danh sách danh mục đang hoạt động.</template>
        </p>
      </div>
      <div v-if="isAdmin" class="category-management-view__actions">
        <BaseButton variant="primary" @click="openCreate">Thêm danh mục</BaseButton>
      </div>
    </header>

    <!-- Filters -->
    <section class="category-management-view__filters">
      <div class="category-management-view__search">
        <BaseInput
          v-model="filters.keyword"
          label="Từ khóa"
          placeholder="Tên danh mục, mô tả..."
          @keyup.enter="onSearch"
        />
      </div>

      <BaseSelect
        v-if="isAdmin"
        v-model="filters.status"
        label="Trạng thái"
        :options="statusOptions"
        @update:modelValue="onFilterChange"
      />

      <div class="category-management-view__filter-actions">
        <BaseButton variant="primary" @click="onSearch">Tìm kiếm</BaseButton>
        <BaseButton variant="ghost" @click="clearSearch">Đặt lại</BaseButton>
      </div>
    </section>

    <!-- States -->
    <div v-if="loading && categories.length === 0" class="category-management-view__state">
      <BaseLoading label="Đang tải danh mục..." />
    </div>

    <div v-else-if="error && categories.length === 0" class="category-management-view__state">
      <BaseError
        title="Không tải được danh mục"
        :error="error"
        @retry="load"
      />
    </div>

    <div v-else-if="categories.length === 0" class="category-management-view__state">
      <BaseEmpty
        title="Chưa có danh mục nào"
        :description="isAdmin ? 'Tạo danh mục đầu tiên để bắt đầu phân loại sản phẩm.' : 'Danh sách đang trống.'"
      >
        <BaseButton v-if="isAdmin" variant="primary" @click="openCreate">
          Thêm danh mục
        </BaseButton>
      </BaseEmpty>
    </div>

    <!-- Table -->
    <div v-else class="category-management-view__table-wrap">
      <CategoryTable :categories="categories" :loading="loading">
        <template v-if="isAdmin" #actions="{ category }">
          <button
            type="button"
            class="category-management-view__row-action category-management-view__row-action--edit"
            @click="openEdit(category)"
          >
            Sửa
          </button>
          <button
            type="button"
            class="category-management-view__row-action category-management-view__row-action--status"
            @click="openStatusModal(category)"
          >
            Đổi trạng thái
          </button>
          <button
            type="button"
            class="category-management-view__row-action category-management-view__row-action--delete"
            @click="openDeleteModal(category)"
          >
            Xóa
          </button>
        </template>
        <template v-else #actions />
      </CategoryTable>
    </div>

    <!-- Pagination -->
    <nav
      v-if="!loading && categories.length > 0 && pageData.totalPages > 1"
      class="category-management-view__pagination"
      aria-label="Phân trang"
    >
      <button
        type="button"
        class="category-management-view__page-btn"
        :disabled="pageData.first"
        @click="goToPage(filters.page - 1)"
      >
        ← Trước
      </button>
      <span class="category-management-view__page-info">
        Trang <strong>{{ pageData.pageNo + 1 }}</strong> / {{ pageData.totalPages }}
        <span class="category-management-view__page-total">
          ({{ pageData.totalElements }} danh mục)
        </span>
      </span>
      <button
        type="button"
        class="category-management-view__page-btn"
        :disabled="pageData.last"
        @click="goToPage(filters.page + 1)"
      >
        Sau →
      </button>
    </nav>

    <!-- Create / edit modal -->
    <BaseModal
      v-model="showForm"
      :title="editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'"
      size="md"
    >
      <CategoryForm
        :initial="editing"
        :submitting="submitting"
        :errors="formErrors"
        @submit="handleSubmit"
        @cancel="showForm = false"
      />
    </BaseModal>

    <!-- Status modal -->
    <BaseModal v-model="showStatusModal" title="Đổi trạng thái danh mục" size="sm">
      <div class="category-management-view__status-modal">
        <p>
          Danh mục: <strong>{{ statusTarget?.name }}</strong>
        </p>
        <p>
          Trạng thái hiện tại: <CategoryStatusBadge :status="statusTarget?.status" />
        </p>
        <BaseSelect
          v-model="statusDraft"
          label="Trạng thái mới"
          :options="[
            { value: 'ACTIVE', label: 'ACTIVE — Đang hoạt động' },
            { value: 'INACTIVE', label: 'INACTIVE — Ngừng hoạt động' },
          ]"
        />
      </div>
      <template #footer>
        <button
          type="button"
          class="category-management-view__modal-btn category-management-view__modal-btn--ghost"
          :disabled="statusSubmitting"
          @click="showStatusModal = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="category-management-view__modal-btn category-management-view__modal-btn--primary"
          :disabled="statusSubmitting"
          @click="submitStatusChange"
        >
          <span v-if="statusSubmitting" class="category-management-view__spinner" aria-hidden="true" />
          Cập nhật
        </button>
      </template>
    </BaseModal>

    <!-- Delete confirmation -->
    <BaseModal v-model="showDeleteModal" title="Xóa danh mục" size="sm">
      <p class="category-management-view__confirm-text">
        Bạn có chắc chắn muốn xóa danh mục
        <strong>{{ deleteTarget?.name }}</strong>?
        <br>
        Thao tác này không thể hoàn tác. Nếu danh mục đang được tham chiếu bởi sản phẩm, hệ thống sẽ từ chối.
      </p>
      <div v-if="deleteError" class="category-management-view__delete-error" role="alert">
        {{ deleteError }}
      </div>
      <template #footer>
        <button
          type="button"
          class="category-management-view__modal-btn category-management-view__modal-btn--ghost"
          :disabled="deleteSubmitting"
          @click="showDeleteModal = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="category-management-view__modal-btn category-management-view__modal-btn--danger"
          :disabled="deleteSubmitting"
          @click="confirmDelete"
        >
          <span v-if="deleteSubmitting" class="category-management-view__spinner" aria-hidden="true" />
          Xóa
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.category-management-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.category-management-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.category-management-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.category-management-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.category-management-view__filters {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: var(--space-3);
  align-items: end;
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.category-management-view__search {
  min-width: 0;
}

.category-management-view__filter-actions {
  display: flex;
  gap: var(--space-2);
}

.category-management-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.category-management-view__table-wrap {
  overflow-x: auto;
}

.category-management-view__row-action {
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
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.category-management-view__row-action:first-child {
  margin-left: 0;
}

.category-management-view__row-action:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.category-management-view__row-action--edit {
  color: var(--color-warning, #D97706);
  border-color: var(--color-warning, #D97706);
}

.category-management-view__row-action--status {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.category-management-view__row-action--delete {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.category-management-view__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.category-management-view__page-btn {
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

.category-management-view__page-btn:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
}

.category-management-view__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.category-management-view__page-info {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.category-management-view__page-info strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}

.category-management-view__page-total {
  margin-left: var(--space-2);
  color: var(--color-text-muted);
}

.category-management-view__status-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.category-management-view__modal-btn {
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
  transition: background-color var(--transition-fast);
  border: 1px solid transparent;
}

.category-management-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.category-management-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.category-management-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.category-management-view__modal-btn--danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}

.category-management-view__modal-btn--danger:hover:not(:disabled) {
  background-color: #B91C1C;
}

.category-management-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.category-management-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.category-management-view__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

.category-management-view__confirm-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

.category-management-view__confirm-text strong {
  color: var(--color-text-primary);
}

.category-management-view__delete-error {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .category-management-view__filters {
    grid-template-columns: 1fr 1fr;
  }

  .category-management-view__filter-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (max-width: 640px) {
  .category-management-view__filters {
    grid-template-columns: 1fr;
  }
}
</style>
