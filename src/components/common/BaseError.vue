<script setup>
/**
 * BaseError — reusable error state component.
 *
 * Props:
 *   title    — error heading
 *   message  — descriptive error message
 *   error    — normalised ApiError object (shows detail)
 *
 * Emits: retry
 */
defineProps({
  title: {
    type: String,
    default: 'Đã xảy ra lỗi',
  },
  message: {
    type: String,
    default: '',
  },
  error: {
    type: [Object, null],
    default: null,
  },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <div class="base-error" role="alert">
    <!-- Icon -->
    <div class="base-error__icon" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="2"/>
        <line x1="32" y1="20" x2="32" y2="36" stroke="currentColor"
          stroke-width="3" stroke-linecap="round"/>
        <circle cx="32" cy="44" r="2" fill="currentColor"/>
      </svg>
    </div>

    <h3 class="base-error__title">{{ title }}</h3>

    <p v-if="message || error?.message" class="base-error__message">
      {{ message || error?.message }}
    </p>

    <p v-if="error?.code" class="base-error__code">
      Mã lỗi: <code>{{ error.code }}</code>
    </p>

    <div v-if="$slots.default" class="base-error__actions">
      <slot />
    </div>

    <button
      v-else
      class="base-error__retry"
      @click="emit('retry')"
    >
      Thử lại
    </button>
  </div>
</template>

<style scoped>
.base-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
  min-height: 200px;
}

.base-error__icon {
  width: 56px;
  height: 56px;
  color: var(--color-danger);
  margin-bottom: var(--space-4);
}

.base-error__title {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2);
}

.base-error__message {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  max-width: 400px;
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-3);
}

.base-error__code {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  margin: 0 0 var(--space-4);
}

.base-error__code code {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.base-error__retry {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-5);
  background: var(--color-danger);
  color: #fff;
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.base-error__retry:hover {
  background: #B91C1C;
}

.base-error__actions {
  margin-top: var(--space-4);
}
</style>
