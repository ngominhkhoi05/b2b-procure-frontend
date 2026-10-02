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
  canCancelOrder,
  getOrderStatusLabel,
  getOrderStatusTone,
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
import { retryOrderZaloPay } from '@/services/paymentService'
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
const repaying         = ref(false)

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

// True only when the buyer is allowed to retry the ZaloPay payment.
// Conditions: authenticated as buyer, ZaloPay method, payment status PENDING.
const canRepayZaloPay = computed(
  () =>
    isBuyer.value &&
    order.value?.payment?.paymentMethod === 'ZALOPAY' &&
    order.value?.payment?.paymentStatus === 'PENDING'
)

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
  e.target.closest('.item__img-wrap')?.classList.add('item__img-wrap--hidden')
}

// ── Navigation: product link ──────────────────────────────────────────────────

function goToProduct(productId) {
  if (productId == null) return
  router.push({ name: 'product-detail', params: { id: productId } })
}

// ── ZaloPay: re-pay from Order Detail ─────────────────────────────────────────

async function retryZaloPay() {
  if (!order.value?.id || repaying.value) return
  repaying.value = true
  try {
    const zp = await retryOrderZaloPay(order.value.id)
    if (!zp?.paymentUrl) {
      throw new Error('ZaloPay did not return a payment URL')
    }
    // Mirror CheckoutResultView's behaviour: open ZaloPay in a new tab so
    // this Order Detail page stays mounted and the buyer can monitor / refresh
    // payment status by pressing the existing "Làm mới trạng thái" button on
    // the Checkout Result page they were sent to earlier — or, if the popup
    // is blocked, fall back to a toast prompting them to re-try.
    const newTab = window.open(zp.paymentUrl, '_blank', 'noopener,noreferrer')
    if (!newTab) {
      toast.error(
        'Trình duyệt đã chặn cửa sổ thanh toán. Vui lòng cho phép popup cho trang này rồi thử lại.'
      )
    }
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message || 'Không thể khởi tạo lại thanh toán ZaloPay')
  } finally {
    repaying.value = false
  }
}
</script>

