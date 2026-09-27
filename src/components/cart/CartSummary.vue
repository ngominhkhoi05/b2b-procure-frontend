<script setup>
/**
 * CartSummary — totals + destructive actions for the cart.
 *
 * Props:
 *   cart      — CartResponse | null
 *   clearing  — boolean (true while the clear request is in flight)
 *
 * Emits:
 *   clear()
 *
 * Notes:
 *   - All totals come from the backend.
 *   - The Checkout button is intentionally disabled — Phase 6 only.
 */
import { computed } from 'vue'
import { formatCurrency, formatNumber } from '@/utils/format'
import BaseButton from '@/components/common/BaseButton.vue'

const props = defineProps({
  cart: {
    type: Object,
    default: null,
  },
  clearing: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['clear'])

const totalAmount = computed(() => props.cart?.totalAmount ?? null)
const totalItems = computed(() => props.cart?.totalItems ?? 0)
const hasItems = computed(() => totalItems.value > 0)
</script>

<template>
  <aside class="cart-summary" aria-label="Tóm tắt giỏ hàng">
    <h2 class="cart-summary__title">Tóm tắt đơn hàng</h2>

    <dl class="cart-summary__list">
      <div class="cart-summary__row">
        <dt>Số sản phẩm</dt>
        <dd>{{ formatNumber(totalItems) }}</dd>
      </div>

      <div class="cart-summary__row cart-summary__row--total">
        <dt>Tổng cộng</dt>
        <dd>
          <span v-if="totalAmount != null">{{ formatCurrency(totalAmount) }}</span>
          <span v-else class="cart-summary__missing">—</span>
        </dd>
      </div>
    </dl>

    <p class="cart-summary__note">
      Giá đã được tính theo bậc giá hiện tại. Tổng tiền cuối cùng sẽ được hệ thống tính lại khi thanh toán.
    </p>

    <div class="cart-summary__actions">
      <BaseButton
        variant="primary"
        block
        disabled
        title="Tính năng thanh toán sẽ có trong phiên bản tiếp theo"
      >
        Tiến hành thanh toán (sắp có)
      </BaseButton>

      <BaseButton
        v-if="hasItems"
        variant="danger"
        block
        :loading="clearing"
        :disabled="clearing"
        @click="$emit('clear')"
      >
        Xóa toàn bộ giỏ hàng
      </BaseButton>
    </div>
  </aside>
</template>

<style scoped>
.cart-summary {
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

.cart-summary__title {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.cart-summary__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cart-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.cart-summary__row dt {
  margin: 0;
}

.cart-summary__row dd {
  margin: 0;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.cart-summary__row--total {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
  margin-top: var(--space-2);
}

.cart-summary__row--total dt {
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
}

.cart-summary__row--total dd {
  font-size: var(--font-xl);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.cart-summary__missing {
  color: var(--color-text-muted);
}

.cart-summary__note {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
}

.cart-summary__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
