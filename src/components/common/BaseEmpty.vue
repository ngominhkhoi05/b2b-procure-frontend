<script setup>
/**
 * BaseEmpty — reusable empty state component.
 *
 * Props:
 *   title       — main message
 *   description — optional longer description
 *   icon        — optional icon name (future: Lucide icon key)
 */
defineProps({
  title: {
    type: String,
    default: 'Không có dữ liệu',
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="base-empty" role="status">
    <!-- Illustration -->
    <div class="base-empty__icon" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor"
          stroke-width="2" stroke-dasharray="4 3"/>
        <line x1="8" y1="24" x2="56" y2="24" stroke="currentColor"
          stroke-width="2" stroke-linecap="round"/>
        <line x1="20" y1="12" x2="20" y2="24" stroke="currentColor"
          stroke-width="2" stroke-linecap="round"/>
        <line x1="44" y1="12" x2="44" y2="24" stroke="currentColor"
          stroke-width="2" stroke-linecap="round"/>
        <circle cx="32" cy="38" r="8" stroke="currentColor" stroke-width="2"/>
        <line x1="28" y1="38" x2="36" y2="38" stroke="currentColor"
          stroke-width="2" stroke-linecap="round"/>
        <line x1="32" y1="34" x2="32" y2="42" stroke="currentColor"
          stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>

    <h3 class="base-empty__title">{{ title }}</h3>
    <p v-if="description" class="base-empty__desc">{{ description }}</p>

    <!-- Slot for action buttons -->
    <div v-if="$slots.default" class="base-empty__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.base-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
  min-height: 200px;
}

.base-empty__icon {
  width: 64px;
  height: 64px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}

.base-empty__title {
  font-size: var(--font-md);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-2);
}

.base-empty__desc {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  max-width: 320px;
  line-height: var(--leading-relaxed);
  margin: 0;
}

.base-empty__actions {
  margin-top: var(--space-4);
}
</style>
