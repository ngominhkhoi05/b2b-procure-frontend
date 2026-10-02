<script setup>
/**
 * CategoryForm — reusable form for create + edit categories.
 *
 * Props:
 *   initial    — CategoryResponse | null
 *   submitting — boolean
 *   errors     — Record<string,string>
 *
 * Emits:
 *   submit({ name, description })
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
  errors: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['submit', 'cancel'])

const isEdit = computed(() => Boolean(props.initial?.id))

const form = reactive({
  name: '',
  description: '',
})

const localErrors = reactive({
  name: '',
  description: '',
})

watch(
  () => props.initial,
  (p) => {
    if (p) {
      form.name = p.name || ''
      form.description = p.description || ''
    } else {
      form.name = ''
      form.description = ''
    }
    localErrors.name = ''
    localErrors.description = ''
  },
  { immediate: true }
)

function validate() {
  let valid = true
  localErrors.name = ''
  localErrors.description = ''

  if (!form.name.trim()) {
    localErrors.name = 'Tên danh mục là bắt buộc'
    valid = false
  }

  return valid
}

function onSubmit() {
  if (!validate()) return
  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim() || null,
  })
}

function clearError(field) {
  localErrors[field] = ''
}

function getError(field) {
  return localErrors[field] || props.errors?.[field] || ''
}
</script>

<template>
  <form class="category-form" novalidate @submit.prevent="onSubmit">
    <div v-if="errors.general" class="category-form__general-error" role="alert">
      {{ errors.general }}
    </div>

    <BaseInput
      v-model="form.name"
      label="Tên danh mục"
      placeholder="Nhập tên danh mục"
      :error="getError('name')"
      :disabled="submitting"
      required
      @update:modelValue="clearError('name')"
    />

    <BaseInput
      v-model="form.description"
      label="Mô tả"
      placeholder="Mô tả (không bắt buộc)"
      :error="getError('description')"
      :disabled="submitting"
      @update:modelValue="clearError('description')"
    />

    <div class="category-form__actions">
      <button
        type="button"
        class="category-form__btn category-form__btn--ghost"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Hủy
      </button>
      <button
        type="submit"
        class="category-form__btn category-form__btn--primary"
        :disabled="submitting"
      >
        <span v-if="submitting" class="category-form__spinner" aria-hidden="true" />
        {{ isEdit ? 'Cập nhật' : 'Tạo danh mục' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.category-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.category-form__general-error {
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.category-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-2);
}

.category-form__btn {
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

.category-form__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.category-form__btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.category-form__btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.category-form__btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.category-form__btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.category-form__spinner {
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
</style>
