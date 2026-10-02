<script setup>
/**
 * CartItem — single product row in the cart.
 *
 * Layout (compact, single horizontal row):
 *
 *   ┌──┬──────┬────────────────────────┬──────────┬───────────┬────────────┬──┐
 *   │☐ │ thumb│ Name (16px semibold)   │ Đơn giá  │  [−] N [+] │ Thành tiền │🗑│
 *   │  │      │ SKU: ABC-001           │ 120.000đ │  Còn 42    │  240.000đ  │  │
 *   └──┴──────┴────────────────────────┴──────────┴───────────┴────────────┴──┘
 *
 * Props:
 *   item       — CartItemResponse
 *   submitting — boolean  (true while the row's mutation is in flight;
 *                          disables quantity controls and the remove button)
 *   selectable — boolean  (when true, render a leading checkbox)
 *   selected   — boolean  (current checkbox state — controlled)
 *
 * Emits:
 *   update-quantity({ productId, quantity })
 *   remove(productId)
 *   update:selected(boolean)   — emitted whenever the checkbox is toggled
 *
 * Notes:
 *   - All pricing values come from the backend.
 *   - When `available === false` we surface a warning chip and disable
 *     the controls AND the checkbox. The backend is still the source of
 *     truth — even seemingly valid quantity updates will be rejected with 400.
 *   - Unavailable reason chips render BELOW the main row so a healthy
 *     row stays one compact horizontal line.
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
  selectable: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-quantity', 'remove', 'update:selected'])

const isAvailable = computed(() => Boolean(props.item.available))
const hasUnitPrice = computed(() => props.item.unitPrice != null)
const checkboxDisabled = computed(() => !isAvailable.value || props.submitting)

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

function onCheckboxChange(e) {
  emit('update:selected', e.target.checked)
}

function onImgError(e) {
  e.target.style.display = 'none'
  e.target.closest('.cart-item__thumb')?.classList.add('cart-item__thumb--no-image')
}
</script>

<template>
  <article
    class="cart-item"
    :class="{
      'cart-item--unavailable': !isAvailable,
      'cart-item--selectable': selectable,
      'cart-item--selected': selectable && selected,
    }"
    :aria-busy="submitting"
  >
    <!-- Main compact row -->
    <div class="cart-item__row">
      <!-- Selection checkbox -->
      <div v-if="selectable" class="cart-item__select">
        <label class="cart-item__checkbox-label">
          <input
            type="checkbox"
            class="cart-item__checkbox"
            :checked="selected"
            :disabled="checkboxDisabled"
            :aria-label="`Chọn ${item.productName}`"
            @change="onCheckboxChange"
          />
          <span class="cart-item__checkbox-visual" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </span>
        </label>
      </div>

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

      <!-- Name + SKU -->
      <div class="cart-item__heading">
        <h3 class="cart-item__name" :title="item.productName">
          {{ item.productName }}
        </h3>
        <span class="cart-item__sku">SKU: {{ item.sku }}</span>
      </div>

      <!-- Unit price -->
      <div class="cart-item__price-col">
        <span class="cart-item__caption">Đơn giá</span>
        <span v-if="hasUnitPrice" class="cart-item__price">{{ formatCurrency(item.unitPrice) }}</span>
        <span v-else class="cart-item__price cart-item__price--missing">—</span>
      </div>

      <!-- Quantity + stock -->
      <div class="cart-item__quantity-col">
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

      <!-- Subtotal (highlighted) -->
      <div class="cart-item__subtotal-col">
        <span class="cart-item__caption">Thành tiền</span>
        <span v-if="hasUnitPrice" class="cart-item__subtotal">{{ formatCurrency(item.subtotal) }}</span>
        <span v-else class="cart-item__subtotal cart-item__subtotal--missing">—</span>
      </div>

      <!-- Remove (icon only) -->
      <button
        type="button"
        class="cart-item__remove"
        :disabled="submitting"
        aria-label="Xoá sản phẩm"
        title="Xoá sản phẩm"
        @click="onRemove"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>

    <!-- Warnings (unavailable reasons) — spans full width below the row -->
    <div v-if="unavailableReason.length > 0" class="cart-item__warnings" role="alert">
      <span v-for="reason in unavailableReason" :key="reason" class="cart-item__warning">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v6h2V9z"/>
        </svg>
        {{ reason }}
      </span>
    </div>

    <div v-if="submitting" class="cart-item__spinner" aria-hidden="true" />
  </article>
</template>

<style scoped>
.cart-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.cart-item--selectable {
  cursor: default;
}

.cart-item--selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-soft);
}

.cart-item--unavailable.cart-item--selected {
  border-color: var(--color-warning, #D97706);
  background-color: var(--color-surface);
}

/* ── Main compact row ─────────────────────────────────────────────────── */
.cart-item__row {
  display: grid;
  grid-template-columns: auto 72px minmax(0, 1.4fr) 110px auto 120px auto;
  gap: var(--space-4);
  align-items: center;
}

