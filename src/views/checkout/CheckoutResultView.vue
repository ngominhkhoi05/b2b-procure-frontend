<script setup>
/**
 * CheckoutResultView — post-checkout result page.
 *
 * Reads the persisted CheckoutSession and refreshes the latest payment /
 * order status by calling GET /orders/{orderId}. The backend — not the
 * browser — is the source of truth for payment state.
 *
 * Mapping (PaymentStatus enum):
 *   SUCCESS         → success panel
 *   PENDING         → pending panel (offer "Thử lại" by re-calling
 *                     POST /checkout/zalopay/create-payment + redirecting)
 *   EXPIRED         → expired panel (no auto-recover; suggest going
 *                     back to cart to start over)
 *   FAILED          → failed panel (offer retry)
 *   REFUND_PENDING  → neutral status chip (Phase 10 territory)
 *   REFUNDED        → neutral status chip (Phase 10 territory)
 *
 * Order status is shown as a secondary chip to highlight that payment
 * status and order status are independent concepts.
 *
 * Refund UI is intentionally NOT exposed here (per Phase 6 scope rules).
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatCurrency, formatDateTime } from '@/utils/format'
import {
  loadCheckoutSession,
  clearCheckoutSession,
  patchCheckoutSession,
} from '@/utils/checkoutSession'
import { getOrderById } from '@/services/checkoutService'
import { createZaloPayPayment } from '@/services/paymentService'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const router = useRouter()
const toast = useToastStore()

const session = ref(null)
const orderDetail = ref(null)
const loading = ref(false)
const loadError = ref(null)
const retrying = ref(false)

const paymentStatus = computed(
  () => orderDetail.value?.payment?.paymentStatus ?? session.value?.paymentStatus ?? null
)
const orderId = computed(
  () => orderDetail.value?.id ?? session.value?.orderId ?? null
)
const orderStatus = computed(
  () => orderDetail.value?.status ?? session.value?.orderStatus ?? null
)
const paymentMethod = computed(
  () => orderDetail.value?.payment?.paymentMethod ?? session.value?.paymentMethod ?? null
)
const totalAmount = computed(
  () =>
    orderDetail.value?.totalAmount ??
    session.value?.totalAmount ??
    session.value?.subtotal ??
    null
)
const orderCode = computed(
  () => orderDetail.value?.orderCode ?? session.value?.orderCode ?? null
)
const paymentExpiredAt = computed(
  () => session.value?.paymentExpiredAt ?? null
)

const state = computed(() => classifyState(paymentStatus.value))

function classifyState(status) {
  switch (status) {
    case 'SUCCESS':
      return {
        tone: 'success',
        icon: 'check',
        title: 'Thanh toán thành công',
        message: 'Đơn hàng của bạn đã được ghi nhận và đang chờ nhà cung cấp xác nhận.',
      }
    case 'FAILED':
      return {
        tone: 'failed',
        icon: 'cross',
        title: 'Thanh toán thất bại',
        message:
          'Hệ thống thanh toán đã từ chối giao dịch. Bạn có thể thử lại hoặc chọn phương thức khác.',
      }
    case 'EXPIRED':
      return {
        tone: 'expired',
        icon: 'clock',
        title: 'Đã hết hạn thanh toán',
        message:
          'Liên kết thanh toán đã hết hạn. Vui lòng quay lại giỏ hàng và tạo đơn mới.',
      }
    case 'REFUND_PENDING':
      return {
        tone: 'neutral',
        icon: 'info',
        title: 'Đang chờ hoàn tiền',
        message:
          'Đơn hàng đã được hoàn tiền. Trạng thái sẽ được cập nhật sau khi hoàn tất.',
      }
    case 'REFUNDED':
      return {
        tone: 'neutral',
        icon: 'info',
        title: 'Đã hoàn tiền',
        message: 'Đơn hàng này đã được hoàn tiền thành công.',
      }
    case 'PENDING':
    default:
      return {
        tone: 'pending',
        icon: 'hourglass',
        title: 'Đang chờ thanh toán',
        message:
          'Đơn hàng đã được tạo. Nếu bạn đã thanh toán qua ZaloPay, vui lòng chờ hệ thống cập nhật trong ít phút.',
      }
  }
}

async function load() {
  loading.value = true
  loadError.value = null
  const sess = loadCheckoutSession()
  if (!sess || !sess.orderId) {
    // No session → bounce to cart.
    router.replace({ name: 'cart' })
    return
  }
  session.value = sess

  try {
    const detail = await getOrderById(sess.orderId)
    orderDetail.value = detail
    // Update the session snapshot so subsequent navigation reflects the
    // latest backend state.
    patchCheckoutSession({
      paymentStatus: detail?.payment?.paymentStatus ?? null,
      orderStatus: detail?.status ?? null,
      totalAmount: detail?.totalAmount ?? null,
    })
  } catch (err) {
    loadError.value = err
    // Still allow the buyer to read the snapshot we have on file.
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goToCart() {
  clearCheckoutSession()
  router.push({ name: 'cart' })
}

function goToProducts() {
  clearCheckoutSession()
  router.push({ name: 'products' })
}

function refreshStatus() {
  load()
}

async function retryZaloPay() {
  const sess = session.value
  if (!sess?.paymentId || !sess?.orderId || retrying.value) return
  retrying.value = true
  try {
    const zp = await createZaloPayPayment({
      paymentId: sess.paymentId,
      orderId: sess.orderId,
    })
    if (!zp?.paymentUrl) {
      throw new Error('ZaloPay did not return a payment URL')
    }
    patchCheckoutSession({ paymentUrl: zp.paymentUrl })
    // Open ZaloPay in a NEW tab. We never touch `window.location` —
    // the result page must stay where it is so the buyer can keep
    // refreshing status. If the popup is blocked we surface the URL
    // as a manual link below instead of redirecting the tab.
    const newTab = window.open(zp.paymentUrl, '_blank', 'noopener,noreferrer')
    if (!newTab) {
      toast.error(
        'Trình duyệt đã chặn cửa sổ thanh toán. Vui lòng nhấn nút "Mở ZaloPay" bên dưới.'
      )
      retrying.value = false
      return
    }
    retrying.value = false
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message || 'Không thể khởi tạo lại thanh toán ZaloPay')
    retrying.value = false
  }
}

function openStoredPaymentUrl() {
  const url = session.value?.paymentUrl
  if (!url) return
  // Same user-gesture safety: try a new tab first, never assign.
  const tab = window.open(url, '_blank', 'noopener,noreferrer')
  if (!tab) {
    toast.error(
      'Trình duyệt đã chặn cửa sổ thanh toán. Vui lòng cho phép popup cho trang này.'
    )
  }
}

function goToOrderDetail() {
  const id = orderId.value
  if (!id) return
  router.push({ name: 'order-detail', params: { id } })
}
</script>

<template>
  <div class="checkout-result">
    <BaseLoading v-if="loading" label="Đang tải kết quả thanh toán..." />

    <div
      v-else
      class="checkout-result__card"
      :class="`checkout-result__card--${state.tone}`"
    >
      <div class="checkout-result__icon" aria-hidden="true">
        <!-- check -->
        <svg v-if="state.icon === 'check'" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <!-- cross -->
        <svg v-else-if="state.icon === 'cross'" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
        <!-- clock / expired -->
        <svg v-else-if="state.icon === 'clock'" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.59L11 13.41V6h2v6.59l3.7 3.7-1.5 1.3z"/>
        </svg>
        <!-- hourglass -->
        <svg v-else-if="state.icon === 'hourglass'" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>
        </svg>
        <!-- info -->
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      </div>

      <h1 class="checkout-result__title">{{ state.title }}</h1>
      <p class="checkout-result__message">{{ state.message }}</p>

      <dl v-if="orderCode || paymentMethod || totalAmount != null" class="checkout-result__details">
        <div v-if="orderCode" class="checkout-result__row">
          <dt>Mã đơn hàng</dt>
          <dd>
            {{ orderCode }}
            <span v-if="paymentStatus" class="checkout-result__chip" :data-tone="state.tone">
              Thanh toán: {{ paymentStatus }}
            </span>
            <span v-if="orderStatus" class="checkout-result__chip checkout-result__chip--muted">
              Đơn hàng: {{ orderStatus }}
            </span>
          </dd>
        </div>
        <div v-if="paymentMethod" class="checkout-result__row">
          <dt>Phương thức</dt>
          <dd>{{ paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'ZaloPay' }}</dd>
        </div>
        <div v-if="totalAmount != null" class="checkout-result__row">
          <dt>Tổng tiền</dt>
          <dd>{{ formatCurrency(totalAmount) }}</dd>
        </div>
        <div v-if="paymentExpiredAt && paymentStatus === 'PENDING'" class="checkout-result__row">
          <dt>Hạn thanh toán</dt>
          <dd>{{ formatDateTime(paymentExpiredAt) }}</dd>
        </div>
      </dl>

      <BaseError
        v-if="loadError && !orderDetail"
        title="Không tải được trạng thái đơn hàng"
        :error="loadError"
        class="checkout-result__load-error"
        @retry="refreshStatus"
      />

      <div class="checkout-result__actions">
        <!-- Retry ZaloPay when still PENDING -->
        <BaseButton
          v-if="paymentMethod === 'ZALOPAY' && paymentStatus === 'PENDING'"
          variant="primary"
          :loading="retrying"
          :disabled="retrying"
          @click="retryZaloPay"
        >
          {{ retrying ? 'Đang chuẩn bị ZaloPay...' : 'Thử thanh toán lại với ZaloPay' }}
        </BaseButton>

        <!-- Manual "open the URL we already have" button — surfaced when
             the buyer was bounced back here because the popup was
             blocked. Never auto-redirects the current tab. -->
        <BaseButton
          v-if="
            paymentMethod === 'ZALOPAY' &&
            paymentStatus === 'PENDING' &&
            session?.paymentUrl
          "
          variant="secondary"
          @click="openStoredPaymentUrl"
        >
          Mở ZaloPay
        </BaseButton>

        <!-- Refresh status -->
        <BaseButton
          v-if="paymentStatus === 'PENDING'"
          variant="secondary"
          :disabled="loading"
          @click="refreshStatus"
        >
          Làm mới trạng thái
        </BaseButton>

        <!-- Always: track order + back to cart + back to products -->
        <BaseButton
          variant="secondary"
          :disabled="!orderId"
          :title="orderId ? 'Mở trang chi tiết đơn hàng' : 'Đang tải đơn hàng...'"
          @click="goToOrderDetail"
        >
          Theo dõi đơn hàng
        </BaseButton>

        <BaseButton
          v-if="state.tone === 'success' || state.tone === 'pending'"
          variant="ghost"
          @click="goToProducts"
        >
          Tiếp tục mua sắm
        </BaseButton>

        <BaseButton
          v-if="state.tone === 'failed' || state.tone === 'expired'"
          variant="ghost"
          @click="goToCart"
        >
          Về giỏ hàng
        </BaseButton>

        <BaseButton
          v-if="state.tone === 'neutral'"
          variant="secondary"
          @click="goToProducts"
        >
          Về trang sản phẩm
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  padding: var(--space-4) 0;
}

.checkout-result__card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  text-align: center;
  align-items: center;
}

.checkout-result__card--success {
  border-color: #16a34a;
}

.checkout-result__card--success .checkout-result__icon {
  background: #16a34a;
  color: #fff;
}

.checkout-result__card--pending {
  border-color: var(--color-primary);
}

.checkout-result__card--pending .checkout-result__icon {
  background: var(--color-primary);
  color: #fff;
}

.checkout-result__card--failed {
  border-color: var(--color-danger);
}

.checkout-result__card--failed .checkout-result__icon {
  background: var(--color-danger);
  color: #fff;
}

.checkout-result__card--expired {
  border-color: #d97706;
}

.checkout-result__card--expired .checkout-result__icon {
  background: #d97706;
  color: #fff;
}

.checkout-result__card--neutral {
  border-color: var(--color-border-strong);
}

.checkout-result__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
}

.checkout-result__icon :deep(svg) {
  width: 32px;
  height: 32px;
}

.checkout-result__title {
  margin: 0;
  font-size: var(--font-xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.checkout-result__message {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  max-width: 480px;
}

.checkout-result__details {
  margin: var(--space-3) 0 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  text-align: left;
}

.checkout-result__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: var(--font-sm);
}

.checkout-result__row dt {
  margin: 0;
  color: var(--color-text-muted);
}

.checkout-result__row dd {
  margin: 0;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.checkout-result__chip {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.checkout-result__chip[data-tone='success'] {
  background: #dcfce7;
  color: #166534;
}

.checkout-result__chip[data-tone='failed'] {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.checkout-result__chip[data-tone='expired'] {
  background: #fef3c7;
  color: #92400e;
}

.checkout-result__chip[data-tone='pending'] {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.checkout-result__chip[data-tone='neutral'] {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-strong);
}

.checkout-result__chip--muted {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.checkout-result__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-2);
}

.checkout-result__load-error {
  width: 100%;
}
</style>
