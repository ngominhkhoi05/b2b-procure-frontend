<script setup>
/**
 * CheckoutOrderSummary — totals + payment method selector + submit CTA.
 *
 * Props:
 *   subtotal        — number (sum of selected cart-item subtotals)
 *   total           — number | null  (backend value if already known;
 *                                    we display subtotal before submit)
 *   paymentMethod   — 'COD' | 'ZALOPAY' | null
 *   submitting      — boolean (disables submit button + shows spinner)
 *   expiredAt       — string | null (ISO datetime — for ZaloPay expiry hint)
 *
 * Emits:
 *   update:paymentMethod('COD' | 'ZALOPAY')
 *   submit
 *
 * Notes:
 *   - The backend is authoritative for `total`. Before the checkout
 *     API call we only display the sum-of-subtotals with a clear note.
 *   - The CTA label changes based on the chosen payment method.
 */
import { computed } from 'vue'
import { formatCurrency, formatDateTime } from '@/utils/format'
import BaseButton from '@/components/common/BaseButton.vue'

const props = defineProps({
  subtotal: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: null,
  },
  paymentMethod: {
    type: String,
    default: null,
    validator: (v) => v === null || v === 'COD' || v === 'ZALOPAY',
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  expiredAt: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['update:paymentMethod', 'submit'])

const canSubmit = computed(
  () => Boolean(props.paymentMethod) && !props.submitting && props.subtotal > 0
)

const ctaLabel = computed(() => {
  if (props.submitting) return 'Đang xử lý...'
  if (props.paymentMethod === 'ZALOPAY') return 'Thanh toán với ZaloPay'
  if (props.paymentMethod === 'COD') return 'Đặt hàng (COD)'
  return 'Chọn phương thức thanh toán'
})

const ctaLoadingLabel = computed(() => {
  if (props.paymentMethod === 'ZALOPAY') return 'Đang chuẩn bị ZaloPay...'
  return 'Đang tạo đơn hàng...'
})

const showExpiryHint = computed(
  () =>
    props.paymentMethod === 'ZALOPAY' &&
    Boolean(props.expiredAt) &&
    !props.submitting
)

function onSelectMethod(method) {
  emit('update:paymentMethod', method)
}

function onSubmit() {
  if (!canSubmit.value) return
  emit('submit')
}
</script>

<template>
  <aside class="checkout-summary" aria-label="Tóm tắt thanh toán">
    <h2 class="checkout-summary__title">Tóm tắt thanh toán</h2>

    <dl class="checkout-summary__list">
      <div class="checkout-summary__row">
        <dt>Tạm tính</dt>
        <dd>{{ formatCurrency(subtotal) }}</dd>
      </div>

      <div class="checkout-summary__row checkout-summary__row--total">
        <dt>Tổng cộng</dt>
        <dd>
          <span v-if="total != null">{{ formatCurrency(total) }}</span>
          <span v-else>{{ formatCurrency(subtotal) }}</span>
        </dd>
      </div>
    </dl>

    <p class="checkout-summary__note">
      Hệ thống sẽ tính lại tổng tiền dựa trên bậc giá hiện tại và tồn kho thực tế khi bạn xác nhận.
    </p>

    <fieldset class="checkout-summary__methods" :disabled="submitting">
      <legend class="checkout-summary__methods-legend">Phương thức thanh toán</legend>

      <label
        class="checkout-method"
        :class="{ 'checkout-method--active': paymentMethod === 'COD' }"
      >
        <input
          type="radio"
          name="payment-method"
          value="COD"
          :checked="paymentMethod === 'COD'"
          class="checkout-method__radio"
          @change="onSelectMethod('COD')"
        />
        <span class="checkout-method__visual" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
          </svg>
        </span>
        <span class="checkout-method__body">
          <span class="checkout-method__name">Thanh toán khi nhận hàng (COD)</span>
          <span class="checkout-method__desc">Thanh toán bằng tiền mặt cho đơn vị vận chuyển.</span>
        </span>
        <span class="checkout-method__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </span>
      </label>

      <label
        class="checkout-method"
        :class="{ 'checkout-method--active': paymentMethod === 'ZALOPAY' }"
      >
        <input
          type="radio"
          name="payment-method"
          value="ZALOPAY"
          :checked="paymentMethod === 'ZALOPAY'"
          class="checkout-method__radio"
          @change="onSelectMethod('ZALOPAY')"
        />
        <span class="checkout-method__visual checkout-method__visual--zp" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 6h18v3H3V6zm0 5h18v7H3v-7zm3 2v3h2v-3H6zm4 0v3h2v-3h-2zm4 0v3h2v-3h-2z"/>
          </svg>
        </span>
        <span class="checkout-method__body">
          <span class="checkout-method__name">ZaloPay</span>
          <span class="checkout-method__desc">Thanh toán trực tuyến qua cổng ZaloPay.</span>
        </span>
        <span class="checkout-method__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </span>
      </label>
    </fieldset>

    <p v-if="showExpiryHint" class="checkout-summary__expiry">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.59L11 13.41V6h2v6.59l3.7 3.7-1.5 1.3z"/>
      </svg>
      <span>
        Liên kết ZaloPay sẽ hết hạn lúc <strong>{{ formatDateTime(expiredAt) }}</strong>.
      </span>
    </p>

    <div class="checkout-summary__action">
      <BaseButton
        variant="primary"
        block
        :loading="submitting"
        :disabled="!canSubmit"
        @click="onSubmit"
      >
        {{ submitting ? ctaLoadingLabel : ctaLabel }}
      </BaseButton>
    </div>
  </aside>
</template>

<style scoped>
.checkout-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  position: sticky;
  top: 88px;
}

.checkout-summary__title {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.checkout-summary__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.checkout-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.checkout-summary__row dt {
  margin: 0;
}

.checkout-summary__row dd {
  margin: 0;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.checkout-summary__muted {
  color: var(--color-text-muted);
  font-style: italic;
}

.checkout-summary__row--total {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
  margin-top: var(--space-2);
}

.checkout-summary__row--total dt {
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
}

.checkout-summary__row--total dd {
  font-size: var(--font-xl);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.checkout-summary__note {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
}

.checkout-summary__methods {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.checkout-summary__methods[disabled] {
  opacity: 0.6;
}

.checkout-summary__methods-legend {
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
  padding: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.checkout-method {
  position: relative;
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.checkout-method:hover {
  border-color: var(--color-primary);
  background-color: var(--color-surface);
}

.checkout-method--active {
  border-color: var(--color-primary);
  border-width: 2px;
  padding: calc(var(--space-3) - 1px); /* compensate for thicker border so layout doesn't shift */
  background: var(--color-primary-soft);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}

.checkout-method__radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkout-method__radio:focus-visible + .checkout-method__visual {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.checkout-method__visual {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.checkout-method__visual :deep(svg) {
  width: 22px;
  height: 22px;
}

.checkout-method--active .checkout-method__visual {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.checkout-method__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.checkout-method__name {
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.checkout-method__desc {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  line-height: var(--leading-snug);
}

/* "Đã chọn" check indicator — visible only on active method. */
.checkout-method__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.checkout-method__check :deep(svg) {
  width: 14px;
  height: 14px;
}

.checkout-method--active .checkout-method__check {
  opacity: 1;
  transform: scale(1);
}

.checkout-summary__expiry {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  line-height: var(--leading-relaxed);
}

.checkout-summary__expiry :deep(svg) {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.checkout-summary__action {
  display: flex;
}
</style>
