<script setup>
/**
 * BaseInput — reusable text input component.
 *
 * Props:
 *   modelValue  — v-model binding
 *   label       — field label text
 *   placeholder — input placeholder
 *   type        — native input type (text, email, password, etc.)
 *   error       — error message string (shows error state)
 *   disabled    — disables the input
 *   id          — id for label association
 *   required    — marks field as required
 *   autocomplete — native autocomplete attribute
 *
 * Emits: update:modelValue
 */
defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
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
    default: () => `input-${Math.random().toString(36).slice(2)}`,
  },
  required: {
    type: Boolean,
    default: false,
  },
  autocomplete: {
    type: String,
    default: 'off',
  },
})

const emit = defineEmits(['update:modelValue'])

function onInput(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<template>
  <div class="base-input" :class="{ 'base-input--error': error, 'base-input--disabled': disabled }">
    <label v-if="label" :for="id" class="base-input__label">
      {{ label }}
      <span v-if="required" class="base-input__required" aria-hidden="true">*</span>
    </label>

    <div class="base-input__wrapper">
      <slot name="prefix" />
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        class="base-input__field"
        v-bind="$attrs"
        @input="onInput"
      />
      <slot name="suffix" />
    </div>

    <p v-if="error" class="base-input__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.base-input__label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  user-select: none;
}

.base-input__required {
  color: var(--color-danger);
  margin-left: 2px;
}

.base-input__wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.base-input__wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.base-input--error .base-input__wrapper {
  border-color: var(--color-danger);
}

.base-input--error .base-input__wrapper:focus-within {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.base-input__field {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-base);
  outline: none;
}

.base-input--disabled .base-input__wrapper {
  background-color: var(--color-surface-alt);
  cursor: not-allowed;
}

.base-input--disabled .base-input__label {
  color: var(--color-text-muted);
}

.base-input--disabled .base-input__field {
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.base-input__error {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-danger);
}
</style>
