<script setup>
/**
 * RecentOrders — compact list of recent orders (up to 5).
 *
 * Pure presentational. The caller passes the data and decides what to
 * show for loading / empty / error states via slots.
 *
 * Props:
 *   orders  — array of OrderResponse objects (from /api/v1/orders)
 */
import { computed } from 'vue'
import { formatCurrency, formatDateTime } from '@/utils/format'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseError from '@/components/common/BaseError.vue'

const props = defineProps({
  orders: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error:   { type: [Object, null], default: null },
})

defineEmits(['retry'])

const STATUS_LABELS = {
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', tone: 'warning' },
  PAID:                 { label: 'Đã thanh toán', tone: 'info' },
  CONFIRMED:            { label: 'Đã xác nhận',   tone: 'info' },
  PREPARING:            { label: 'Đang chuẩn bị', tone: 'info' },
  SHIPPING:             { label: 'Đang giao',     tone: 'info' },
  COMPLETED:            { label: 'Hoàn thành',    tone: 'success' },
  REJECTED:             { label: 'Bị từ chối',    tone: 'danger' },
  CANCELLED:            { label: 'Đã hủy',        tone: 'muted' },
}

const safeOrders = computed(() => props.orders || [])

function statusOf(o) {
  return STATUS_LABELS[o.status] || { label: o.status || '—', tone: 'muted' }
}

function toNumber(v) {
  if (v == null || v === '') return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}
</script>

<template>
  <div class="recent-orders">
    <BaseLoading v-if="loading" inline label="Đang tải đơn hàng…" />

    <BaseError
      v-else-if="error"
      :error="error"
      title="Không thể tải đơn hàng"
      @retry="$emit('retry')"
    />

    <BaseEmpty
      v-else-if="safeOrders.length === 0"
      title="Chưa có đơn hàng nào"
      description="Các đơn hàng gần đây của bạn sẽ xuất hiện tại đây."
    />

    <ul v-else class="recent-orders__list">
      <li
        v-for="o in safeOrders"
        :key="o.id"
        class="recent-orders__item"
      >
        <div class="recent-orders__primary">
          <span class="recent-orders__code">{{ o.orderCode || `#${o.id}` }}</span>
          <span class="recent-orders__date">{{ formatDateTime(o.createdAt) }}</span>
        </div>
        <div class="recent-orders__secondary">
          <span :class="['recent-orders__status', `recent-orders__status--${statusOf(o).tone}`]">
            {{ statusOf(o).label }}
          </span>
          <span class="recent-orders__total">
            {{ formatCurrency(toNumber(o.totalAmount)) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.recent-orders__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.recent-orders__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}

.recent-orders__primary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.recent-orders__code {
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
}

.recent-orders__date {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.recent-orders__secondary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.recent-orders__status {
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
}

.recent-orders__status--success { background: var(--color-success-bg); color: var(--color-success); }
.recent-orders__status--warning { background: var(--color-warning-bg); color: var(--color-warning); }
.recent-orders__status--danger  { background: var(--color-danger-bg);  color: var(--color-danger); }
.recent-orders__status--info    { background: var(--color-info-bg);    color: var(--color-info); }
.recent-orders__status--muted   { background: var(--color-surface-alt); color: var(--color-text-secondary); }

.recent-orders__total {
  font-size: var(--font-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
}
</style>
