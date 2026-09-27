<script setup>
/**
 * OrderListView — Buyer order list.
 *
 * BUYER-only: on mount, non-BUYER role redirects to /403.
 *
 * Fetches paginated orders from the backend with optional status / payment
 * method filters. Renders a responsive table (desktop) or card list (mobile).
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listOrders } from '@/services/orderService'
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  SUPPLIER_STATUS_TABS,
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
} from '@/utils/order'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatCurrency, formatDateTime } from '@/utils/format'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

// ── Role ──────────────────────────────────────────────────────────────────
// Support both `role` and `roleName` field shapes from auth store.
const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)

const isBuyer    = computed(() => role.value === 'BUYER')
const isSupplier = computed(() => role.value === 'SUPPLIER')

// ── Guard — only BUYER or SUPPLIER may access this view ───────────────────
onMounted(() => {
  if (role.value !== 'BUYER' && role.value !== 'SUPPLIER') {
    router.replace('/403')
  }
})

// ── Tabs ─────────────────────────────────────────────────────────────────
const BUYER_TABS = [
  { key: '',                    label: 'Tất cả' },
  { key: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
  { key: 'PAID',               label: 'Đã thanh toán' },
  { key: 'CONFIRMED',          label: 'Đang xử lý' },
  { key: 'COMPLETED',          label: 'Hoàn thành' },
  { key: 'CANCELLED',          label: 'Đã hủy' },
]

const tabs = computed(() => isBuyer.value ? BUYER_TABS : SUPPLIER_STATUS_TABS)

// ── Filters & pagination state ───────────────────────────────────────────
const filters = reactive({
  status: '',
  paymentMethod: '',
  paymentStatus: '',
  fromDate: '',
  toDate: '',
  page: 0,
  size: 10,
})

const orders = ref([])
const pageData = ref({
  pageNo: 0,
  pageSize: 0,
  totalElements: 0,
  totalPages: 0,
  last: true,
  first: true,
})
const loading = ref(false)
const error = ref(null)

// ── Load ─────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = null
  try {
    const params = {
      page: filters.page,
      size: filters.size,
      sort: 'createdAt,desc',
    }
    if (filters.status) params.status = filters.status
    if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod
    if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus
    // fromDate / toDate intentionally excluded from Phase 7 request
    // to keep scope tight — backend accepts them when wired in future phases

    const data = await listOrders(params)
    orders.value = data.content || []
    pageData.value = {
      pageNo: data.pageNo,
      pageSize: data.pageSize,
      totalElements: data.totalElements,
      totalPages: data.totalPages,
      last: data.last,
      first: data.first,
    }
  } catch (err) {
    const { message } = handleApiError(err)
    error.value = err
    toast.error(message)
  } finally {
    loading.value = false
  }
}

// ── Filter / tab actions ─────────────────────────────────────────────────
function selectTab(key) {
  filters.status = key
  filters.page = 0
  load()
}

function onFilterChange() {
  filters.page = 0
  load()
}

function resetFilters() {
  filters.status = ''
  filters.paymentMethod = ''
  filters.paymentStatus = ''
  filters.fromDate = ''
  filters.toDate = ''
  filters.page = 0
  load()
}

// ── Pagination ────────────────────────────────────────────────────────────
function goToPage(p) {
  if (p < 0 || p >= pageData.value.totalPages) return
  filters.page = p
  load()
}
</script>

<template>
  <div class="order-list-view">

    <!-- ── Header ───────────────────────────────────────────── -->
    <header class="order-list-view__header">
      <div>
        <h1 class="order-list-view__title">
          {{ isBuyer ? 'Đơn hàng của tôi' : 'Đơn hàng' }}
        </h1>
        <p class="order-list-view__subtitle">
          {{ isBuyer
              ? 'Theo dõi trạng thái đơn hàng bạn đã đặt.'
              : 'Theo dõi và xử lý đơn hàng thuộc công ty bạn.' }}
        </p>
      </div>
    </header>

    <!-- ── Tabs ─────────────────────────────────────────────── -->
    <nav class="order-list-view__tabs" aria-label="Lọc theo trạng thái">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="order-list-view__tab"
        :class="{ 'order-list-view__tab--active': filters.status === tab.key }"
        :aria-current="filters.status === tab.key ? 'page' : undefined"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- ── Filters ──────────────────────────────────────────── -->
    <section class="order-list-view__filters" aria-label="Bộ lọc">
      <BaseSelect
        v-model="filters.status"
        label="Trạng thái chi tiết"
        placeholder="Tất cả trạng thái"
        :options="ORDER_STATUS_OPTIONS"
        @update:modelValue="onFilterChange"
      />

      <BaseSelect
        v-model="filters.paymentMethod"
        label="Phương thức thanh toán"
        placeholder="Tất cả phương thức"
        :options="PAYMENT_METHOD_OPTIONS"
        @update:modelValue="onFilterChange"
      />

      <div class="order-list-view__date-range">
        <div class="order-list-view__date-field">
          <label class="order-list-view__date-label" for="fromDate">Từ ngày</label>
          <input
            id="fromDate"
            v-model="filters.fromDate"
            type="date"
            class="order-list-view__date-input"
          />
        </div>
        <div class="order-list-view__date-field">
          <label class="order-list-view__date-label" for="toDate">Đến ngày</label>
          <input
            id="toDate"
            v-model="filters.toDate"
            type="date"
            class="order-list-view__date-input"
          />
        </div>
      </div>

      <div class="order-list-view__filter-actions">
        <BaseButton variant="ghost" @click="resetFilters">Đặt lại</BaseButton>
      </div>
    </section>

    <!-- ── Loading (full blank) ─────────────────────────────── -->
    <div v-if="loading && orders.length === 0" class="order-list-view__state">
      <BaseLoading label="Đang tải đơn hàng..." />
    </div>

    <!-- ── Error (full blank) ───────────────────────────────── -->
    <div v-else-if="error && orders.length === 0" class="order-list-view__state">
      <BaseError
        title="Không tải được danh sách đơn hàng"
        :error="error"
        @retry="load"
      />
    </div>

    <!-- ── Empty ─────────────────────────────────────────────── -->
    <div v-else-if="orders.length === 0" class="order-list-view__state">
      <BaseEmpty
        :title="isBuyer ? 'Bạn chưa có đơn hàng nào.' : 'Chưa có đơn hàng nào.'"
        :description="isBuyer
          ? 'Hãy chọn sản phẩm và đặt đơn hàng đầu tiên.'
          : undefined"
      >
        <BaseButton
          v-if="isBuyer"
          variant="primary"
          @click="router.push('/products')"
        >
          Mua sắm
        </BaseButton>
      </BaseEmpty>
    </div>

    <!-- ── Re-render table with subtle loading overlay ───────── -->
    <template v-else>
      <!-- Desktop table (≥900px) -->
      <section class="order-list-view__table-wrap" aria-label="Danh sách đơn hàng">
        <table class="order-list-view__table">
          <thead>
            <tr>
              <th scope="col">Mã đơn</th>
              <th scope="col">Ngày tạo</th>
              <th scope="col">Tổng tiền</th>
              <th scope="col">Thanh toán</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in orders"
              :key="order.id"
              class="order-list-view__row"
              :aria-label="`Đơn hàng ${order.orderCode}`"
              role="listitem"
              tabindex="0"
              @click="router.push({ name: 'order-detail', params: { id: order.id } })"
              @keydown.enter="router.push({ name: 'order-detail', params: { id: order.id } })"
              @keydown.space.prevent="router.push({ name: 'order-detail', params: { id: order.id } })"
            >
              <td>
                <span class="order-list-view__order-code">{{ order.orderCode }}</span>
              </td>
              <td>{{ order.createdAt ? formatDateTime(order.createdAt) : '—' }}</td>
              <td>{{ order.totalAmount != null ? formatCurrency(order.totalAmount) : '—' }}</td>
              <td>{{ order.paymentMethod ? getPaymentMethodLabel(order.paymentMethod) : '—' }}</td>
              <td>
                <span
                  class="order-list-view__badge order-list-view__badge--{{ getOrderStatusTone(order.status) }}"
                >
                  {{ getOrderStatusLabel(order.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Mobile cards (<900px) -->
      <ul class="order-list-view__cards" aria-label="Danh sách đơn hàng" role="list">
        <li
          v-for="order in orders"
          :key="order.id"
          class="order-list-view__card"
          role="listitem"
        >
          <div
            class="order-list-view__card-row"
            role="button"
            tabindex="0"
            :aria-label="`Xem chi tiết đơn hàng ${order.orderCode}`"
            @click="router.push({ name: 'order-detail', params: { id: order.id } })"
            @keydown.enter="router.push({ name: 'order-detail', params: { id: order.id } })"
            @keydown.space.prevent="router.push({ name: 'order-detail', params: { id: order.id } })"
          >
            <div class="order-list-view__card-header">
              <span class="order-list-view__card-code">{{ order.orderCode }}</span>
              <span
                class="order-list-view__badge order-list-view__badge--{{ getOrderStatusTone(order.status) }}"
              >
                {{ getOrderStatusLabel(order.status) }}
              </span>
            </div>

            <div class="order-list-view__card-body">
              <div class="order-list-view__card-meta">
                <span>{{ order.createdAt ? formatDateTime(order.createdAt) : '—' }}</span>
                <span class="order-list-view__card-amount">
                  {{ order.totalAmount != null ? formatCurrency(order.totalAmount) : '—' }}
                </span>
              </div>
              <div v-if="order.paymentMethod" class="order-list-view__card-payment">
                {{ getPaymentMethodLabel(order.paymentMethod) }}
              </div>
            </div>

            <span class="order-list-view__card-link">Xem chi tiết →</span>
          </div>
        </li>
      </ul>

      <!-- Pagination -->
      <nav
        v-if="pageData.totalPages > 1"
        class="order-list-view__pagination"
        aria-label="Phân trang"
      >
        <button
          type="button"
          class="order-list-view__page-btn"
          :disabled="pageData.first"
          @click="goToPage(filters.page - 1)"
        >
          ← Trước
        </button>
        <span class="order-list-view__page-info">
          Trang <strong>{{ pageData.pageNo + 1 }}</strong> / {{ pageData.totalPages }}
        </span>
        <button
          type="button"
          class="order-list-view__page-btn"
          :disabled="pageData.last"
          @click="goToPage(filters.page + 1)"
        >
          Sau →
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
/* ── Layout container ─────────────────────────────────────── */
.order-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

