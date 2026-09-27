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
 *   selectable     — boolean  (Phase 6 — show per-item checkboxes + a
 *                              supplier-level "select all" checkbox)
 *
 * Emits:
 *   update-quantity({ productId, quantity })
 *   remove(productId)
 *   update-item-selected({ cartItemId, selected })
 *   toggle-all(boolean)
 */
import { computed } from 'vue'
import CartItem from './CartItem.vue'

const props = defineProps({
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
  selectable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update-quantity',
  'remove',
  'update-item-selected',
  'toggle-all',
])

const availableItems = computed(() =>
  props.items.filter((i) => i.available && i.unitPrice != null)
)

const selectedAvailableCount = computed(() => {
  return props.items.filter(
    (i) => i.selected && i.available && i.unitPrice != null
  ).length
})

const allSelected = computed(() => {
  if (availableItems.value.length === 0) return false
  return selectedAvailableCount.value === availableItems.value.length
})

const someSelected = computed(() => {
  return selectedAvailableCount.value > 0 && !allSelected.value
})

function onHeaderCheckboxChange(e) {
  emit('toggle-all', e.target.checked)
}
</script>

<template>
  <section class="cart-supplier-group" :aria-labelledby="`supplier-${supplierId}`">
    <header class="cart-supplier-group__header">
      <label v-if="selectable" class="cart-supplier-group__select-all">
        <input
          type="checkbox"
          class="cart-supplier-group__select-all-input"
          :checked="allSelected"
          :indeterminate.prop="someSelected"
          :disabled="availableItems.length === 0"
          :aria-label="`Chọn tất cả sản phẩm khả dụng của ${supplierName}`"
          @change="onHeaderCheckboxChange"
        />
        <span class="cart-supplier-group__select-all-visual" aria-hidden="true">
          <svg v-if="allSelected" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <svg v-else-if="someSelected" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 11h14v2H5z"/>
          </svg>
        </span>
      </label>
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
        :selectable="selectable"
        :selected="Boolean(item.selected)"
        @update-quantity="$emit('update-quantity', $event)"
        @remove="$emit('remove', $event)"
        @update:selected="$emit('update-item-selected', { cartItemId: item.id, selected: $event })"
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

.cart-supplier-group__select-all {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  cursor: pointer;
}

.cart-supplier-group__select-all-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.cart-supplier-group__select-all-input:disabled {
  cursor: not-allowed;
}

.cart-supplier-group__select-all-visual {
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

.cart-supplier-group__select-all-visual :deep(svg) {
  width: 14px;
  height: 14px;
}

.cart-supplier-group__select-all-input:checked + .cart-supplier-group__select-all-visual {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.cart-supplier-group__select-all-input:disabled + .cart-supplier-group__select-all-visual {
  background-color: var(--color-surface-alt);
  border-color: var(--color-border);
  opacity: 0.5;
}

.cart-supplier-group__select-all-input:focus-visible + .cart-supplier-group__select-all-visual {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
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
