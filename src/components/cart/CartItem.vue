<script setup>
/**
 * CartItem — single product row in the cart.
 *
 * Props:
 *   item       — CartItemResponse
 *   submitting — boolean  (true while the row's mutation is in flight;
 *                          disables quantity controls and the remove button)
 *
 * Emits:
 *   update-quantity({ productId, quantity })
 *   remove(productId)
 *
 * Notes:
 *   - All pricing values come from the backend.
 *   - When `available === false` we surface a warning chip and disable
 *     the controls. The backend is still the source of truth — even
 *     seemingly valid quantity updates will be rejected with 400.
 */
import { computed } from 'vue'
import { formatCurrency, formatNumber } from '@/utils/format'
import CartQuantityControl from './CartQuantityControl.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-quantity', 'remove'])

const isAvailable = computed(() => Boolean(props.item.available))
const hasUnitPrice = computed(() => props.item.unitPrice != null)

const unavailableReason = computed(() => {
  const reasons = []
  if (props.item.productStatus && props.item.productStatus !== 'ACTIVE') {
    reasons.push('Sản phẩm ngừng kinh doanh')
  }
  if (props.item.categoryStatus && props.item.categoryStatus !== 'ACTIVE') {
    reasons.push('Danh mục ngừng hoạt động')
  }
  if (props.item.availableQuantity != null && props.item.quantity > props.item.availableQuantity) {
    reasons.push(
      `Không đủ tồn kho (còn ${formatNumber(props.item.availableQuantity)})`
    )
  }
  if (!hasUnitPrice.value) {
    reasons.push('Chưa có bậc giá phù hợp')
  }
  return reasons
})

function onQuantityChange(newQuantity) {
  if (newQuantity === props.item.quantity) return
  emit('update-quantity', { productId: props.item.productId, quantity: newQuantity })
}

function onRemove() {
  emit('remove', props.item.productId)
}

function onImgError(e) {
  e.target.style.display = 'none'
  e.target.closest('.cart-item__thumb')?.classList.add('cart-item__thumb--no-image')
}
</script>

<template>
  <article
    class="cart-item"
    :class="{ 'cart-item--unavailable': !isAvailable }"
    :aria-busy="submitting"
  >
    <!-- Thumbnail -->
    <div class="cart-item__thumb-wrap">
      <div class="cart-item__thumb">
        <img
          v-if="item.productImageUrl"
          :src="item.productImageUrl"
          :alt="item.productName"
          loading="lazy"
          @error="onImgError"
        />
        <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
    </div>

    <!-- Main info -->
    <div class="cart-item__main">
      <div class="cart-item__heading">
        <h3 class="cart-item__name" :title="item.productName">
          {{ item.productName }}
        </h3>
        <span class="cart-item__sku">SKU: {{ item.sku }}</span>
      </div>

      <div v-if="unavailableReason.length > 0" class="cart-item__warnings" role="alert">
        <span v-for="reason in unavailableReason" :key="reason" class="cart-item__warning">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v6h2V9z"/>
          </svg>
          {{ reason }}
        </span>
      </div>

      <div class="cart-item__price-row">
        <span class="cart-item__label">Đơn giá</span>
        <span v-if="hasUnitPrice" class="cart-item__price">{{ formatCurrency(item.unitPrice) }}</span>
        <span v-else class="cart-item__price cart-item__price--missing">—</span>
      </div>

      <!-- Quantity -->
      <div class="cart-item__quantity-row">
        <span class="cart-item__label">Số lượng</span>
        <CartQuantityControl
          :model-value="item.quantity"
          :min="1"
          :disabled="submitting || !isAvailable"
          @update:modelValue="onQuantityChange"
        />
        <span v-if="item.availableQuantity != null" class="cart-item__stock">
          Còn {{ formatNumber(item.availableQuantity) }}
        </span>
      </div>
    </div>

    <!-- Subtotal + remove -->
    <div class="cart-item__side">
      <div class="cart-item__subtotal-wrap">
        <span class="cart-item__label">Thành tiền</span>
        <span v-if="hasUnitPrice" class="cart-item__subtotal">{{ formatCurrency(item.subtotal) }}</span>
        <span v-else class="cart-item__subtotal cart-item__subtotal--missing">—</span>
      </div>
      <button
        type="button"
        class="cart-item__remove"
        :disabled="submitting"
        @click="onRemove"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        Xóa
      </button>
    </div>

    <div v-if="submitting" class="cart-item__spinner" aria-hidden="true" />
  </article>
</template>

<style scoped>
.cart-item {
  position: relative;
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 180px;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--transition-fast);
}

.cart-item--unavailable {
  border-color: var(--color-warning, #D97706);
}

.cart-item__thumb-wrap {
  display: flex;
  align-items: flex-start;
}

.cart-item__thumb {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-alt);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.cart-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item__thumb--no-image img {
  display: none;
}

.cart-item__thumb:not(.cart-item__thumb--no-image) svg {
  display: none;
}

.cart-item__thumb svg {
  width: 40px;
  height: 40px;
  opacity: 0.6;
}

.cart-item__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.cart-item__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cart-item__name {
  margin: 0;
  font-size: var(--font-base);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cart-item__sku {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.cart-item__warnings {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.cart-item__warning {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-xs);
  color: var(--color-warning, #D97706);
  background-color: var(--color-warning-bg, #FEF3C7);
  padding: 4px var(--space-2);
  border-radius: var(--radius-md);
  align-self: flex-start;
}

.cart-item__warning :deep(svg) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.cart-item__price-row,
.cart-item__quantity-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.cart-item__label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 70px;
}

.cart-item__price {
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.cart-item__price--missing {
  color: var(--color-text-muted);
}

.cart-item__stock {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.cart-item__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
}

.cart-item__subtotal-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.cart-item__subtotal {
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.cart-item__subtotal--missing {
  color: var(--color-text-muted);
}

.cart-item__remove {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 32px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-surface);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-danger);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.cart-item__remove:hover:not(:disabled) {
  background-color: var(--color-danger-bg);
  border-color: var(--color-danger);
}

.cart-item__remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-item__remove :deep(svg) {
  width: 14px;
  height: 14px;
}

.cart-item__spinner {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
}

.cart-item__spinner::before {
  content: '';
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-primary);
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .cart-item {
    grid-template-columns: 80px minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .cart-item__thumb-wrap {
    grid-column: 1;
    grid-row: 1 / span 2;
  }

  .cart-item__thumb {
    width: 80px;
    height: 80px;
  }

  .cart-item__main {
    grid-column: 2;
    grid-row: 1;
  }

  .cart-item__side {
    grid-column: 2;
    grid-row: 2;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-3);
    width: 100%;
  }
}

@media (max-width: 480px) {
  .cart-item {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .cart-item__thumb-wrap,
  .cart-item__main,
  .cart-item__side {
    grid-column: 1;
    grid-row: auto;
  }

  .cart-item__side {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .cart-item__subtotal-wrap {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
