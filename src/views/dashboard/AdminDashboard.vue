<script setup>
/**
 * AdminDashboard — role-specific dashboard for ADMIN.
 *
 * Sections:
 *   1. KPI cards (5 numeric + 2 monetary) from /admin/statistics/overview
 *   2. Recent orders (5) from /orders
 *
 * Every section handles loading / empty / error states individually
 * so one failure doesn't blank the whole page.
 */

import { ref, onMounted } from 'vue'
import { getStatisticsOverview } from '@/services/adminService'
import { listOrders } from '@/services/orderService'
import { formatCurrency, formatNumber } from '@/utils/format'

import DashboardSection from '@/components/dashboard/DashboardSection.vue'
import DashboardCard from '@/components/dashboard/DashboardCard.vue'
import RecentOrders from '@/components/dashboard/RecentOrders.vue'

// ── State ──────────────────────────────────────────────────────────────────
const stats = ref(null)
const statsLoading = ref(false)
const statsError = ref(null)

const recentOrders = ref([])
const ordersLoading = ref(false)
const ordersError = ref(null)

async function loadStats() {
  statsLoading.value = true
  statsError.value = null
  try {
    stats.value = await getStatisticsOverview()
  } catch (err) {
    statsError.value = err
  } finally {
    statsLoading.value = false
  }
}

async function loadRecentOrders() {
  ordersLoading.value = true
  ordersError.value = null
  try {
    const page = await listOrders({ page: 0, size: 5 })
    recentOrders.value = page.content || []
  } catch (err) {
    ordersError.value = err
  } finally {
    ordersLoading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadRecentOrders()
})

// ── Helpers ────────────────────────────────────────────────────────────────
function toNumber(v) {
  if (v == null || v === '') return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

const ICON_RECEIPT = 'M19 3H5c-1.1 0-2 .9-2 2v16l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H6.17L4 17V5h16v12zM7 7h10v2H7zm0 4h10v2H7z'
const ICON_CHECK   = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
const ICON_CLOCK   = 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
const ICON_X       = 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
const ICON_BLOCK   = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z'
</script>

<template>
  <div class="admin-dashboard">
    <!-- KPI grid -->
    <DashboardSection title="Tổng quan hệ thống" subtitle="Số liệu thống kê từ backend">
      <div class="admin-dashboard__kpis">
        <DashboardCard
          label="Tổng đơn hàng"
          :value="stats ? formatNumber(stats.totalOrders) : '—'"
          :loading="statsLoading"
          :error="statsError"
          :icon="ICON_RECEIPT"
          accent="primary"
          @retry="loadStats"
        />
        <DashboardCard
          label="Hoàn thành"
          :value="stats ? formatNumber(stats.completedOrders) : '—'"
          :loading="statsLoading"
          :error="statsError"
          :icon="ICON_CHECK"
          accent="success"
          @retry="loadStats"
        />
        <DashboardCard
          label="Chờ xác nhận"
          :value="stats ? formatNumber(stats.pendingConfirmationOrders) : '—'"
          :loading="statsLoading"
          :error="statsError"
          :icon="ICON_CLOCK"
          accent="warning"
          @retry="loadStats"
        />
        <DashboardCard
          label="Đã hủy"
          :value="stats ? formatNumber(stats.cancelledOrders) : '—'"
          :loading="statsLoading"
          :error="statsError"
          :icon="ICON_X"
          accent="danger"
          @retry="loadStats"
        />
        <DashboardCard
          label="Bị từ chối"
          :value="stats ? formatNumber(stats.rejectedOrders) : '—'"
          :loading="statsLoading"
          :error="statsError"
          :icon="ICON_BLOCK"
          accent="default"
          @retry="loadStats"
        />
        <DashboardCard
          label="Tổng giá trị đơn (hoàn thành)"
          :value="stats ? formatCurrency(toNumber(stats.totalOrderValue)) : '—'"
          :loading="statsLoading"
          :error="statsError"
          accent="primary"
          @retry="loadStats"
        />
        <DashboardCard
          label="Tổng hoa hồng"
          :value="stats ? formatCurrency(toNumber(stats.totalCommission)) : '—'"
          :loading="statsLoading"
          :error="statsError"
          accent="success"
          @retry="loadStats"
        />
      </div>
    </DashboardSection>

    <!-- Recent orders -->
    <DashboardSection title="Đơn hàng gần đây" subtitle="5 đơn hàng mới nhất trên hệ thống">
      <RecentOrders
        :orders="recentOrders"
        :loading="ordersLoading"
        :error="ordersError"
        @retry="loadRecentOrders"
      />
    </DashboardSection>
  </div>
</template>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.admin-dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}
</style>