<template>
  <div class="order-detail-view">

    <!-- ── Loading ───────────────────────────────────────────── -->
    <div v-if="loading" class="order-detail-view__state">
      <BaseLoading label="Đang tải chi tiết đơn hàng..." />
    </div>

    <!-- ── Error / not found ────────────────────────────────── -->
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

    <!-- ── Content ──────────────────────────────────────────── -->
    <template v-else-if="order">

      <!-- ── Page header ───────────────────────────────────── -->
      <header class="order-detail-view__header">
        <div class="order-detail-view__header-top">
          <button
            type="button"
            class="order-detail-view__back-btn"
            @click="router.push({ name: 'orders' })"
          >
            <span class="order-detail-view__back-arrow" aria-hidden="true">←</span>
            <span>Quay lại danh sách</span>
          </button>
        </div>

        <div class="order-detail-view__header-main">
          <div class="order-detail-view__header-left">
            <h1 class="order-detail-view__title">
              Đơn hàng <span class="order-detail-view__order-code">{{ order.orderCode }}</span>
            </h1>
            <p class="order-detail-view__subtitle">
              Tạo lúc {{ order.createdAt ? formatDateTime(order.createdAt) : '—' }}
              <template v-if="order.updatedAt && order.updatedAt !== order.createdAt">
                · Cập nhật {{ formatDateTime(order.updatedAt) }}
              </template>
            </p>
          </div>
          <div class="order-detail-view__header-right">
            <span
              class="order-detail-view__status-pill order-detail-view__status-pill--{{ getOrderStatusTone(order.status) }}"
            >
              {{ getOrderStatusLabel(order.status) }}
            </span>
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

      <!-- ── Admin read-only notice ────────────────────────── -->
      <div v-if="isAdmin" class="order-detail-view__notice" role="status">
        <span class="order-detail-view__notice-icon" aria-hidden="true">i</span>
        <p class="order-detail-view__notice-text">
          <strong>Chế độ xem.</strong>
          Admin chỉ có quyền truy cập đọc. Mọi thao tác thay đổi trạng thái đơn hàng
          thuộc về Buyer hoặc Supplier.
        </p>
      </div>

      <!-- ── Body grid ─────────────────────────────────────── -->
      <div class="order-detail-view__grid">

        <!-- ── Main column ─────────────────────────────────── -->
        <div class="order-detail-view__main">

          <!-- ── Thông tin giao hàng ───────────────────── -->
          <section class="card">
            <h2 class="card__title">Thông tin giao hàng</h2>
            <div class="info-grid info-grid--2">
              <div class="info-row">
                <dt class="info-row__label">Người nhận</dt>
                <dd class="info-row__value">{{ order.shippingCompanyName || '—' }}</dd>
              </div>
              <div class="info-row">
                <dt class="info-row__label">Số điện thoại</dt>
                <dd class="info-row__value">{{ order.shippingPhone || '—' }}</dd>
              </div>
              <div class="info-row info-row--full">
                <dt class="info-row__label">Địa chỉ giao hàng</dt>
                <dd class="info-row__value">{{ order.shippingAddress || '—' }}</dd>
              </div>
            </div>
          </section>

          <!-- ── Sản phẩm ────────────────────────────────── -->
          <section class="card">
            <div class="card__header">
              <h2 class="card__title">Sản phẩm</h2>
              <span class="card__hint">
                {{ order.items?.length ?? 0 }} sản phẩm
              </span>
            </div>

            <ul class="item-list">
              <li
                v-for="item in order.items"
                :key="item.id"
                class="item item--link"
                role="button"
                tabindex="0"
                :aria-label="`Xem chi tiết sản phẩm ${item.productName}`"
                @click="goToProduct(item.productId)"
                @keydown.enter.prevent="goToProduct(item.productId)"
                @keydown.space.prevent="goToProduct(item.productId)"
              >
                <div class="item__media">
                  <div class="item__img-wrap">
                    <img
                      v-if="item.productImageUrl"
                      :src="item.productImageUrl"
                      :alt="item.productName"
                      class="item__img"
                      @error="onImgError"
                    />
                  </div>
                </div>

                <div class="item__body">
                  <p class="item__name">{{ item.productName }}</p>
                  <p class="item__meta">
                    {{ formatCurrency(item.unitPrice) }}
                    <span class="item__sep" aria-hidden="true">×</span>
                    {{ formatNumber(item.quantity) }}
                  </p>
                </div>

                <div class="item__price">
                  <span class="item__price-label">Thành tiền</span>
                  <strong class="item__price-value">
                    {{ formatCurrency(item.subtotal) }}
                  </strong>
                  <span class="item__chevron" aria-hidden="true">›</span>
                </div>
              </li>
            </ul>
          </section>

          <!-- ── Phương thức thanh toán ──────────────────── -->
          <section class="card">
            <h2 class="card__title">Phương thức thanh toán</h2>
            <div class="info-grid info-grid--2">
              <div class="info-row">
                <dt class="info-row__label">Phương thức</dt>
                <dd class="info-row__value">
                  {{ order.payment?.paymentMethod ? getPaymentMethodLabel(order.payment.paymentMethod) : '—' }}
                </dd>
              </div>
              <div class="info-row">
                <dt class="info-row__label">Trạng thái</dt>
                <dd class="info-row__value">
                  <span
                    v-if="order.payment?.paymentStatus"
                    class="status-chip status-chip--{{ getPaymentStatusTone(order.payment.paymentStatus) }}"
                  >
                    {{ getPaymentStatusLabel(order.payment.paymentStatus) }}
                  </span>
                  <span v-else>—</span>
                </dd>
              </div>
              <div class="info-row">
                <dt class="info-row__label">Số tiền</dt>
                <dd class="info-row__value">
                  {{ order.payment?.amount != null ? formatCurrency(order.payment.amount) : '—' }}
                </dd>
              </div>
              <div class="info-row">
                <dt class="info-row__label">Thời gian thanh toán</dt>
                <dd class="info-row__value">
                  {{ order.payment?.paidAt ? formatDateTime(order.payment.paidAt) : '—' }}
                </dd>
              </div>
            </div>
          </section>

          <!-- ── Thanh toán lại (ZaloPay PENDING) ────────── -->
          <section
            v-if="canRepayZaloPay"
            class="repay-card"
            role="region"
            aria-label="Thanh toán lại qua ZaloPay"
          >
            <div class="repay-card__icon" aria-hidden="true">⚡</div>
            <div class="repay-card__body">
              <p class="repay-card__title">
                Bạn đã đóng cửa sổ thanh toán ZaloPay?
              </p>
              <p class="repay-card__desc">
                Đơn hàng vẫn đang chờ thanh toán.
                Nhấn nút bên dưới để mở lại liên kết ZaloPay mà không cần tạo đơn mới.
              </p>
              <BaseButton
                variant="primary"
                :loading="repaying"
                :disabled="repaying"
                @click="retryZaloPay"
              >
                Thanh toán ngay qua ZaloPay
              </BaseButton>
            </div>
          </section>

          <!-- ── Hoàn tiền ──────────────────────────────── -->
          <section
            v-if="showRefund"
            class="refund-card refund-card--{{ refundTone }}"
          >
            <div class="refund-card__icon" aria-hidden="true">
              <span>↺</span>
            </div>
            <div class="refund-card__body">
              <p class="refund-card__title">
                <span
                  v-if="order.payment?.paymentStatus"
                  class="status-chip status-chip--{{ getPaymentStatusTone(order.payment.paymentStatus) }}"
                >
                  {{ getPaymentStatusLabel(order.payment.paymentStatus) }}
                </span>
                <span>{{ refundMessage }}</span>
              </p>
              <p v-if="order.payment?.amount != null" class="refund-card__amount">
                Số tiền hoàn:
                <strong>{{ formatCurrency(order.payment.amount) }}</strong>
              </p>
            </div>
          </section>

          <!-- ── Lịch sử trạng thái ────────────────────── -->
          <section class="card">
            <h2 class="card__title">Lịch sử trạng thái</h2>

            <BaseEmpty
              v-if="history.length === 0 && historyError"
              description="Không thể tải lịch sử trạng thái."
            />

            <BaseEmpty
              v-else-if="history.length === 0 && !historyError"
              description="Chưa có lịch sử trạng thái."
            />

            <ol v-else class="timeline">
              <li
                v-for="entry in history"
                :key="entry.id"
                class="timeline__entry"
              >
                <span class="timeline__node" aria-hidden="true" />
                <div class="timeline__body">
                  <div class="timeline__meta">
                    <span
                      class="status-chip status-chip--{{ getOrderStatusTone(entry.status) }}"
                    >
                      {{ getOrderStatusLabel(entry.status) }}
                    </span>
                    <time class="timeline__time">
                      {{ entry.createdAt ? formatDateTime(entry.createdAt) : '—' }}
                    </time>
                  </div>
                  <p
                    v-if="entry.note"
                    class="timeline__note"
                  >{{ entry.note }}</p>
                </div>
              </li>
            </ol>
          </section>

          <!-- ── Thao tác đơn hàng (SUPPLIER only) ────────── -->
          <section
            v-if="isSupplier && availableActions.length > 0"
            class="card"
          >
            <h2 class="card__title">Thao tác đơn hàng</h2>
            <p class="card__subtitle">
              Các bước tiếp theo cho đơn hàng này.
            </p>
            <div class="action-rail">
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

        </div>

        <!-- ── Sidebar column ───────────────────────────── -->
        <aside class="order-detail-view__sidebar">

          <!-- ── Đối tác (party card) ─────────────────── -->
          <section class="card">
            <h2 class="card__title">Đối tác</h2>

            <div class="party">
              <div class="party__row">
                <span
                  class="party__role"
                  :class="isBuyer || isAdmin ? 'party__role--buyer' : 'party__role--supplier'"
                >
                  {{ (isBuyer || isAdmin) ? 'Nhà cung cấp' : 'Khách hàng' }}
                </span>
                <p class="party__name">
                  {{ (isBuyer || isAdmin)
                      ? (order.supplierCompanyName || '—')
                      : (order.buyerCompanyName || '—') }}
                </p>
              </div>

              <div
                v-if="isAdmin"
                class="party__row party__row--secondary"
              >
                <span class="party__role party__role--buyer">
                  Khách hàng
                </span>
                <p class="party__name">
                  {{ order.buyerCompanyName || '—' }}
                </p>
              </div>
            </div>
          </section>

          <!-- ── Tóm tắt thanh toán ───────────────────── -->
          <section class="card pricing-card">
            <h2 class="card__title">Tóm tắt thanh toán</h2>

            <dl class="pricing">
              <div class="pricing__row">
                <dt>Tạm tính</dt>
                <dd>{{ formatCurrency(order.subtotal) }}</dd>
              </div>

              <template v-if="order.commissionRate != null && order.commissionAmount != null">
                <div class="pricing__row">
                  <dt>Hoa hồng</dt>
                  <dd>{{ formatNumber(order.commissionRate) }}%</dd>
                </div>
                <div class="pricing__row">
                  <dt>Số tiền hoa hồng</dt>
                  <dd>{{ formatCurrency(order.commissionAmount) }}</dd>
                </div>
              </template>

              <p
                v-else
                class="pricing__note"
              >
                Hoa hồng sẽ được tính khi đơn hoàn thành.
              </p>

              <div class="pricing__row pricing__row--total">
                <dt>Tổng cộng</dt>
                <dd class="pricing__total-value">
                  {{ formatCurrency(order.totalAmount) }}
                </dd>
              </div>
            </dl>
          </section>

        </aside>

      </div>

      <!-- ── Cancel modal (BUYER) ────────────────────────────── -->
      <BaseModal
        v-if="showCancelModal"
        :model-value="showCancelModal"
        title="Xác nhận hủy đơn hàng"
        @update:model-value="closeCancelModal"
      >
        <p class="modal-hint">
          Vui lòng nhập lý do hủy đơn hàng (bắt buộc).
        </p>
        <textarea
          v-model="cancelReason"
          class="modal-textarea"
          placeholder="Ví dụ: Tôi đã đặt nhầm sản phẩm..."
          rows="4"
          maxlength="500"
          :disabled="cancelSubmitting"
        />
        <p class="modal-counter">
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

      <!-- ── Supplier reject modal ──────────────────────────── -->
      <BaseModal
        v-if="showRejectModal"
        :model-value="showRejectModal"
        title="Từ chối đơn hàng"
        @update:model-value="showRejectModal = false"
      >
        <p class="modal-hint">
          Vui lòng nhập lý do từ chối. Lý do sẽ được lưu vào lịch sử đơn hàng.
        </p>
        <textarea
          v-model="rejectReason"
          class="modal-textarea"
          rows="4"
          maxlength="500"
          placeholder="Ví dụ: Sản phẩm tạm thời hết hàng..."
          :disabled="rejectSubmitting"
        />
        <div class="modal-counter">
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
</template>

