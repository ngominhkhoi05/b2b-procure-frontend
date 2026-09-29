<script setup>
/**
 * OrderDetailView — role-aware order detail page.
 *
 * Supports BUYER, SUPPLIER, and ADMIN (read-only). The same view is used
 * for all three roles; the load function picks the right endpoint based
 * on the authenticated principal, and the template hides buyer/supplier
 * mutation actions for ADMIN.
 *
 *   BUYER    → /api/v1/orders/{id}        (cancel action allowed)
 *   SUPPLIER → /api/v1/orders/{id}        (lifecycle actions allowed)
 *   ADMIN    → /api/v1/admin/orders/{id}  (read-only, both parties shown)
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_TONE,
  canCancelOrder,
  isRefundRelevant,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusTone,
  SUPPLIER_AVAILABLE_ACTIONS,
  getAvailableSupplierActions,
} from '@/utils/order'
import {
  getOrderById,
  getOrderHistory,
  cancelOrder,
  confirmSupplierOrder,
  rejectSupplierOrder,
  markOrderPreparing,
  markOrderShipping,
  completeSupplierOrder,
  getAdminOrderById,
} from '@/services/orderService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatCurrency, formatDateTime, formatDate, formatNumber } from '@/utils/format'

import BaseButton    from '@/components/common/BaseButton.vue'
import BaseModal     from '@/components/common/BaseModal.vue'
import BaseLoading   from '@/components/common/BaseLoading.vue'
import BaseEmpty     from '@/components/common/BaseEmpty.vue'
import BaseError     from '@/components/common/BaseError.vue'

const route = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const toast  = useToastStore()

// ── State ─────────────────────────────────────────────────────────────────────

const order           = ref(null)
const history         = ref([])
const historyError    = ref(null)
const loading         = ref(true)
const error           = ref(null)

const showCancelModal = ref(false)
const cancelReason    = ref('')
const cancelSubmitting = ref(false)

const showRejectModal  = ref(false)
const rejectReason     = ref('')
const rejectSubmitting = ref(false)

const actionSubmitting = ref('')

// ── Role guard ────────────────────────────────────────────────────────────────

const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)
const isBuyer    = computed(() => role.value === 'BUYER')
const isSupplier = computed(() => role.value === 'SUPPLIER')
const isAdmin    = computed(() => role.value === 'ADMIN')

onMounted(() => {
  if (!isBuyer.value && !isSupplier.value && !isAdmin.value) {
    router.replace('/403')
    return
  }
  load()
})

// Reload when route param changes (SPA navigation between order details)
watch(
  () => route.params.id,
  () => {
    if (!isBuyer.value && !isSupplier.value && !isAdmin.value) return
    load()
  }
)

// ── Data load ─────────────────────────────────────────────────────────────────

async function load() {
  loading.value    = true
  error.value      = null
  historyError.value = null

  try {
    const orderId = Number(route.params.id)

    const [orderData, historyData] = await Promise.all([
      isAdmin.value
        ? getAdminOrderById(orderId)
        : getOrderById(orderId),
      getOrderHistory(orderId).catch((err) => {
        historyError.value = err
        toast.warning('Không thể tải lịch sử trạng thái. Vui lòng thử lại sau.')
        return []
      }),
    ])

    order.value = orderData

    // Prefer the more-populated history source; fall back to the one embedded
    // in the order response.
    if ((historyData && historyData.length > 0) || !orderData.statusHistory?.length) {
      history.value = historyData || []
    } else {
      history.value = orderData.statusHistory || []
    }
  } catch (err) {
    error.value = err
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    loading.value = false
  }
}

// ── Computed helpers ───────────────────────────────────────────────────────────

const canCancel = computed(() =>
  order.value && canCancelOrder(order.value.status)
)

const showRefund = computed(() =>
  order.value?.payment && isRefundRelevant(order.value.payment.paymentStatus)
)

const refundTone = computed(() =>
  getPaymentStatusTone(order.value?.payment?.paymentStatus)
)

const refundMessage = computed(() => {
  if (order.value?.payment?.paymentStatus === 'REFUND_PENDING') {
    return 'Đơn hàng này đang chờ hoàn tiền.'
  }
  if (order.value?.payment?.paymentStatus === 'REFUNDED') {
    return 'Đơn hàng này đã được hoàn tiền.'
  }
  return ''
})

// ── Cancel ────────────────────────────────────────────────────────────────────

function openCancelModal() {
  cancelReason.value    = ''
  showCancelModal.value = true
}

function closeCancelModal() {
  showCancelModal.value = false
  cancelReason.value    = ''
}

async function submitCancel() {
  const reason = cancelReason.value.trim()
  if (!reason) return
  cancelSubmitting.value = true
  try {
    await cancelOrder(order.value.id, { reason })
    toast.success('Đã hủy đơn hàng.')
    showCancelModal.value = false
    cancelReason.value    = ''
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    cancelSubmitting.value = false
  }
}

const cancelDisabled = computed(
  () => cancelSubmitting.value || !cancelReason.value.trim()
)

const availableActions = computed(() =>
  order.value
    ? getAvailableSupplierActions(order.value.status, {
        paymentMethod: order.value.payment?.paymentMethod ?? null,
      })
    : []
)

async function runSupplierAction(action) {
  if (actionSubmitting.value) return

  if (action.key === 'reject') {
    rejectReason.value = ''
    showRejectModal.value = true
    return
  }

  actionSubmitting.value = action.key
  try {
    if (action.key === 'confirm')   await confirmSupplierOrder(order.value.id)
    if (action.key === 'preparing') await markOrderPreparing(order.value.id)
    if (action.key === 'shipping')  await markOrderShipping(order.value.id)
    if (action.key === 'complete')  await completeSupplierOrder(order.value.id)

    toast.success(`Đã cập nhật trạng thái đơn hàng.`)
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
    await load()
  } finally {
    actionSubmitting.value = ''
  }
}

async function submitReject() {
  const reason = rejectReason.value.trim()
  if (!reason) return
  rejectSubmitting.value = true
  try {
    await rejectSupplierOrder(order.value.id, { reason })
    toast.success('Đã từ chối đơn hàng.')
    showRejectModal.value = false
    rejectReason.value = ''
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
    await load()
  } finally {
    rejectSubmitting.value = false
  }
}

const rejectDisabled = computed(
  () => rejectSubmitting.value || !rejectReason.value.trim()
)

// ── Image error handler ───────────────────────────────────────────────────────

function onImgError(e) {
  e.target.style.display = 'none'
  e.target.closest('.order-detail-view__item-img-wrap')?.classList.add('order-detail-view__item-img-wrap--hidden')
}

// ── Status badge class ────────────────────────────────────────────────────────

function badgeClass(status, toneMap) {
  const tone = toneMap[status] ?? 'neutral'
  return `badge badge--${tone}`
}
</script>

<template>
  <div class="order-detail-view">
    <div class="order-detail-view__container">

      <!-- Loading -->
      <div v-if="loading" class="order-detail-view__state">
        <BaseLoading label="Đang tải chi tiết đơn hàng..." />
      </div>

      <!-- Error / not found -->
      <div v-else-if="error" class="order-detail-view__state">
        <BaseError
          title="Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập"
          :error="error"
        >
          <template #actions>
            <BaseButton variant="ghost" @click="router.push({ name: 'orders' })">
              ← Quay lại danh sách
            </BaseButton>
          </template>
        </BaseError>
      </div>

      <!-- Order content -->
      <template v-else-if="order">

        <!-- ── Header card ─────────────────────────────────────── -->
        <header class="order-detail-view__header-card">
          <nav class="order-detail-view__back-nav">
            <button
              type="button"
              class="order-detail-view__back-btn"
              @click="router.push({ name: 'orders' })"
            >
              ← Quay lại danh sách
            </button>
          </nav>

          <div class="order-detail-view__header-main">
            <div class="order-detail-view__header-left">
              <span class="order-detail-view__order-code">{{ order.orderCode }}</span>
              <span :class="badgeClass(order.status, ORDER_STATUS_TONE)">
                {{ order.status }}
              </span>
            </div>
            <div class="order-detail-view__header-right">
              <BaseButton
                v-if="isBuyer && canCancel"
                variant="danger"
                @click="openCancelModal"
              >
                Hủy đơn hàng
              </BaseButton>
            </div>
          </div>
        </header>

        <!-- ── Admin read-only notice ─────────────────────────── -->
        <section v-if="isAdmin" class="order-detail-view__readonly-banner" role="status">
          <span class="order-detail-view__readonly-dot" aria-hidden="true" />
          <p class="order-detail-view__readonly-text">
            <strong>Chế độ xem.</strong>
            Admin chỉ có quyền truy cập đọc. Mọi thao tác thay đổi trạng thái đơn hàng
            thuộc về Buyer hoặc Supplier.
          </p>
        </section>

        <!-- ── Thông tin đơn hàng ─────────────────────────────── -->
        <section class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Thông tin đơn hàng</h2>
          <dl class="order-detail-view__dl order-detail-view__dl--2col">
            <div class="order-detail-view__dl-row">
              <dt>Mã đơn</dt>
              <dd>{{ order.orderCode }}</dd>
            </div>
            <div class="order-detail-view__dl-row">
              <dt>Ngày tạo</dt>
              <dd>{{ order.createdAt ? formatDateTime(order.createdAt) : '—' }}</dd>
            </div>
            <div class="order-detail-view__dl-row">
              <dt>Cập nhật</dt>
              <dd>{{ order.updatedAt ? formatDateTime(order.updatedAt) : '—' }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── Nhà cung cấp (BUYER + ADMIN) ────────────────────── -->
        <section v-if="isBuyer || isAdmin" class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Nhà cung cấp</h2>
          <p class="order-detail-view__plain-text">
            {{ order.supplierCompanyName || '—' }}
          </p>
        </section>

        <!-- ── Khách hàng (SUPPLIER + ADMIN) ───────────────────── -->
        <section v-if="isSupplier || isAdmin" class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Khách hàng</h2>
          <dl class="order-detail-view__dl">
            <div class="order-detail-view__dl-row">
              <dt>Tên công ty</dt>
              <dd>{{ order.buyerCompanyName || '—' }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── Thông tin giao hàng ───────────────────────────── -->
        <section class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Thông tin giao hàng</h2>
          <dl class="order-detail-view__dl">
            <div class="order-detail-view__dl-row">
              <dt>Tên người nhận</dt>
              <dd>{{ order.shippingCompanyName || '—' }}</dd>
            </div>
            <div class="order-detail-view__dl-row">
              <dt>Số điện thoại</dt>
              <dd>{{ order.shippingPhone || '—' }}</dd>
            </div>
            <div class="order-detail-view__dl-row">
              <dt>Địa chỉ giao hàng</dt>
              <dd>{{ order.shippingAddress || '—' }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── Sản phẩm ──────────────────────────────────────── -->
        <section class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Sản phẩm</h2>
          <ul class="order-detail-view__items">
            <li
              v-for="item in order.items"
              :key="item.id"
              class="order-detail-view__item"
            >
              <!-- Product image -->
              <div class="order-detail-view__item-img-wrap">
                <img
                  v-if="item.productImageUrl"
                  :src="item.productImageUrl"
                  :alt="item.productName"
                  class="order-detail-view__item-img"
                  @error="onImgError"
                />
              </div>

              <!-- Product info -->
              <div class="order-detail-view__item-info">
                <span class="order-detail-view__item-name">{{ item.productName }}</span>
                <span class="order-detail-view__item-price">
                  {{ formatCurrency(item.unitPrice) }} × {{ item.quantity }}
                </span>
              </div>

              <!-- Subtotal -->
              <div class="order-detail-view__item-subtotal">
                {{ formatCurrency(item.subtotal) }}
              </div>
            </li>
          </ul>
        </section>

        <!-- ── Thanh toán ────────────────────────────────────── -->
        <section class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Thanh toán</h2>
          <dl class="order-detail-view__pricing">

            <div class="order-detail-view__pricing-row">
              <dt>Tạm tính</dt>
              <dd>{{ formatCurrency(order.subtotal) }}</dd>
            </div>

            <template v-if="order.commissionRate != null && order.commissionAmount != null">
              <div class="order-detail-view__pricing-row">
                <dt>Hoa hồng</dt>
                <dd>{{ formatNumber(order.commissionRate) }}%</dd>
              </div>
              <div class="order-detail-view__pricing-row">
                <dt>Số tiền hoa hồng</dt>
                <dd>{{ formatCurrency(order.commissionAmount) }}</dd>
              </div>
            </template>

            <div
              v-if="order.commissionRate == null && order.commissionAmount == null"
              class="order-detail-view__commission-note"
            >
              Hoa hồng sẽ được tính khi đơn hoàn thành.
            </div>

            <div class="order-detail-view__pricing-row order-detail-view__pricing-row--total">
              <dt>Tổng cộng</dt>
              <dd>{{ formatCurrency(order.totalAmount) }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── Phương thức thanh toán ─────────────────────────── -->
        <section class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Phương thức thanh toán</h2>
          <dl class="order-detail-view__dl">
            <div class="order-detail-view__dl-row">
              <dt>Phương thức</dt>
              <dd>{{ order.payment?.paymentMethod ? getPaymentMethodLabel(order.payment.paymentMethod) : '—' }}</dd>
            </div>
            <div class="order-detail-view__dl-row">
              <dt>Trạng thái</dt>
              <dd>
                <span
                  v-if="order.payment?.paymentStatus"
                  :class="badgeClass(order.payment.paymentStatus, PAYMENT_STATUS_TONE)"
                >
                  {{ getPaymentStatusLabel(order.payment.paymentStatus) }}
                </span>
                <span v-else>—</span>
              </dd>
            </div>
            <div class="order-detail-view__dl-row">
              <dt>Số tiền</dt>
              <dd>{{ order.payment?.amount != null ? formatCurrency(order.payment.amount) : '—' }}</dd>
            </div>
            <div class="order-detail-view__dl-row">
              <dt>Thời gian thanh toán</dt>
              <dd>{{ order.payment?.paidAt ? formatDateTime(order.payment.paidAt) : '—' }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── Hoàn tiền ─────────────────────────────────────── -->
        <section
          v-if="showRefund"
          class="order-detail-view__section order-detail-view__refund-section"
          :class="`order-detail-view__refund-section--${refundTone}`"
        >
          <div class="order-detail-view__refund-inner">
            <span
              v-if="order.payment?.paymentStatus"
              :class="badgeClass(order.payment.paymentStatus, PAYMENT_STATUS_TONE)"
            >
              {{ getPaymentStatusLabel(order.payment.paymentStatus) }}
            </span>
            <p class="order-detail-view__refund-message">{{ refundMessage }}</p>
            <p v-if="order.payment?.amount != null" class="order-detail-view__refund-amount">
              Số tiền hoàn: <strong>{{ formatCurrency(order.payment.amount) }}</strong>
            </p>
          </div>
        </section>

        <!-- ── Lịch sử trạng thái ───────────────────────────── -->
        <section class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Lịch sử trạng thái</h2>

          <!-- Error state -->
          <BaseEmpty
            v-if="history.length === 0 && historyError"
            description="Không thể tải lịch sử trạng thái."
          />

          <!-- Empty state -->
          <BaseEmpty
            v-else-if="history.length === 0 && !historyError"
            description="Chưa có lịch sử trạng thái."
          />

          <!-- Timeline -->
          <ol v-else class="order-detail-view__timeline">
            <li
              v-for="(entry, index) in history"
              :key="entry.id"
              class="order-detail-view__timeline-entry"
            >
              <!-- Connector line above (hidden for first item via CSS) -->
              <div class="order-detail-view__timeline-connector" aria-hidden="true" />

              <!-- Dot -->
              <div class="order-detail-view__timeline-dot" aria-hidden="true" />

              <!-- Content -->
              <div class="order-detail-view__timeline-body">
                <div class="order-detail-view__timeline-meta">
                  <span :class="badgeClass(entry.status, ORDER_STATUS_TONE)">
                    {{ entry.status }}
                  </span>
                  <time class="order-detail-view__timeline-time">
                    {{ entry.createdAt ? formatDateTime(entry.createdAt) : '—' }}
                  </time>
                </div>
                <p
                  v-if="entry.note"
                  class="order-detail-view__timeline-note"
                >{{ entry.note }}</p>
              </div>
            </li>
          </ol>
        </section>

        <!-- ── Thao tác đơn hàng (SUPPLIER only) ──────────────── -->
        <section v-if="isSupplier && availableActions.length > 0" class="order-detail-view__section">
          <h2 class="order-detail-view__section-title">Thao tác đơn hàng</h2>
          <div class="order-detail-view__actions-list">
            <BaseButton
              v-for="action in availableActions"
              :key="action.key"
              :variant="action.variant === 'danger' ? 'danger' : 'primary'"
              block
              :disabled="actionSubmitting !== ''"
              @click="runSupplierAction(action)"
            >
              {{ action.label }}
            </BaseButton>
          </div>
        </section>

        <!-- ── Cancel modal (BUYER) ───────────────────────────── -->
        <BaseModal
          v-if="showCancelModal"
          :model-value="showCancelModal"
          title="Xác nhận hủy đơn hàng"
          @update:model-value="closeCancelModal"
        >
          <p class="order-detail-view__cancel-desc">
            Vui lòng nhập lý do hủy đơn hàng (bắt buộc).
          </p>
          <textarea
            v-model="cancelReason"
            class="order-detail-view__textarea"
            placeholder="Ví dụ: Tôi đã đặt nhầm sản phẩm..."
            rows="4"
            maxlength="500"
            :disabled="cancelSubmitting"
          />
          <p class="order-detail-view__char-count">
            {{ cancelReason.length }} / 500
          </p>

          <template #footer>
            <BaseButton
              variant="ghost"
              :disabled="cancelSubmitting"
              @click="closeCancelModal"
            >
              Quay lại
            </BaseButton>
            <BaseButton
              variant="danger"
              :disabled="cancelDisabled"
              :loading="cancelSubmitting"
              @click="submitCancel"
            >
              Xác nhận hủy
            </BaseButton>
          </template>
        </BaseModal>

        <!-- ── Supplier reject modal ─────────────────────────── -->
        <BaseModal
          v-if="showRejectModal"
          :model-value="showRejectModal"
          title="Từ chối đơn hàng"
          @update:model-value="showRejectModal = false"
        >
          <p class="order-detail-view__modal-hint">
            Vui lòng nhập lý do từ chối. Lý do sẽ được lưu vào lịch sử đơn hàng.
          </p>
          <textarea
            v-model="rejectReason"
            class="order-detail-view__textarea"
            rows="4"
            maxlength="500"
            placeholder="Ví dụ: Sản phẩm tạm thời hết hàng..."
            :disabled="rejectSubmitting"
          />
          <div class="order-detail-view__char-count">
            {{ rejectReason.length }} / 500
          </div>

          <template #footer>
            <BaseButton variant="secondary" :disabled="rejectSubmitting" @click="showRejectModal = false">
              Hủy
            </BaseButton>
            <BaseButton variant="danger" :disabled="rejectDisabled" :loading="rejectSubmitting" @click="submitReject">
              Xác nhận từ chối
            </BaseButton>
          </template>
        </BaseModal>

      </template>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────── */

