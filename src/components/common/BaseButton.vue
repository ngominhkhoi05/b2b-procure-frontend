<script setup>
/**
 * BaseButton — reusable button component.
 *
 * Props:
 *   variant  — 'primary' | 'secondary' | 'danger' | 'ghost'
 *   type     — native button type attribute
 *   disabled — disables the button
 *   loading  — shows spinner, disables the button
 *   block    — full-width button
 *
 * Emits: click
 */
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost'].includes(v),
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  block: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])
</script>

<template>
  <button
    :type="type"
    :class="['base-btn', `base-btn--${variant}`, { 'base-btn--block': block }]"
    :disabled="disabled || loading"
    v-bind="$attrs"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="base-btn__spinner" aria-hidden="true" />
    <span :class="{ 'base-btn__content--loading': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  padding: var(--space-2) var(--space-4);
  min-height: 38px;
  border-radius: var(--radius-md);
  font-size: var(--font-base);
  font-weight: var(--weight-medium);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);
  user-select: none;
}

.base-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Primary */
.base-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}
.base-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}
.base-btn--primary:active:not(:disabled) {
  background-color: var(--color-primary-active);
}

/* Secondary */
.base-btn--secondary {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}
.base-btn--secondary:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  border-color: var(--color-border-strong);
}
.base-btn--secondary:active:not(:disabled) {
  background-color: var(--color-border);
}

/* Danger */
.base-btn--danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}
.base-btn--danger:hover:not(:disabled) {
  background-color: #B91C1C;
}
.base-btn--danger:active:not(:disabled) {
  background-color: #991B1B;
}

/* Ghost */
.base-btn--ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
}
.base-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}
.base-btn--ghost:active:not(:disabled) {
  background-color: var(--color-border);
}

/* Full-width */
.base-btn--block {
  display: flex;
  width: 100%;
}

/* Spinner */
.base-btn__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: base-btn-spin 0.6s linear infinite;
  flex-shrink: 0;
}

.base-btn__content--loading {
  opacity: 0.7;
}

@keyframes base-btn-spin {
  to { transform: rotate(360deg); }
}
</style>