<style scoped>
/* ─────────────────────────────────────────────────────────────────
 *  OrderDetailView
 *  Layout: full-width page header + responsive 2-column body grid
 *  (main column = sections, sidebar = party + pricing summary).
 *  No hard-coded colors / spacing — everything via design tokens.
 * ───────────────────────────────────────────────────────────────── */

.order-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

/* ── State placeholders ────────────────────────────────────── */

.order-detail-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Page header ───────────────────────────────────────────── */

.order-detail-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.order-detail-view__header-top {
  display: flex;
  align-items: center;
}

.order-detail-view__back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

.order-detail-view__back-btn:hover {
  color: var(--color-primary-hover);
}

.order-detail-view__back-arrow {
  display: inline-flex;
  font-size: var(--font-md);
  line-height: 1;
}

.order-detail-view__header-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}

.order-detail-view__header-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.order-detail-view__title {
  margin: 0;
  font-size: var(--font-xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}

.order-detail-view__order-code {
  color: var(--color-primary);
}

.order-detail-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.order-detail-view__header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

/* ── Admin read-only notice ───────────────────────────────── */

.order-detail-view__notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  background-color: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
}

.order-detail-view__notice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background-color: var(--color-info);
  color: var(--color-text-inverse);
  font-style: italic;
  font-weight: var(--weight-bold);
  font-size: var(--font-xs);
  flex-shrink: 0;
}

