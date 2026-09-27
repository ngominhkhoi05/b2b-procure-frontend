<script setup>
/**
 * CartQuantityControl — reusable quantity stepper.
 *
 * Props:
 *   modelValue — current quantity
 *   min        — minimum allowed value (default 1)
 *   max        — maximum allowed value (optional, server is authoritative)
 *   disabled   — disables both buttons and the input
 *
 * Emits:
 *   update:modelValue — emitted whenever the user confirms a change
 *                       (button click or input blur / Enter).
 *
 * The parent decides when the actual API call is fired.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 1,
  },
  min: {
    type: Number,
    default: 1,
  },
  max: {
    type: Number,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

// Local draft so users can type freely; commit happens on blur / Enter / step.
const draft = ref(String(props.modelValue ?? props.min))

watch(
  () => props.modelValue,
  (v) => {
    draft.value = String(v ?? props.min)
  }
)

const canDecrement = computed(() => {
  const n = Number(draft.value)
  return Number.isFinite(n) && n > props.min && !props.disabled
})

const canIncrement = computed(() => {
  const n = Number(draft.value)
  if (props.disabled) return false
  if (!Number.isFinite(n)) return true
  if (props.max == null) return true
  return n < props.max
})

function clamp(value) {
  if (!Number.isFinite(value)) return props.min
  let v = Math.floor(value)
  if (v < props.min) v = props.min
  if (props.max != null && v > props.max) v = props.max
  return v
}

function commit() {
  const next = clamp(Number(draft.value))
  draft.value = String(next)
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
}

function step(delta) {
  const base = Number.isFinite(Number(draft.value))
    ? Number(draft.value)
    : props.modelValue ?? props.min
  const next = clamp(base + delta)
  draft.value = String(next)
  emit('update:modelValue', next)
}

function onInput(e) {
  draft.value = e.target.value
}

function onKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commit()
  } else if (e.key === 'Escape') {
    draft.value = String(props.modelValue ?? props.min)
  }
}
</script>

<template>
  <div class="qty-control" role="group" aria-label="Điều chỉnh số lượng">
    <button
      type="button"
      class="qty-control__btn"
      :disabled="!canDecrement"
      aria-label="Giảm số lượng"
      @click="step(-1)"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 11h14v2H5z"/>
      </svg>
    </button>

    <input
      type="number"
      class="qty-control__input"
      :value="draft"
      :min="min"
      :max="max ?? undefined"
      :step="1"
      :disabled="disabled"
      inputmode="numeric"
      aria-label="Số lượng"
      @input="onInput"
      @blur="commit"
      @keydown="onKeydown"
    />

    <button
      type="button"
      class="qty-control__btn"
      :disabled="!canIncrement"
      aria-label="Tăng số lượng"
      @click="step(1)"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.qty-control {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  overflow: hidden;
}

.qty-control__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  color: var(--color-text-secondary);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.qty-control__btn:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.qty-control__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-control__btn :deep(svg) {
  width: 16px;
  height: 16px;
}

.qty-control__input {
  width: 60px;
  height: 36px;
  border: none;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  background: transparent;
  text-align: center;
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
  appearance: textfield;
}

.qty-control__input::-webkit-outer-spin-button,
.qty-control__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.qty-control__input:focus {
  outline: none;
  background-color: var(--color-surface-alt);
}

.qty-control__input:disabled {
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
  cursor: not-allowed;
}
</style>
