<script setup>
/**
 * BaseSelect — reusable dropdown / select component.
 *
 * Props:
 *   modelValue  — currently selected value
 *   label       — field label text
 *   options     — Array<{ value: any, label: string }>
 *   placeholder — placeholder shown when nothing is selected
 *   error       — error message string
 *   disabled    — disables the select
 *   id          — id for label association
 *   required    — marks field as required
 *
 * Emits: update:modelValue
 */
defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null,
  },
  label: {
    type: String,
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
    validator: (v) =>
      v.every((o) => 'value' in o && 'label' in o),
  },
  placeholder: {
    type: String,
    default: '— Chọn —',
  },
  error: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: () => `select-${Math.random().toString(36).slice(2)}`,
  },
  required: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

function onChange(e) {
  const val = e.target.value
  // Return null for the placeholder (empty) option
  emit('update:modelValue', val === '' ? null : val)
}
</script>

<template>
  <div
    class="base-select"
    :class="{ 'base-select--error': error, 'base-select--disabled': disabled }"
  >
    <label v-if="label" :for="id" class="base-select__label">
      {{ label }}
      <span v-if="required" class="base-select__required" aria-hidden="true">*</span>
    </label>

    <div class="base-select__wrapper">
      <select
        :id="id"
        :value="modelValue ?? ''"
        :disabled="disabled"
        :required="required"
        class="base-select__field"
        v-bind="$attrs"
        @change="onChange"
      >
        <option value="">{{ placeholder }}</option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <!-- Chevron icon -->
      <svg class="base-select__chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clip-rule="evenodd" />
      </svg>
    </div>

    <p v-if="error" class="base-select__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.base-select {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.base-select__label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  user-select: none;
}

.base-select__required {
  color: var(--color-danger);
  margin-left: 2px;
}

.base-select__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.base-select__field {
  width: 100%;
  height: 38px;
  padding: 0 var(--space-8) 0 var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-base);
  appearance: none;
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.base-select__field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.base-select--error .base-select__field {
  border-color: var(--color-danger);
}

.base-select--error .base-select__field:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.base-select__chevron {
  position: absolute;
  right: var(--space-3);
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.base-select--disabled .base-select__field {
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.base-select--disabled .base-select__label {
  color: var(--color-text-muted);
}

.base-select__error {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-danger);
}
</style>
