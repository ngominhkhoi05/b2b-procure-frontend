<script setup>
/**
 * ProductListView — role-aware product listing.
 *
 * BUYER  → card grid of ACTIVE products (read-only, click → detail).
 * SUPPLIER → table of own products with edit / status actions.
 * ADMIN  → table of all products with create / edit / status actions + filters.
 *
 * Pagination is server-driven (page / size / sort). Filters preserved on page change.
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listProducts } from '@/services/productService'
import { listCategories } from '@/services/categoryService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatCurrency } from '@/utils/format'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'

import ProductCard from '@/components/product/ProductCard.vue'
import ProductTable from '@/components/product/ProductTable.vue'
import ProductStatusBadge from '@/components/product/ProductStatusBadge.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)

// ── Filters & pagination ─────────────────────────────────────────────────
const filters = reactive({
  keyword: '',
  categoryId: null,
  status: '',
  page: 0,
  size: 12,
})

const products = ref([])
const pageData = ref({ pageNo: 0, pageSize: 0, totalElements: 0, totalPages: 0, last: true, first: true })
const loading = ref(false)
const error = ref(null)

const categories = ref([])
const categoriesLoading = ref(false)

// For BUYER price summaries, we fetch prices per product on demand to avoid a separate call upfront.
// For simplicity we only show "Liên hệ" on cards when we don't have tiers pre-fetched.
const productPriceMap = ref({}) // { [productId]: { from, to, count } }

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

const categoryOptions = computed(() => [
  { value: '', label: 'Tất cả danh mục' },
  ...categories.value.map((c) => ({ value: c.id, label: c.name })),
])

const isBuyer = computed(() => role.value === 'BUYER')
const isSupplier = computed(() => role.value === 'SUPPLIER')
const isAdmin = computed(() => role.value === 'ADMIN')

// ── Loaders ──────────────────────────────────────────────────────────────
async function loadCategories() {
  categoriesLoading.value = true
  try {
    const page = await listCategories({ size: 200, sort: 'name,asc' })
    categories.value = page.content || []
  } catch (err) {
    // Non-blocking — categories are optional in the filter UI
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

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
    if (filters.categoryId) params.categoryId = filters.categoryId
    if (isAdmin.value && filters.status) params.status = filters.status

    const data = await listProducts(params)
    products.value = data.content || []
    pageData.value = {
      pageNo: data.pageNo,
      pageSize: data.pageSize,
      totalElements: data.totalElements,
      totalPages: data.totalPages,
      last: data.last,
      first: data.first,
    }

    // Fetch price summaries for BUYER cards (best-effort, do not block listing)
    if (isBuyer.value && products.value.length > 0) {
      await loadBuyerPriceSummaries()
    } else {
      productPriceMap.value = {}
    }
  } catch (err) {
    const { message } = handleApiError(err)
    error.value = err
    toast.error(message)
  } finally {
    loading.value = false
  }
}

async function loadBuyerPriceSummaries() {
  const { listProductPrices } = await import('@/services/productService')
  const map = {}
  // Run in parallel; tolerate failures silently
  await Promise.all(
    products.value.map(async (p) => {
      try {
        const tiers = await listProductPrices(p.id)
        if (Array.isArray(tiers) && tiers.length > 0) {
          const sorted = [...tiers].sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice))
          map[p.id] = {
            from: sorted[0].unitPrice,
            to: sorted[sorted.length - 1].unitPrice,
            count: tiers.length,
          }
        }
      } catch {
        // ignore — leave card without price summary
      }
    })
  )
  productPriceMap.value = map
}

function goToPage(p) {
  if (p < 0 || p >= pageData.value.totalPages) return
  filters.page = p
}

function resetAndReload() {
  filters.page = 0
  load()
}

function onSearch() {
  resetAndReload()
}

function clearSearch() {
  filters.keyword = ''
  resetAndReload()
}

function onFilterChange() {
  resetAndReload()
}

function openProduct(p) {
  router.push({ name: 'product-detail', params: { id: p.id } })
}

function gotoCreate() {
  router.push({ name: 'product-new' })
}

function gotoEdit(p) {
  router.push({ name: 'product-edit', params: { id: p.id } })
}

// Status change via modal
const showStatusModal = ref(false)
const statusTarget = ref(null)
const statusDraft = ref('')
const statusSubmitting = ref(false)

function openStatusModal(p) {
  statusTarget.value = p
  statusDraft.value = p.status || 'ACTIVE'
  showStatusModal.value = true
}

async function submitStatusChange() {
  if (!statusTarget.value) return
  statusSubmitting.value = true
  try {
    const { updateProductStatus } = await import('@/services/productService')
    await updateProductStatus(statusTarget.value.id, statusDraft.value)
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

// ── Lifecycle ────────────────────────────────────────────────────────────
onMounted(() => {
  loadCategories()
  load()
})

// Reset page when role changes (very rare)
watch(role, () => {
  filters.page = 0
})
</script>

<template>
  <div class="product-list-view">
    <!-- Header -->
    <header class="product-list-view__header">
      <div>
        <h1 class="product-list-view__title">Sản phẩm</h1>
        <p class="product-list-view__subtitle">
          <template v-if="isBuyer">Danh mục sản phẩm đang kinh doanh</template>
          <template v-else-if="isSupplier">Sản phẩm của công ty bạn</template>
          <template v-else>Tất cả sản phẩm trong hệ thống</template>
        </p>
      </div>
      <div class="product-list-view__actions">
        <BaseButton
          v-if="isAdmin || isSupplier"
          variant="primary"
          @click="gotoCreate"
        >
          Thêm sản phẩm
        </BaseButton>
      </div>
    </header>

    <!-- Filters -->
    <section class="product-list-view__filters">
      <div class="product-list-view__search">
        <BaseInput
          v-model="filters.keyword"
          label="Từ khóa"
          placeholder="Tên sản phẩm, SKU, mô tả..."
          @keyup.enter="onSearch"
        />
      </div>

      <BaseSelect
        v-model="filters.categoryId"
        label="Danh mục"
        placeholder="Tất cả danh mục"
        :options="categoryOptions"
        :disabled="categoriesLoading"
        @update:modelValue="onFilterChange"
      />

      <BaseSelect
        v-if="isAdmin"
        v-model="filters.status"
        label="Trạng thái"
        :options="statusOptions"
        @update:modelValue="onFilterChange"
      />

      <div class="product-list-view__filter-actions">
        <BaseButton variant="primary" @click="onSearch">Tìm kiếm</BaseButton>
        <BaseButton variant="ghost" @click="clearSearch">Đặt lại</BaseButton>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading && products.length === 0" class="product-list-view__state">
      <BaseLoading label="Đang tải sản phẩm..." />
    </div>

    <!-- Error -->
    <div v-else-if="error && products.length === 0" class="product-list-view__state">
      <BaseError
        title="Không tải được danh sách sản phẩm"
        :error="error"
        @retry="load"
      />
    </div>

    <!-- Empty -->
    <div v-else-if="products.length === 0" class="product-list-view__state">
      <BaseEmpty
        title="Chưa có sản phẩm nào"
        description="Thử thay đổi bộ lọc hoặc thêm sản phẩm mới."
      >
        <BaseButton
          v-if="isAdmin || isSupplier"
          variant="primary"
          @click="gotoCreate"
        >
          Thêm sản phẩm
        </BaseButton>
      </BaseEmpty>
    </div>

    <!-- Buyer: card grid -->
    <section
      v-else-if="isBuyer"
      class="product-list-view__grid"
      aria-label="Danh sách sản phẩm"
    >
      <ProductCard
        v-for="p in products"
        :key="p.id"
        :product="p"
        :price-from="productPriceMap[p.id]?.from ?? null"
        :price-to="productPriceMap[p.id]?.to ?? null"
        :tier-count="productPriceMap[p.id]?.count ?? 0"
        @click="openProduct"
      />
    </section>

    <!-- Admin / Supplier: table -->
    <section v-else class="product-list-view__table-wrap" aria-label="Danh sách sản phẩm">
      <ProductTable :products="products" :loading="loading" @row-click="openProduct">
        <template #actions="{ product }">
          <button
            type="button"
            class="product-list-view__row-action product-list-view__row-action--view"
            @click.stop="openProduct(product)"
          >
            Xem
          </button>
          <button
            type="button"
            class="product-list-view__row-action product-list-view__row-action--edit"
            @click.stop="gotoEdit(product)"
          >
            Sửa
          </button>
          <button
            type="button"
            class="product-list-view__row-action product-list-view__row-action--status"
            @click.stop="openStatusModal(product)"
          >
            Đổi trạng thái
          </button>
        </template>
      </ProductTable>
    </section>

    <!-- Pagination -->
    <nav
      v-if="!loading && products.length > 0 && pageData.totalPages > 1"
      class="product-list-view__pagination"
      aria-label="Phân trang"
    >
      <button
        type="button"
        class="product-list-view__page-btn"
        :disabled="pageData.first"
        @click="goToPage(filters.page - 1)"
      >
        ← Trước
      </button>
      <span class="product-list-view__page-info">
        Trang <strong>{{ pageData.pageNo + 1 }}</strong> / {{ pageData.totalPages }}
        <span class="product-list-view__page-total">
          ({{ pageData.totalElements }} sản phẩm)
        </span>
      </span>
      <button
        type="button"
        class="product-list-view__page-btn"
        :disabled="pageData.last"
        @click="goToPage(filters.page + 1)"
      >
        Sau →
      </button>
    </nav>

    <!-- Status change modal -->
    <BaseModal
      v-model="showStatusModal"
      title="Đổi trạng thái sản phẩm"
      size="sm"
    >
      <div class="product-list-view__status-modal">
        <p class="product-list-view__status-modal-text">
          Sản phẩm: <strong>{{ statusTarget?.name }}</strong>
        </p>
        <p class="product-list-view__status-modal-text">
          Trạng thái hiện tại: <ProductStatusBadge :status="statusTarget?.status" />
        </p>
        <BaseSelect
          v-model="statusDraft"
          label="Trạng thái mới"
          :options="[
            { value: 'ACTIVE', label: 'ACTIVE — Đang kinh doanh' },
            { value: 'INACTIVE', label: 'INACTIVE — Ngừng kinh doanh' },
          ]"
        />
      </div>
      <template #footer>
        <button
          type="button"
          class="product-list-view__modal-btn product-list-view__modal-btn--ghost"
          :disabled="statusSubmitting"
          @click="showStatusModal = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="product-list-view__modal-btn product-list-view__modal-btn--primary"
          :disabled="statusSubmitting"
          @click="submitStatusChange"
        >
          <span v-if="statusSubmitting" class="product-list-view__spinner" aria-hidden="true" />
          Cập nhật
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.product-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.product-list-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.product-list-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.product-list-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.product-list-view__actions {
  display: flex;
  gap: var(--space-3);
}

.product-list-view__filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: var(--space-3);
  align-items: end;
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.product-list-view__search {
  min-width: 0;
}

.product-list-view__filter-actions {
  display: flex;
  gap: var(--space-2);
}

.product-list-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.product-list-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.product-list-view__table-wrap {
  overflow-x: auto;
}

.product-list-view__row-action {
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

.product-list-view__row-action:first-child {
  margin-left: 0;
}

.product-list-view__row-action:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.product-list-view__row-action--view {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.product-list-view__row-action--edit {
  color: var(--color-warning, #D97706);
  border-color: var(--color-warning, #D97706);
}

.product-list-view__row-action--status {
  color: var(--color-text-secondary);
}

.product-list-view__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.product-list-view__page-btn {
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

.product-list-view__page-btn:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
}

.product-list-view__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.product-list-view__page-info {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.product-list-view__page-info strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}

.product-list-view__page-total {
  margin-left: var(--space-2);
  color: var(--color-text-muted);
}

.product-list-view__status-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.product-list-view__status-modal-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.product-list-view__status-modal-text strong {
  color: var(--color-text-primary);
}

.product-list-view__modal-btn {
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

.product-list-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-list-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.product-list-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.product-list-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.product-list-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.product-list-view__spinner {
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

@media (max-width: 900px) {
  .product-list-view__filters {
    grid-template-columns: 1fr 1fr;
  }

  .product-list-view__filter-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (max-width: 640px) {
  .product-list-view__filters {
    grid-template-columns: 1fr;
  }
}
</style>
