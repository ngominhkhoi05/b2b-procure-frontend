<script setup>
/**
 * CheckoutView — review the selected supplier's items + choose a payment
 * method + submit the checkout.
 *
 * Lifecycle:
 *   1. On mount, read the persisted selection from sessionStorage
 *      (`b2b_checkout_session`). If missing → redirect to /cart.
 *   2. Re-fetch the cart so prices stay current.
 *   3. Validate every persisted cartItemId against the fresh cart. If
 *      any item is gone, the selection has drifted; we redirect to /cart.
 *   4. Render the review + summary.
 *   5. Submit:
 *        a. POST /api/v1/checkout
 *           → on success: persist orderId/paymentId, update session.
 *        b. COD: re-fetch cart, navigate to /checkout/result.
 *           ZaloPay: POST /checkout/zalopay/create-payment → window.open
 *                     (NEVER window.location.assign — must stay on result
 *                     page so buyer can monitor / refresh status).
 *
 * The backend is the source of truth for tier pricing, stock, supplier,
 * and payment eligibility. We never recompute or override them here.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import {
  loadCheckoutSession,
  saveCheckoutSession,
  clearCheckoutSession,
  patchCheckoutSession,
} from '@/utils/checkoutSession'

import { checkout } from '@/services/checkoutService'
import { createZaloPayPayment } from '@/services/paymentService'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseButton from '@/components/common/BaseButton.vue'

import CheckoutSupplierGroup from '@/components/checkout/CheckoutSupplierGroup.vue'
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary.vue'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const toast = useToastStore()

const session = ref(null)
const loadingCart = ref(false)
const loadError = ref(null)
const submitting = ref(false)

const paymentMethod = ref(null) // 'COD' | 'ZALOPAY'

// Computed view-model items, hydrated from the fresh cart so prices
// reflect the latest tier resolution.
const items = computed(() => {
  const sess = session.value
  if (!sess?.selectedItems) return []
  const fresh = cartStore.cart?.items || []
  return sess.selectedItems
    .map((s) => {
      const f = fresh.find((x) => x.id === s.cartItemId || x.productId === s.productId)
      if (!f) return null
      return {
        ...s,
        unitPrice: f.unitPrice,
        subtotal: f.subtotal,
        available: f.available,
        quantity: f.quantity,
      }
    })
    .filter(Boolean)
})

const subtotal = computed(() =>
  items.value.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0)
)

const supplierName = computed(() => session.value?.supplierCompanyName || 'Nhà cung cấp')

async function load() {
  loadingCart.value = true
  loadError.value = null
  const sess = loadCheckoutSession()
  if (!sess || !Array.isArray(sess.selectedItems) || sess.selectedItems.length === 0) {
    toast.error('Vui lòng chọn sản phẩm từ giỏ hàng trước khi thanh toán')
    router.replace({ name: 'cart' })
    return
  }
  session.value = sess

  // Validate the query param (if present) matches the supplier in the
  // session; otherwise the user navigated here directly.
  const querySupplier = route.query.supplier
  if (querySupplier && String(sess.supplierCompanyId) !== String(querySupplier)) {
    toast.error('Phiên thanh toán không khớp. Vui lòng chọn lại sản phẩm.')
    clearCheckoutSession()
    router.replace({ name: 'cart' })
    return
  }

  try {
    await cartStore.fetchCart()
    const fresh = cartStore.cart?.items || []
    const missing = sess.selectedItems.filter(
      (s) => !fresh.some((f) => f.id === s.cartItemId)
    )
    if (missing.length > 0) {
      toast.error('Một số sản phẩm đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.')
      clearCheckoutSession()
      router.replace({ name: 'cart' })
      return
    }
  } catch (err) {
    const { message } = handleApiError(err)
    loadError.value = err
    toast.error(message)
  } finally {
    loadingCart.value = false
  }
}

onMounted(load)

function goBackToCart() {
  router.push({ name: 'cart' })
}

async function onSubmit() {
  const sess = session.value
  if (!sess || submitting.value) return
  if (!paymentMethod.value) {
    toast.error('Vui lòng chọn phương thức thanh toán')
    return
  }
  submitting.value = true
  try {
    const cartItemIds = items.value.map((i) => i.cartItemId)
    const response = await checkout({
      cartItemIds,
      paymentMethod: paymentMethod.value,
    })

    // Patch the session with backend response details.
    patchCheckoutSession({
      orderId: response.orderId,
      orderCode: response.orderCode,
      paymentId: response.paymentId,
      paymentCode: response.paymentCode,
      paymentMethod: response.paymentMethod,
      paymentStatus: response.paymentStatus,
      orderStatus: response.orderStatus,
      subtotal: response.subtotal,
      totalAmount: response.totalAmount,
      paymentExpiredAt: response.paymentExpiredAt,
    })
    session.value = loadCheckoutSession()

    if (response.paymentMethod === 'ZALOPAY') {
      // Two-step flow: call the second endpoint to get the ZaloPay URL.
      try {
        const zp = await createZaloPayPayment({
          paymentId: response.paymentId,
          orderId: response.orderId,
        })
        if (!zp?.paymentUrl) {
          throw new Error('ZaloPay did not return a payment URL')
        }
        patchCheckoutSession({ paymentUrl: zp.paymentUrl })

        // Open ZaloPay-hosted checkout in a NEW tab. We DO NOT touch
        // `window.location` here — the current tab must stay on the
        // result page so the buyer can monitor status. If the popup
        // was blocked we tell the user instead of hijacking the tab.
        const newTab = window.open(zp.paymentUrl, '_blank', 'noopener,noreferrer')
        if (!newTab) {
          // Popup blocked. Stay on the result page and surface the URL
          // as a manual link — the buyer can click it themselves.
          toast.error(
            'Trình duyệt đã chặn cửa sổ thanh toán. Vui lòng nhấn nút "Mở ZaloPay" bên dưới để tiếp tục.'
          )
          // Still navigate to the result page so the buyer has a
          // visible place with the manual "Open ZaloPay" button.
          try {
            await cartStore.fetchCart()
          } catch {
            // non-fatal
          }
          router.push({ name: 'checkout-result' })
          submitting.value = false
          return
        }

        // Popup opened successfully. Move the current tab to the result
        // page so the buyer can monitor / refresh payment status.
        try {
          await cartStore.fetchCart()
        } catch {
          // non-fatal — the result page can still show the order
        }
        router.push({ name: 'checkout-result' })
        submitting.value = false
        return
      } catch (zpErr) {
        const { message } = handleApiError(zpErr)
        toast.error(message || 'Không thể khởi tạo thanh toán ZaloPay')
        submitting.value = false
        return
      }
    }

    // COD path: re-fetch the cart (backend deleted the items) and
    // navigate to the result page.
    try {
      await cartStore.fetchCart()
    } catch {
      // non-fatal — the result page can still show the order
    }
    submitting.value = false
    router.push({ name: 'checkout-result' })
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message || 'Không thể tạo đơn hàng. Vui lòng thử lại.')
    submitting.value = false
  }
}
</script>

<template>
  <div class="checkout-view">
    <header class="checkout-view__header">
      <div>
        <button type="button" class="checkout-view__back" @click="goBackToCart">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Quay lại giỏ hàng
        </button>
        <h1 class="checkout-view__title">Thanh toán</h1>
        <p class="checkout-view__subtitle">
          Vui lòng kiểm tra lại đơn hàng và chọn phương thức thanh toán.
        </p>
      </div>
    </header>

    <BaseLoading v-if="loadingCart" label="Đang tải đơn hàng..." />

    <BaseError
      v-else-if="loadError"
      title="Không tải được đơn hàng"
      :error="loadError"
      @retry="load"
    />

    <div v-else-if="items.length === 0" class="checkout-view__empty">
      <p>Không có sản phẩm nào trong phiên thanh toán.</p>
      <BaseButton variant="primary" @click="goBackToCart">Về giỏ hàng</BaseButton>
    </div>

    <div v-else class="checkout-view__layout">
      <div class="checkout-view__main">
        <CheckoutSupplierGroup
          :supplier-name="supplierName"
          :items="items"
        />
      </div>

      <div class="checkout-view__aside">
        <CheckoutOrderSummary
          :subtotal="subtotal"
          :total="session?.totalAmount ?? null"
          :payment-method="paymentMethod"
          :submitting="submitting"
          :expired-at="session?.paymentExpiredAt ?? null"
          @update:payment-method="(v) => (paymentMethod = v)"
          @submit="onSubmit"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.checkout-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.checkout-view__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0;
  background: transparent;
  border: none;
  font-size: var(--font-sm);
  color: var(--color-primary);
  cursor: pointer;
  margin-bottom: var(--space-2);
}

.checkout-view__back :deep(svg) {
  width: 18px;
  height: 18px;
}

.checkout-view__back:hover {
  text-decoration: underline;
}

.checkout-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.checkout-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.checkout-view__empty {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-secondary);
}

.checkout-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--space-5);
  align-items: start;
}

.checkout-view__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.checkout-view__aside {
  min-width: 0;
}

@media (max-width: 900px) {
  .checkout-view__layout {
    grid-template-columns: 1fr;
  }
}
</style>
