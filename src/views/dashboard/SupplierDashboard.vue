<script setup>
/**
 * SupplierDashboard — role-specific dashboard for SUPPLIER.
 *
 * No fake revenue / product counts (per Phase 3 plan and user choice).
 * Shows real order counts by status, sourced from the same `/orders`
 * endpoint the buyer uses, filtered by status.
 *
 * Per the user's decision, this view does NOT call the products endpoint.
 * Per the plan, if any data source is unavailable the view falls back to
 * empty / error states.
 */

import { ref, onMounted } from 'vue'
import { listOrders } from '@/services/orderService'
import { formatNumber } from '@/utils/format'

import DashboardSection from '@/components/dashboard/DashboardSection.vue'
import DashboardCard from '@/components/dashboard/DashboardCard.vue'

// ── Config ─────────────────────────────────────────────────────────────────
const STATUS_BUCKETS = [
  { key: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận', accent: 'warning', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
  { key: 'CONFIRMED',            label: 'Đã xác nhận',  accent: 'default', icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
  { key: 'PREPARING',            label: 'Đang chuẩn bị',accent: 'default', icon: 'M19 3H5c-1.1 0-2 .9-2 2v16l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H6.17L4 17V5h16v12z' },
  { key: 'SHIPPING',             label: 'Đang giao',    accent: 'default', icon: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5z' },
  { key: 'COMPLETED',            label: 'Hoàn thành',   accent: 'success', icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
]

// ── State ──────────────────────────────────────────────────────────────────
const counts = ref({}) // { PENDING_CONFIRMATION: 12, ... }
const loading = ref(false)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const results = await Promise.all(
      STATUS_BUCKETS.map((b) =>
        listOrders({ status: b.key, page: 0, size: 1 })
          .then((page) => ({ key: b.key, total: page.totalElements }))
          .catch(() => ({ key: b.key, total: null })),
      ),
    )
    counts.value = results.reduce((acc, r) => {
      acc[r.key] = r.total
      return acc
    }, {})
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="supplier-dashboard">
    <DashboardSection
      title="Đơn hàng của tôi"
      subtitle="Số lượng đơn theo từng trạng thái (từ hệ thống)"
    >
      <div class="supplier-dashboard__grid">
        <DashboardCard
          v-for="bucket in STATUS_BUCKETS"
          :key="bucket.key"
          :label="bucket.label"
          :value="counts[bucket.key] == null ? '—' : formatNumber(counts[bucket.key])"
          :loading="loading"
          :error="error"
          :icon="bucket.icon"
          :accent="bucket.accent"
          @retry="load"
        />
      </div>
    </DashboardSection>
  </div>
</template>

<style scoped>
.supplier-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
}
</style>
