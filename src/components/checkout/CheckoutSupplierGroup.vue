<script setup>
/**
 * CheckoutSupplierGroup — read-only list of the items the buyer is
 * about to check out (single supplier, all items pre-validated).
 *
 * Layout: each row is a single compact horizontal line —
 *   thumb → name + SKU → unit price → quantity → subtotal (highlighted)
 *
 * Props:
 *   supplierName — string
 *   items        — CheckoutSelectionItem[]
 *
 * Emits: none (read-only).
 *
 * Read-only by design: quantity, remove, and selection controls are
 * not exposed here. If items drift (price, stock, supplier) the page
 * bounces the user back to /cart.
 */
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
        <!-- Thumbnail -->
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

        <!-- Name + SKU -->
        <div class="checkout-line__heading">
          <h3 class="checkout-line__name" :title="item.productName">
            {{ item.productName }}
          </h3>
          <span class="checkout-line__sku">SKU: {{ item.sku }}</span>
        </div>

        <!-- Unit price -->
        <div class="checkout-line__price-col">
          <span class="checkout-line__caption">Đơn giá</span>
          <span v-if="hasUnitPrice(item)" class="checkout-line__price">
            {{ formatCurrency(item.unitPrice) }}
          </span>
          <span v-else class="checkout-line__price checkout-line__price--missing">—</span>
        </div>

        <!-- Quantity (read-only text) -->
        <div class="checkout-line__qty-col">
          <span class="checkout-line__caption">Số lượng</span>
          <span class="checkout-line__qty">
            <span class="checkout-line__qty-label">SL:</span>
            <span class="checkout-line__qty-value">{{ formatNumber(item.quantity) }}</span>
          </span>
        </div>

        <!-- Subtotal (highlighted, right-aligned) -->
        <div class="checkout-line__subtotal-col">
          <span class="checkout-line__caption">Thành tiền</span>
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
  grid-template-columns: 72px minmax(0, 1.4fr) 110px auto 120px;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.checkout-line__thumb {
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
  width: 32px;
  height: 32px;
  opacity: 0.6;
}

/* ── Name + SKU (single-line ellipsis) ────────────────────────────── */
.checkout-line__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.checkout-line__name {
  margin: 0;
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checkout-line__sku {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Caption + value columns ─────────────────────────────────────────── */
.checkout-line__price-col,
.checkout-line__qty-col,
.checkout-line__subtotal-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.checkout-line__price-col {
  align-items: flex-start;
}

.checkout-line__qty-col {
  align-items: flex-start;
}

.checkout-line__subtotal-col {
  align-items: flex-end;
  text-align: right;
}

.checkout-line__caption {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
}

.checkout-line__price {
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.checkout-line__price--missing {
  color: var(--color-text-muted);
}

/* ── Quantity (read-only chip) ─────────────────────────────────────── */
.checkout-line__qty {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-1);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.checkout-line__qty-label {
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.checkout-line__qty-value {
  font-size: var(--font-base);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

/* ── Subtotal (highlighted) ────────────────────────────────────────── */
.checkout-line__subtotal {
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.checkout-line__subtotal--missing {
  color: var(--color-text-muted);
}

/* ── Responsive ────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .checkout-line {
    grid-template-columns: 64px minmax(0, 1fr) auto 32px;
    grid-template-rows: auto auto;
    column-gap: var(--space-3);
    row-gap: var(--space-2);
  }

  .checkout-line__thumb {
    grid-column: 1;
    grid-row: 1;
    width: 64px;
    height: 64px;
  }

  .checkout-line__heading {
    grid-column: 2 / span 2;
    grid-row: 1;
  }

  .checkout-line__price-col {
    grid-column: 1;
    grid-row: 2;
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
  }

  .checkout-line__qty-col {
    grid-column: 2;
    grid-row: 2;
  }

  .checkout-line__subtotal-col {
    grid-column: 3;
    grid-row: 2;
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
  }
}

@media (max-width: 560px) {
  .checkout-line {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .checkout-line__thumb {
    display: none;
  }

  .checkout-line__heading,
  .checkout-line__price-col,
  .checkout-line__qty-col,
  .checkout-line__subtotal-col {
    grid-column: 1;
    grid-row: auto;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .checkout-line__subtotal-col {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-2);
  }
}
</style>