.order-detail-view {
  width: 100%;
}

.order-detail-view__container {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.order-detail-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Section ────────────────────────────────────────────────── */

.order-detail-view__section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.order-detail-view__section-title {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

/* ── Header card ────────────────────────────────────────────── */

.order-detail-view__header-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── Read-only notice (ADMIN) ────────────────────────── */
.order-detail-view__readonly-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background-color: var(--color-info-bg, #eff6ff);
  color: var(--color-info, #1e40af);
  border: 1px solid var(--color-info, #2563eb);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
}

.order-detail-view__readonly-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-info, #2563eb);
  flex-shrink: 0;
}

.order-detail-view__readonly-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-info, #1e40af);
}

.order-detail-view__readonly-text strong {
  font-weight: var(--weight-semibold);
}

.order-detail-view__back-nav {
  font-size: var(--font-sm);
}

.order-detail-view__back-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-weight: var(--weight-medium);
  cursor: pointer;
  font-size: inherit;
}

.order-detail-view__back-btn:hover {
  text-decoration: underline;
}

.order-detail-view__header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.order-detail-view__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.order-detail-view__order-code {
  font-size: var(--font-xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.order-detail-view__header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* ── Description list ────────────────────────────────────────── */

.order-detail-view__dl {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.order-detail-view__dl--2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2) var(--space-6);
}

.order-detail-view__dl-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-4);
  font-size: var(--font-sm);
}