/* ── Header ──────────────────────────────────────────────── */
.order-list-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.order-list-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.order-list-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

/* ── Tabs ─────────────────────────────────────────────────── */
.order-list-view__tabs {
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  padding-bottom: var(--space-1);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.order-list-view__tabs::-webkit-scrollbar {
  display: none;
}

.order-list-view__tab {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.order-list-view__tab:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.order-list-view__tab--active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.order-list-view__tab--active:hover {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: var(--color-text-inverse);
}

/* ── Filters ─────────────────────────────────────────────── */
.order-list-view__filters {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr auto;
  gap: var(--space-3);
  align-items: end;
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.order-list-view__date-range {
  display: flex;
  gap: var(--space-3);
}

.order-list-view__date-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.order-list-view__date-label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  user-select: none;
}

.order-list-view__date-input {
  height: 38px;
  padding: 0 var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-base);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.order-list-view__date-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.order-list-view__filter-actions {
  display: flex;
  align-items: flex-end;
}

/* ── State placeholders ───────────────────────────────────── */
.order-list-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Desktop table ───────────────────────────────────────── */
.order-list-view__table-wrap {
  overflow-x: auto;
}

.order-list-view__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.order-list-view__table thead {
  background: var(--color-surface-alt);
}

.order-list-view__table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.order-list-view__table td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  border-top: 1px solid var(--color-border);
}

.order-list-view__row {
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.order-list-view__row:hover {
  background-color: var(--color-surface-alt);
}

.order-list-view__row:focus {
  outline: none;
  background-color: var(--color-surface-alt);
}

.order-list-view__order-code {
  font-weight: var(--weight-semibold);
  color: var(--color-primary);
}

/* ── Mobile cards ─────────────────────────────────────────── */
.order-list-view__cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.order-list-view__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.order-list-view__card-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  cursor: pointer;
}

.order-list-view__card-row:focus {
  outline: none;
  background-color: var(--color-surface-alt);
}

.order-list-view__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.order-list-view__card-code {
  font-size: var(--font-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.order-list-view__card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.order-list-view__card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.order-list-view__card-amount {
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.order-list-view__card-payment {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.order-list-view__card-link {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-primary);
  margin-top: var(--space-1);
}

/* ── Status badges ───────────────────────────────────────── */
.order-list-view__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  line-height: 1.4;
  white-space: nowrap;
}

.order-list-view__badge--warning {
  background-color: var(--color-warning-bg, #fffbeb);
  color: var(--color-warning, #d97706);
}

.order-list-view__badge--info {
  background-color: var(--color-info-bg, #eff6ff);
  color: var(--color-info, #2563eb);
}

.order-list-view__badge--success {
  background-color: var(--color-success-bg, #f0fdf4);
  color: var(--color-success, #16a34a);
}

.order-list-view__badge--danger {
  background-color: var(--color-danger-bg, #fef2f2);
  color: var(--color-danger, #dc2626);
}

.order-list-view__badge--neutral {
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
}

/* ── Pagination ───────────────────────────────────────────── */
.order-list-view__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.order-list-view__page-btn {
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

.order-list-view__page-btn:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
}

.order-list-view__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.order-list-view__page-info {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.order-list-view__page-info strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 900px) {
  /* Hide desktop table on mobile */
  .order-list-view__table-wrap {
    display: none;
  }

  .order-list-view__filters {
    grid-template-columns: 1fr 1fr;
  }

  .order-list-view__date-range {
    grid-column: 1 / -1;
  }
}

@media (min-width: 901px) {
  /* Hide mobile cards on desktop */
  .order-list-view__cards {
    display: none;
  }
}

@media (max-width: 640px) {
  .order-list-view__filters {
    grid-template-columns: 1fr;
  }

  .order-list-view__filter-actions {
    grid-column: 1;
    justify-content: flex-end;
  }
}
</style>
