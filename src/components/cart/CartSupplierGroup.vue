<script setup>
/**
 * CartSupplierGroup — renders the items belonging to a single supplier.
 *
 * Why group by supplier?
 *   The cart can contain products from multiple suppliers. Phase 6 will
 *   require a buyer to choose ONE supplier per checkout, so we group here
 *   to keep that entry point clean.
 *
 * Props:
 *   supplierName   — string
 *   supplierId     — number | string
 *   items          — CartItemResponse[]
 *   submittingId   — productId currently being mutated, or null
 *
 * Emits:
 *   update-quantity({ productId, quantity })
 *   remove(productId)
 */
import CartItem from './CartItem.vue'

defineProps({
  supplierName: {
    type: String,
    default: 'Nhà cung cấp',
  },
  supplierId: {
    type: [Number, String],
    default: 0,
  },
  items: {
    type: Array,
    default: () => [],
  },
  submittingId: {
    type: [Number, String, null],
    default: null,
  },
})

defineEmits(['update-quantity', 'remove'])
</script>

<template>
  <section class="cart-supplier-group" :aria-labelledby="`supplier-${supplierId}`">
    <header class="cart-supplier-group__header">
      <span class="cart-supplier-group__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
        </svg>
      </span>
      <h2 :id="`supplier-${supplierId}`" class="cart-supplier-group__title">
        {{ supplierName }}
      </h2>
      <span class="cart-supplier-group__count">
        {{ items.length }} sản phẩm
      </span>
    </header>

    <div class="cart-supplier-group__list">
      <CartItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        :submitting="submittingId === item.productId"
        @update-quantity="$emit('update-quantity', $event)"
        @remove="$emit('remove', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.cart-supplier-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cart-supplier-group__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.cart-supplier-group__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-radius: var(--radius-md);
}

.cart-supplier-group__icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.cart-supplier-group__title {
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

.cart-supplier-group__count {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.cart-supplier-group__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