.order-detail-view__dl-row dt {
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
  flex-shrink: 0;
}

.order-detail-view__dl-row dd {
  color: var(--color-text-primary);
  text-align: right;
  word-break: break-word;
}

/* ── Plain text ──────────────────────────────────────────────── */

.order-detail-view__plain-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

/* ── Items list ──────────────────────────────────────────────── */

.order-detail-view__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.order-detail-view__item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.order-detail-view__item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.order-detail-view__item-img-wrap {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-alt);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.order-detail-view__item-img-wrap--hidden {
  display: none;
}

.order-detail-view__item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-detail-view__item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-detail-view__item-name {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-detail-view__item-price {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.order-detail-view__item-subtotal {
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
}

/* ── Pricing ─────────────────────────────────────────────────── */

.order-detail-view__pricing {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.order-detail-view__pricing-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--font-sm);
}

.order-detail-view__pricing-row dt {
  color: var(--color-text-muted);
}

.order-detail-view__pricing-row dd {
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}

.order-detail-view__pricing-row--total {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-1);
}

.order-detail-view__pricing-row--total dt,
.order-detail-view__pricing-row--total dd {
  font-size: var(--font-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.order-detail-view__commission-note {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: var(--space-1) 0;
}

/* ── Refund banner ──────────────────────────────────────────── */

.order-detail-view__refund-section {
  padding: var(--space-4);
}

.order-detail-view__refund-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.order-detail-view__refund-message {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.order-detail-view__refund-amount {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  width: 100%;
}

.order-detail-view__refund-amount strong {
  color: var(--color-text-primary);
}

/* ── Timeline ────────────────────────────────────────────────── */

.order-detail-view__timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.order-detail-view__timeline-entry {
  position: relative;
  display: flex;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
}

/* Hide connector for the very first (oldest) entry */
.order-detail-view__timeline-entry:first-child .order-detail-view__timeline-connector {
  display: none;
}

/* Timeline spine */
.order-detail-view__timeline-connector {
  position: absolute;
  left: 7px;
  top: -16px;
  width: 2px;
  height: 16px;
  background-color: var(--color-border);
}

.order-detail-view__timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background-color: var(--color-border-strong);
  flex-shrink: 0;
  margin-top: 3px;
  position: relative;
  z-index: 1;
}

.order-detail-view__timeline-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.order-detail-view__timeline-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.order-detail-view__timeline-time {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.order-detail-view__timeline-note {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Badges ─────────────────────────────────────────────────── */

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.01em;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge--warning {
  background-color: #fef3c7;
  color: #92400e;
}

.badge--info {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge--success {
  background-color: #d1fae5;
  color: #065f46;
}

.badge--danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.badge--neutral {
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
}

/* ── Cancel modal ───────────────────────────────────────────── */

.order-detail-view__cancel-desc {
  margin: 0 0 var(--space-3);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.order-detail-view__modal-hint {
  margin: 0 0 var(--space-3);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.order-detail-view__actions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.order-detail-view__textarea {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-family: inherit;
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  resize: vertical;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.order-detail-view__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.order-detail-view__textarea::placeholder {
  color: var(--color-text-muted);
}

.order-detail-view__textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.order-detail-view__char-count {
  margin: var(--space-1) 0 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  text-align: right;
}

/* ── Responsive ─────────────────────────────────────────────── */

@media (max-width: 640px) {
  .order-detail-view__dl--2col {
    grid-template-columns: 1fr;
  }

  .order-detail-view__header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .order-detail-view__order-code {
    font-size: var(--font-lg);
  }

  .order-detail-view__item {
    gap: var(--space-3);
  }
}
</style>
