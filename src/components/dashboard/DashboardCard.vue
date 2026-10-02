<script setup>
/**
 * DashboardCard — single KPI tile used by role dashboards.
 *
 * Props:
 *   label       — KPI label (e.g. "Tổng đơn hàng")
 *   value       — string or number to display. Formatted by the caller
 *                 (formatCurrency / formatNumber) so this component stays pure.
 *   sub         — optional secondary text (e.g. "Tính đến hôm nay")
 *   loading     — shows a soft placeholder
 *   error       — optional Error object; if provided, value is hidden
 *   icon        — optional inline SVG path d-attribute
 *   accent      — 'default' | 'primary' | 'success' | 'warning' | 'danger'
 */
defineProps({
  label:    { type: String, required: true },
  value:    { type: [String, Number], default: '' },
  sub:      { type: String, default: '' },
  loading:  { type: Boolean, default: false },
  error:    { type: [Object, null], default: null },
  icon:     { type: String, default: '' },
  accent: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger'].includes(v),
  },
})

defineEmits(['retry'])
</script>

<template>
  <div :class="['dashboard-card', `dashboard-card--${accent}`]">
    <div class="dashboard-card__header">
      <span class="dashboard-card__label">{{ label }}</span>
      <span v-if="icon" class="dashboard-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path :d="icon" /></svg>
      </span>
    </div>

    <div v-if="loading" class="dashboard-card__loading" aria-hidden="true">
      <span class="dashboard-card__skeleton" />
    </div>

    <div v-else-if="error" class="dashboard-card__error">
      <p class="dashboard-card__error-text">Không thể tải</p>
      <button
        type="button"
        class="dashboard-card__retry"
        @click="$emit('retry')"
      >Thử lại</button>
    </div>

    <div v-else class="dashboard-card__body">
      <span class="dashboard-card__value">{{ value || '—' }}</span>
      <span v-if="sub" class="dashboard-card__sub">{{ sub }}</span>
    </div>
  </div>
</template>

<style scoped>
.dashboard-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 110px;
}

.dashboard-card--primary { border-left: 3px solid var(--color-primary); }
.dashboard-card--success { border-left: 3px solid var(--color-success); }
.dashboard-card--warning { border-left: 3px solid var(--color-warning); }
.dashboard-card--danger  { border-left: 3px solid var(--color-danger); }

.dashboard-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.dashboard-card__label {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  font-weight: var(--weight-medium);
}

.dashboard-card__icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  flex-shrink: 0;
}

.dashboard-card__icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.dashboard-card--success .dashboard-card__icon { background: var(--color-success-bg); color: var(--color-success); }
.dashboard-card--warning .dashboard-card__icon { background: var(--color-warning-bg); color: var(--color-warning); }
.dashboard-card--danger  .dashboard-card__icon { background: var(--color-danger-bg);  color: var(--color-danger); }

.dashboard-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.dashboard-card__value {
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
  word-break: break-word;
}

.dashboard-card__sub {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.dashboard-card__loading {
  min-height: 38px;
  display: flex;
  align-items: center;
}

.dashboard-card__skeleton {
  display: inline-block;
  width: 60%;
  height: 28px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-surface-alt) 0%,
    var(--color-border) 50%,
    var(--color-surface-alt) 100%
  );
  background-size: 200% 100%;
  animation: dashboard-shimmer 1.2s linear infinite;
}

@keyframes dashboard-shimmer {
  to { background-position: -200% 0; }
}

.dashboard-card__error {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
}

.dashboard-card__error-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-danger);
}

.dashboard-card__retry {
  padding: var(--space-1) var(--space-3);
  background: transparent;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.dashboard-card__retry:hover {
  background: var(--color-danger-bg);
}
</style>
