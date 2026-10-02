<script setup>
/**
 * BaseModal — reusable modal / dialog component.
 *
 * Props:
 *   modelValue       — v-model: whether the modal is open
 *   title            — dialog title text
 *   size             — 'sm' | 'md' | 'lg' | 'xl'
 *   closeOnBackdrop  — close when clicking the backdrop
 *   closeOnEscape     — close when pressing Escape
 *
 * Slots:
 *   default  — modal content
 *   footer   — optional footer (buttons, etc.)
 *
 * Emits:
 *   update:modelValue
 *   close
 */
import { watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v),
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEscape: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdropClick(e) {
  if (props.closeOnBackdrop && e.target === e.currentTarget) {
    close()
  }
}

function onKeydown(e) {
  if (props.closeOnEscape && e.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
  { immediate: true }
)

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'modal-title' : undefined"
        @click="onBackdropClick"
      >
        <div :class="['modal-panel', `modal-panel--${size}`]">
          <!-- Header -->
          <div v-if="title || $slots.header" class="modal-header">
            <slot name="header">
              <h3 id="modal-title" class="modal-title">{{ title }}</h3>
            </slot>
            <button
              class="modal-close"
              aria-label="Đóng"
              @click="close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background-color: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(2px);
}

/* Panel */
.modal-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-height: calc(100dvh - var(--space-8));
  width: 100%;
}

.modal-panel--sm { max-width: 400px; }
.modal-panel--md { max-width: 560px; }
.modal-panel--lg { max-width: 720px; }
.modal-panel--xl { max-width: 960px; }

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-title {
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition: background-color var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.modal-close:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.modal-close svg {
  width: 18px;
  height: 18px;
}

/* Body */
.modal-body {
  padding: var(--space-6);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-base);
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform var(--transition-base), opacity var(--transition-base);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel {
  transform: translateY(16px) scale(0.97);
  opacity: 0;
}

.modal-leave-to .modal-panel {
  transform: translateY(8px) scale(0.97);
  opacity: 0;
}
</style>
