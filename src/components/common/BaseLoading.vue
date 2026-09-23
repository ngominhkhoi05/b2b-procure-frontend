<script setup>
/**
 * BaseLoading — reusable loading indicator.
 *
 * Props:
 *   label   — optional text displayed below the spinner
 *   inline  — renders a small inline spinner (no overlay)
 */
defineProps({
  label: {
    type: String,
    default: '',
  },
  inline: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <!-- Full-screen loading overlay -->
  <div v-if="!inline" class="base-loading" role="status" aria-live="polite">
    <div class="base-loading__inner">
      <span class="base-loading__spinner" aria-hidden="true" />
      <p v-if="label" class="base-loading__label">{{ label }}</p>
    </div>
  </div>

  <!-- Inline spinner -->
  <span v-else class="base-loading base-loading--inline" role="status" aria-label="Đang tải">
    <span class="base-loading__spinner" aria-hidden="true" />
    <span v-if="label" class="base-loading__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.base-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  width: 100%;
}

.base-loading__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.base-loading__spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-primary-light);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spin 0.7s linear infinite;
}

.base-loading--inline .base-loading__spinner {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.base-loading__label {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
