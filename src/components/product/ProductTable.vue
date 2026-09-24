<script setup>
/**
 * ProductTable — admin/supplier row table for products.
 *
 * Props:
 *   products  — ProductResponse[]
 *   loading   — boolean
 *
 * Emits: row-click (product), action (eventName, product)
 *
 * Action slots:
 *   default — "actions" column receives a slot for action buttons.
 */
import { formatNumber } from '@/utils/format'
import ProductStatusBadge from './ProductStatusBadge.vue'

defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['row-click'])

function onImgError(e) {
  e.target.style.display = 'none'
}
</script>

<template>
  <div class="product-table" :class="{ 'product-table--loading': loading }">
    <table class="product-table__table" role="table">
      <thead>
        <tr>
          <th class="product-table__th product-table__th--media" />
          <th class="product-table__th">Tên sản phẩm</th>
          <th class="product-table__th">SKU</th>
          <th class="product-table__th">Danh mục</th>
          <th class="product-table__th">Nhà cung cấp</th>
          <th class="product-table__th product-table__th--num">Tồn kho</th>
          <th class="product-table__th">Trạng thái</th>
          <th class="product-table__th product-table__th--actions" />
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading && (!products || products.length === 0)">
          <td colspan="8" class="product-table__loading">Đang tải...</td>
        </tr>
        <tr v-else-if="!products || products.length === 0">
          <td colspan="8" class="product-table__empty">Không có sản phẩm</td>
        </tr>
        <tr
          v-for="p in products"
          :key="p.id"
          class="product-table__row"
          @click="$emit('row-click', p)"
        >
          <td class="product-table__media-cell">
            <div class="product-table__thumb">
              <img
                v-if="p.imageUrl"
                :src="p.imageUrl"
                :alt="p.name"
                loading="lazy"
                @error="onImgError"
              />
              <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
          </td>
          <td class="product-table__name-cell">
            <span class="product-table__name">{{ p.name }}</span>
            <span v-if="p.description" class="product-table__desc">{{ p.description }}</span>
          </td>
          <td class="product-table__cell">{{ p.sku }}</td>
          <td class="product-table__cell">{{ p.categoryName || '—' }}</td>
          <td class="product-table__cell">{{ p.supplierCompanyName || '—' }}</td>
          <td class="product-table__cell product-table__cell--num">
            <span v-if="p.availableQuantity != null">
              {{ formatNumber(p.availableQuantity) }}
            </span>
            <span v-else>—</span>
          </td>
          <td class="product-table__cell">
            <ProductStatusBadge :status="p.status" />
          </td>
          <td class="product-table__cell product-table__cell--actions" @click.stop>
            <slot name="actions" :product="p" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.product-table {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.product-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.product-table__th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-surface-alt);
  color: var(--color-text-secondary);
  font-weight: var(--weight-medium);
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
}

.product-table__th--media {
  width: 56px;
  padding: var(--space-2);
}

.product-table__th--num {
  text-align: right;
}

.product-table__th--actions {
  width: 1%;
  white-space: nowrap;
}

.product-table__row {
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.product-table__row:last-child {
  border-bottom: none;
}

.product-table__row:hover {
  background-color: var(--color-surface-alt);
}

.product-table__cell {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.product-table__cell--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.product-table__cell--actions {
  white-space: nowrap;
  text-align: right;
}

.product-table__media-cell {
  padding: var(--space-2);
  vertical-align: middle;
}

.product-table__thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-alt);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.product-table__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-table__thumb svg {
  width: 24px;
  height: 24px;
  opacity: 0.6;
}

.product-table__name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 280px;
}

.product-table__name {
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-table__desc {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-table__loading,
.product-table__empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-muted);
}

.product-table--loading .product-table__row {
  opacity: 0.7;
}

@media (max-width: 900px) {
  .product-table__table,
  .product-table__thead,
  .product-table__tbody,
  .product-table__tr,
  .product-table__th,
  .product-table__cell {
    display: block;
  }

  .product-table__thead {
    display: none;
  }

  .product-table__row {
    display: block;
    padding: var(--space-3);
  }

  .product-table__row + .product-table__row {
    border-top: 1px solid var(--color-border);
  }

  .product-table__cell {
    padding: var(--space-1) 0;
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    border: none;
  }

  .product-table__cell::before {
    content: attr(data-label);
    color: var(--color-text-muted);
    font-size: var(--font-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .product-table__media-cell {
    display: flex;
    justify-content: flex-start;
  }

  .product-table__cell--actions {
    justify-content: flex-end;
  }
}
</style>