.order-detail-view__notice-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-info);
  line-height: var(--leading-normal);
}

.order-detail-view__notice-text strong {
  font-weight: var(--weight-semibold);
}

/* ── Body grid ─────────────────────────────────────────────── */

.order-detail-view__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-5);
  align-items: start;
}

.order-detail-view__main,
.order-detail-view__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

/* ── Card primitive ────────────────────────────────────────── */

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.card__title {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.card__subtitle {
  margin: calc(-1 * var(--space-2)) 0 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}

.card__hint {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

/* ── Info grid ─────────────────────────────────────────────── */

.info-grid {
  display: grid;
  gap: var(--space-3) var(--space-5);
}

.info-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-row--full {
  grid-column: 1 / -1;
}

.info-row__label {
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.info-row__value {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
  word-break: break-word;
}

/* ── Item list ─────────────────────────────────────────────── */

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
  align-items: center;
}

.item:first-child {
  border-top: none;
  padding-top: 0;
}

.item:last-child {
  padding-bottom: 0;
}

.item__img-wrap {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-alt);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item__img-wrap--hidden {
  display: none;
}

.item__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item__name {
  margin: 0;
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item__meta {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.item__sep {
  color: var(--color-text-muted);
}

.item__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  white-space: nowrap;
}

.item__price-label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.item__price-value {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

/* ── Item link state ──────────────────────────────────────── */

.item__chevron {
  font-size: var(--font-xl);
  line-height: 1;
  color: var(--color-text-muted);
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.item--link {
  cursor: pointer;
  border-radius: var(--radius-md);
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.item--link:hover {
  background-color: var(--color-surface-alt);
  box-shadow: var(--shadow-sm);
}

.item--link:hover .item__chevron {
  color: var(--color-primary);
  transform: translateX(2px);
}

.item--link:focus {
  outline: none;
  background-color: var(--color-surface-alt);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.item--link:focus .item__chevron {
  color: var(--color-primary);
}

/* ── Status chip ──────────────────────────────────────────── */

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.01em;
  white-space: nowrap;
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
}

.status-chip--warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-chip--info {
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.status-chip--success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.status-chip--danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.status-chip--neutral {
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
}

/* Header status pill: bigger, bolder */
.order-detail-view__status-pill {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.01em;
  white-space: nowrap;
  background-color: var(--color-surface-alt);
  color: var(--color-text-secondary);
}

.order-detail-view__status-pill--warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.order-detail-view__status-pill--info {
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.order-detail-view__status-pill--success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.order-detail-view__status-pill--danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.order-detail-view__status-pill--neutral {
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
}

/* ── Pricing card ──────────────────────────────────────────── */

.pricing {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
}

.pricing__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--font-sm);
}

.pricing__row dt {
  margin: 0;
  color: var(--color-text-muted);
  font-weight: var(--weight-regular);
}

.pricing__row dd {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}

.pricing__note {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.pricing__row--total {
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.pricing__row--total dt {
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.pricing__total-value {
  font-size: var(--font-lg);
  font-weight: var(--weight-bold);
  color: var(--color-primary);
}

/* ── Refund banner ─────────────────────────────────────────── */

.refund-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.refund-card--warning {
  background-color: var(--color-warning-bg);
  border-color: var(--color-warning);
}

.refund-card--info {
  background-color: var(--color-info-bg);
  border-color: var(--color-info);
}

.refund-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-xl);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.refund-card--warning .refund-card__icon {
  color: var(--color-warning);
}

.refund-card--info .refund-card__icon {
  color: var(--color-info);
}

.refund-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.refund-card__title {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.refund-card__amount {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.refund-card__amount strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}

/* ── Re-pay CTA (ZaloPay PENDING) ─────────────────────────── */

.repay-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-primary);
  background-color: var(--color-primary-soft);
  box-shadow: var(--shadow-sm);
}

.repay-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-xl);
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.repay-card__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
  flex: 1;
}

.repay-card__title {
  margin: 0;
  font-size: var(--font-md);
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
}

.repay-card__desc {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

/* ── Timeline ──────────────────────────────────────────────── */

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
}

.timeline__entry {
  position: relative;
  display: flex;
  gap: var(--space-3);
  padding: 0;
}

.timeline__node {
  position: absolute;
  left: calc(-1 * var(--space-4) - 4px);
  top: 4px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border: 3px solid var(--color-primary);
  box-shadow: 0 0 0 4px var(--color-surface);
}

.timeline__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.timeline__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.timeline__time {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}

.timeline__note {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  white-space: pre-wrap;
  word-break: break-word;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-alt);
  border-radius: var(--radius-md);
}

/* ── Party card ────────────────────────────────────────────── */

.party {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.party__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.party__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.party__row--secondary {
  padding-top: var(--space-3);
  padding-bottom: 0;
  border-bottom: none;
  border-top: 1px dashed var(--color-border);
}

.party__role {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.party__role--buyer {
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.party__role--supplier {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.party__name {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

/* ── Action rail (Supplier) ────────────────────────────────── */

.action-rail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ── Modals ────────────────────────────────────────────────── */

.modal-hint {
  margin: 0 0 var(--space-3);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

.modal-textarea {
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
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.modal-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.modal-textarea::placeholder {
  color: var(--color-text-muted);
}

.modal-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-counter {
  margin: var(--space-1) 0 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  text-align: right;
}

/* ── Responsive ────────────────────────────────────────────── */

@media (max-width: 1024px) {
  .order-detail-view__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .order-detail-view__title {
    font-size: var(--font-lg);
  }

  .order-detail-view__header-main {
    flex-direction: column;
    align-items: stretch;
  }

  .order-detail-view__header-right {
    justify-content: space-between;
  }

  .info-grid--2 {
    grid-template-columns: 1fr;
  }

  .item {
    grid-template-columns: 56px minmax(0, 1fr);
    grid-template-rows: auto auto;
    row-gap: var(--space-2);
  }

  .item__price {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: baseline;
    border-top: 1px dashed var(--color-border);
    padding-top: var(--space-2);
  }

  .item__img-wrap {
    width: 56px;
    height: 56px;
  }

  .repay-card {
    flex-direction: column;
    align-items: stretch;
  }

  .repay-card__body {
    align-items: stretch;
  }
}
</style>