/* ── Selection checkbox ───────────────────────────────────────────────── */
.cart-item__select {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-item__checkbox-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  cursor: pointer;
}

.cart-item__checkbox {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.cart-item__checkbox:disabled {
  cursor: not-allowed;
}

.cart-item__checkbox-visual {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-border-strong);
  background-color: var(--color-surface);
  color: transparent;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
  pointer-events: none;
}

.cart-item__checkbox-visual :deep(svg) {
  width: 14px;
  height: 14px;
}

.cart-item__checkbox:checked + .cart-item__checkbox-visual {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.cart-item__checkbox:disabled + .cart-item__checkbox-visual {
  background-color: var(--color-surface-alt);
  border-color: var(--color-border);
  opacity: 0.5;
}

.cart-item__checkbox:focus-visible + .cart-item__checkbox-visual {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ── Thumbnail ────────────────────────────────────────────────────────── */
.cart-item__thumb-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-item__thumb {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-alt);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  flex-shrink: 0;
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
  width: 32px;
  height: 32px;
  opacity: 0.6;
}

/* ── Name + SKU ───────────────────────────────────────────────────────── */
.cart-item__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cart-item__name {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-item__sku {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Price / Subtotal columns (caption + value) ──────────────────────── */
.cart-item__price-col,
.cart-item__subtotal-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cart-item__price-col {
  align-items: flex-start;
}

.cart-item__subtotal-col {
  align-items: flex-end;
  text-align: right;
}

.cart-item__caption {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
}

.cart-item__price {
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cart-item__price--missing {
  color: var(--color-text-muted);
}

.cart-item__subtotal {
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cart-item__subtotal--missing {
  color: var(--color-text-muted);
}

/* ── Quantity column ──────────────────────────────────────────────────── */
.cart-item__quantity-col {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.cart-item__stock {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* ── Remove (icon-only) ──────────────────────────────────────────────── */
.cart-item__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background-color: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.cart-item__remove:hover:not(:disabled) {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border-color: var(--color-danger-bg);
}

.cart-item__remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cart-item__remove :deep(svg) {
  width: 16px;
  height: 16px;
}

/* ── Warnings (unavailable reasons) ──────────────────────────────────── */
.cart-item__warnings {
  display: flex;
  flex-direction: row;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-left: calc(22px + var(--space-4) + 72px + var(--space-4)); /* align with name column */
  margin-top: var(--space-1);
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
}

.cart-item__warning :deep(svg) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* ── Spinner overlay ─────────────────────────────────────────────────── */
.cart-item__spinner {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  pointer-events: none;
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

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .cart-item__row {
    grid-template-columns: auto 64px minmax(0, 1fr) auto 32px;
    grid-template-rows: auto auto;
    column-gap: var(--space-3);
    row-gap: var(--space-2);
  }

  .cart-item__select {
    grid-column: 1;
    grid-row: 1;
  }

  .cart-item__thumb-wrap {
    grid-column: 2;
    grid-row: 1;
  }

  .cart-item__thumb {
    width: 64px;
    height: 64px;
  }

  .cart-item__heading {
    grid-column: 3 / span 3;
    grid-row: 1;
  }

  .cart-item__price-col {
    grid-column: 1 / span 2;
    grid-row: 2;
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
  }

  .cart-item__quantity-col {
    grid-column: 3;
    grid-row: 2;
    gap: var(--space-2);
  }

  .cart-item__subtotal-col {
    grid-column: 4;
    grid-row: 2;
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
  }

  .cart-item__remove {
    grid-column: 5;
    grid-row: 1;
    align-self: center;
  }

  .cart-item__warnings {
    padding-left: calc(22px + var(--space-3) + 64px + var(--space-3));
  }
}

@media (max-width: 560px) {
  .cart-item__row {
    grid-template-columns: auto 1fr 32px;
    grid-template-rows: auto auto auto;
  }

  .cart-item__select {
    grid-column: 1;
    grid-row: 1;
  }

  .cart-item__thumb-wrap {
    grid-column: 1;
    grid-row: 2;
    justify-content: flex-start;
  }

  .cart-item__heading {
    grid-column: 2 / span 2;
    grid-row: 1;
  }

  .cart-item__remove {
    grid-column: 3;
    grid-row: 1;
  }

  .cart-item__price-col {
    grid-column: 1 / span 3;
    grid-row: 3;
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
  }

  .cart-item__quantity-col {
    grid-column: 1 / span 3;
    grid-row: 4;
    justify-content: space-between;
  }

  .cart-item__subtotal-col {
    grid-column: 1 / span 3;
    grid-row: 5;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-2);
  }

  .cart-item__warnings {
    padding-left: 0;
  }
}
</style>
