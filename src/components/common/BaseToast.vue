<script setup>
/**
 * BaseToast — application-wide toast notification container.
 *
 * Renders in App.vue. Consumes the toast store.
 * Individual toasts are added via `useToastStore().success/error/warning/info()`.
 *
 * Usage in any component:
 *   import { useToastStore } from '@/stores/toast'
 *   const toast = useToastStore()
 *   toast.success('Thao tác thành công!')
 */
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const ICONS = {
  success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/></svg>`,
  error:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/></svg>`,
  warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg>`,
  info:    `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd"/></svg>`,
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="t in toastStore.toasts"
          :key="t.id"
          :class="['toast', `toast--${t.type}`]"
          role="alert"
        >
          <span
            class="toast__icon"
            aria-hidden="true"
            v-html="ICONS[t.type] || ICONS.info"
          />
          <span class="toast__message">{{ t.message }}</span>
          <button
            class="toast__close"
            :aria-label="`Đóng thông báo: ${t.message}`"
            @click="toastStore.removeToast(t.id)"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-end;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 280px;
  max-width: 400px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid;
  pointer-events: auto;
}

.toast--success { border-color: var(--color-success); }
.toast--error   { border-color: var(--color-danger);  }
.toast--warning { border-color: var(--color-warning); }
.toast--info    { border-color: var(--color-info);    }

.toast__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
}

.toast--success .toast__icon { color: var(--color-success); }
.toast--error   .toast__icon { color: var(--color-danger);  }
.toast--warning .toast__icon { color: var(--color-warning); }
.toast--info    .toast__icon { color: var(--color-info);    }

.toast__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.toast__message {
  flex: 1;
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
}

.toast__close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.toast__close:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-alt);
}

.toast__close svg {
  width: 14px;
  height: 14px;
}

/* TransitionGroup animations */
.toast-enter-active {
  transition: all var(--transition-base);
}
.toast-leave-active {
  transition: all var(--transition-base);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.toast-move {
  transition: transform var(--transition-base);
}
</style>
