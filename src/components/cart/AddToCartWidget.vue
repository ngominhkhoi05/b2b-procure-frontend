<script setup>
/**
 * AddToCartWidget — Buyer-only quantity stepper + "Add to Cart" button.
 *
 * Mounted inside ProductDetailView for BUYER users only. The parent decides
 * whether to render it based on the auth role.
 *
 * Props:
 *   availableQuantity — number | null (max sensible quantity; null = unknown)
 *   disabled          — boolean (e.g. product inactive, already submitting)
 *
 * Emits:
 *   add(quantity)
 *
 * Notes:
 *   - Client-side validation only mirrors backend rules for immediate UX.
 *     The backend is authoritative.
 *   - Cart does NOT reserve stock. We only avoid letting the user type
 *     an obviously-incorrect value.
 */
import { ref, computed, watch } from 'vue'
import { formatNumber } from '@/utils/format'
import BaseButton from '@/components/common/BaseButton.vue'
import CartQuantityControl from '@/components/cart/CartQuantityControl.vue'

const props = defineProps({
  availableQuantity: {
    type: Number,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['add'])

const quantity = ref(1)

const error = computed(() => {
  if (!quantity.value || quantity.value < 1) {
    return 'Số lượng phải lớn hơn 0'
  }
  if (
    props.availableQuantity != null &&
    quantity.value > props.availableQuantity
  ) {
    return `Chỉ còn ${formatNumber(props.availableQuantity)} sản phẩm có thể bán`
  }
  return ''
})

const canAdd = computed(() => !error.value && !props.disabled)

function onQuantityChange(value) {
  quantity.value = value
}

function onAdd() {
  if (!canAdd.value) return
  emit('add', quantity.value)
}

watch(
  () => props.disabled,
  (val) => {
    if (val) quantity.value = 1
  }
)
</script>

<template>
  <section class="add-to-cart" aria-label="Thêm vào giỏ hàng">
    <div class="add-to-cart__row">
      <label class="add-to-cart__label" for="add-to-cart-qty">Số lượng</label>
      <CartQuantityControl
        id="add-to-cart-qty"
        :model-value="quantity"
        :min="1"
        :max="availableQuantity ?? null"
        :disabled="disabled"
        @update:modelValue="onQuantityChange"
      />
    </div>

    <p
      v-if="error"
      class="add-to-cart__error"
      role="alert"
    >
      {{ error }}
    </p>

    <BaseButton
      variant="primary"
      block
      :disabled="!canAdd"
      :loading="disabled"
      @click="onAdd"
    >
      Thêm vào giỏ hàng
    </BaseButton>
  </section>
</template>

<style scoped>
.add-to-cart {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.add-to-cart__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.add-to-cart__label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
}

.add-to-cart__error {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-danger);
  background: var(--color-danger-bg);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}
</style>
