<script setup>
/**
 * ProductStatusBadge — coloured badge for product status.
 *
 * Backend status values: "ACTIVE" or "INACTIVE".
 * Uses existing colour tokens from the design system.
 */
defineProps({
  status: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <span
    :class="[
      'product-status-badge',
      `product-status-badge--${status || 'unknown'}`,
    ]"
    role="status"
  >
    {{ status || 'Không rõ' }}
  </span>
</template>

<style scoped>
.product-status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  line-height: 1.4;
  white-space: nowrap;
}

.product-status-badge--ACTIVE {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.product-status-badge--INACTIVE {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.product-status-badge--unknown {
  background-color: var(--color-surface-alt);
  color: var(--color-text-muted);
}
</style>
