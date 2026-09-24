<script setup>
/**
 * ProductPriceTierForm — small reusable form for creating / editing
 * a single B2B price tier.
 *
 * Props:
 *   initial    — { minQuantity, maxQuantity, unitPrice } | null
 *   submitting — boolean
 *   error      — string | null   (general error message from backend)
 *
 * Emits:
 *   submit({ minQuantity, maxQuantity, unitPrice })
 *   cancel()
 */
import { reactive, computed, watch } from 'vue'
import BaseInput from '@/components/common/BaseInput.vue'

const props = defineProps({
  initial: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['submit', 'cancel'])

const isEdit = computed(() => Boolean(props.initial?.id))

const form = reactive({
  minQuantity: 1,
  maxQuantity: null, // null = unlimited
  unitPrice: '',
})

const errors = reactive({
  minQuantity: '',
  maxQuantity: '',
  unitPrice: '',
})

watch(
  () => props.initial,
  (p) => {
    if (p) {
      form.minQuantity = p.minQuantity ?? 1
      form.maxQuantity = p.maxQuantity ?? null
      form.unitPrice = p.unitPrice != null ? String(p.unitPrice) : ''
    } else {
      form.minQuantity = 1
      form.maxQuantity = null
      form.unitPrice = ''
    }
    errors.minQuantity = ''
    errors.maxQuantity = ''
    errors.unitPrice = ''
  },
  { immediate: true }
)

function validate() {
  let valid = true
  errors.minQuantity = ''
  errors.maxQuantity = ''
  errors.unitPrice = ''

  const min = Number(form.minQuantity)
  if (!Number.isFinite(min) || min < 1 || !Number.isInteger(min)) {
    errors.minQuantity = 'Số lượng tối thiểu phải là số nguyên ≥ 1'
    valid = false
  }

  if (form.maxQuantity !== null && form.maxQuantity !== '' && form.maxQuantity !== undefined) {
    const max = Number(form.maxQuantity)
    if (!Number.isFinite(max) || !Number.isInteger(max)) {
      errors.maxQuantity = 'Số lượng tối đa phải là số nguyên'
      valid = false
    } else if (Number.isFinite(min) && max < min) {
      errors.maxQuantity = 'Số lượng tối đa phải lớn hơn hoặc bằng số lượng tối thiểu'
      valid = false
    }
  }

  const price = Number(form.unitPrice)
  if (!form.unitPrice || !Number.isFinite(price) || price <= 0) {
    errors.unitPrice = 'Đơn giá phải là số dương'
    valid = false
  }

  return valid
}

function onSubmit() {
  if (!validate()) return

  const payload = {
    minQuantity: Number(form.minQuantity),
    unitPrice: String(form.unitPrice),
  }

  // null = unlimited. Backend treats null and missing the same way.
  if (form.maxQuantity === null || form.maxQuantity === '' || form.maxQuantity === undefined) {
    payload.maxQuantity = null
  } else {
    payload.maxQuantity = Number(form.maxQuantity)
  }

  emit('submit', payload)
}

function clearError(field) {
  errors[field] = ''
}
</script>

<template>
  <form class="tier-form" novalidate @submit.prevent="onSubmit">
    <div v-if="error" class="tier-form__error" role="alert">
      {{ error }}
    </div>

    <div class="tier-form__grid">
      <BaseInput
        v-model.number="form.minQuantity"
        label="Số lượng tối thiểu"
        type="number"
        :min="1"
        :error="errors.minQuantity"
        :disabled="submitting"
        required
        @update:modelValue="clearError('minQuantity')"
      />
      <BaseInput
        v-model.number="form.maxQuantity"
        label="Số lượng tối đa (bỏ trống = ∞)"
        type="number"
        :min="form.minQuantity || 1"
        :error="errors.maxQuantity"
        :disabled="submitting"
        @update:modelValue="clearError('maxQuantity')"
      />
      <BaseInput
        v-model="form.unitPrice"
        label="Đơn giá (VND)"
        type="number"
        :min="0"
        step="1000"
        placeholder="VD: 100000"
        :error="errors.unitPrice"
        :disabled="submitting"
        required
        @update:modelValue="clearError('unitPrice')"
      />
    </div>

    <div class="tier-form__actions">
      <button
        type="button"
        class="tier-form__btn tier-form__btn--ghost"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Hủy
      </button>
      <button
        type="submit"
        class="tier-form__btn tier-form__btn--primary"
        :disabled="submitting"
      >
        <span v-if="submitting" class="tier-form__spinner" aria-hidden="true" />
        {{ isEdit ? 'Cập nhật' : 'Thêm' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.tier-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.tier-form__error {
  padding: var(--space-2) var(--space-3);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.tier-form__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.tier-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.tier-form__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 38px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid transparent;
}

.tier-form__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tier-form__btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.tier-form__btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.tier-form__btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.tier-form__btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.tier-form__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .tier-form__grid {
    grid-template-columns: 1fr;
  }
}
</style>
