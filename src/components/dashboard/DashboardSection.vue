<script setup>
/**
 * DashboardSection — consistent wrapper for a dashboard sub-section.
 *
 * Provides:
 *   - title + optional subtitle
 *   - optional right-aligned slot for actions / links
 *   - default slot for content (typically a grid of DashboardCard / RecentOrders)
 */
defineProps({
  title:    { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <section class="dashboard-section">
    <header class="dashboard-section__header">
      <div>
        <h2 class="dashboard-section__title">{{ title }}</h2>
        <p v-if="subtitle" class="dashboard-section__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="dashboard-section__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="dashboard-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.dashboard-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dashboard-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.dashboard-section__title {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.dashboard-section__subtitle {
  margin: 2px 0 0;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.dashboard-section__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.dashboard-section__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
