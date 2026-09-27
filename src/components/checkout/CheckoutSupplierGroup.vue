<script setup>
/**
 * CheckoutSupplierGroup — read-only list of the items the buyer is
 * about to check out (single supplier, all items pre-validated).
 *
 * Props:
 *   supplierName — string
 *   items        — CheckoutSelectionItem[]
 *
 * Emits: none (read-only).
 *
 * Reuses the thumbnail + warning pattern from CartItem for visual
 * consistency but hides the row controls (quantity, remove, checkbox).
 */
import { computed } from 'vue'
import { formatCurrency, formatNumber } from '@/utils/format'

defineProps({
  supplierName: {
    type: String,
    default: 'Nhà cung cấp',
  },
  items: {
    type: Array,
    default: () => [],
  },
})

const hasUnitPrice = (item) => item.unitPrice != null

function onImgError(e) {
  e.target.style.display = 'none'
  e.target.closest('.checkout-line__thumb')?.classList.add('checkout-line__thumb--no-image')
}
</script>

<template>
  <section class="checkout-group">
    <header class="checkout-group__header">
      <span class="checkout-group__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
        </svg>
      </span>
      <h2 class="checkout-group__title">{{ supplierName }}</h2>
      <span class="checkout-group__count">{{ items.length }} sản phẩm</span>
    </header>

    <div class="checkout-group__list">
      <article
        v-for="item in items"
        :key="item.cartItemId"
        class="checkout-line"
      >
        <div class="checkout-line__thumb">
          <img
            v-if="item.productImageUrl"
            :src="item.productImageUrl"
            :alt="item.productName"
            @error="onImgError"
          />
          <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>

        <div class="checkout-line__main">
          <div class="checkout-line__heading">
            <h3 class="checkout-line__name" :title="item.productName">
              {{ item.productName }}
            </h3>
            <span class="checkout-line__sku">SKU: {{ item.sku }}</span>
          </div>

          <div class="checkout-line__price-row">
            <span class="checkout-line__label">Đơn giá</span>
            <span v-if="hasUnitPrice(item)" class="checkout-line__price">
              {{ formatCurrency(item.unitPrice) }}
            </span>
            <span v-else class="checkout-line__price checkout-line__price--missing">—</span>
          </div>

          <div class="checkout-line__qty-row">
            <span class="checkout-line__label">Số lượng</span>
            <span class="checkout-line__qty">{{ formatNumber(item.quantity) }}</span>
          </div>
        </div>

        <div class="checkout-line__side">
          <span class="checkout-line__label">Thành tiền</span>
          <span
            v-if="hasUnitPrice(item)"
            class="checkout-line__subtotal"
          >
            {{ formatCurrency(item.subtotal) }}
          </span>
          <span
            v-else
            class="checkout-line__subtotal checkout-line__subtotal--missing"
          >
            —
          </span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.checkout-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.checkout-group__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.checkout-group__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-radius: var(--radius-md);
}

.checkout-group__icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.checkout-group__title {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkout-group__count {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.checkout-group__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.checkout-line {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 180px;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.checkout-line__thumb {
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

.checkout-line__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.checkout-line__thumb--no-image img {
  display: none;
}

.checkout-line__thumb:not(.checkout-line__thumb--no-image) svg {
  display: none;
}

.checkout-line__thumb svg {
  width: 40px;
  height: 40px;
  opacity: 0.6;
}

.checkout-line__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.checkout-line__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkout-line__name {
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

.checkout-line__sku {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.checkout-line__price-row,
.checkout-line__qty-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.checkout-line__label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 70px;
}

.checkout-line__price {
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.checkout-line__price--missing {
  color: var(--color-text-muted);
}

.checkout-line__qty {
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.checkout-line__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}

.checkout-line__subtotal {
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.checkout-line__subtotal--missing {
  color: var(--color-text-muted);
}

@media (max-width: 720px) {
  .checkout-line {
    grid-template-columns: 80px minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .checkout-line__thumb {
    width: 80px;
    height: 80px;
    grid-column: 1;
    grid-row: 1;
  }

  .checkout-line__main {
    grid-column: 2;
    grid-row: 1;
  }

  .checkout-line__side {
    grid-column: 1 / span 2;
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
  .checkout-line {
    grid-template-columns: 1fr;
  }

  .checkout-line__thumb,
  .checkout-line__main,
  .checkout-line__side {
    grid-column: 1;
    grid-row: auto;
  }

  .checkout-line__side {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
