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
 *
 * Phase 10 refinement: a `fromDate` / `toDate` filter drives the
 * statistics call. Backend semantics: fromDate inclusive, toDate exclusive.
 * Do not auto-increment the toDate — the backend handles the boundary.
 */

import { ref, reactive, onMounted } from 'vue'
import { getStatisticsOverview } from '@/services/adminService'
import { listOrders } from '@/services/orderService'
import { formatCurrency, formatDate, formatNumber } from '@/utils/format'

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

const dateFilters = reactive({ fromDate: '', toDate: '' })

async function loadStats() {
  statsLoading.value = true
  statsError.value = null
  try {
    const params = {}
    if (dateFilters.fromDate) params.fromDate = dateFilters.fromDate
    if (dateFilters.toDate)   params.toDate   = dateFilters.toDate
    const data = await getStatisticsOverview(params)
    stats.value = data
    updateRangeLabel(data)
  } catch (err) {
    statsError.value = err
    statsRangeLabel.value = null
  } finally {
    statsLoading.value = false
  }
}

function applyDateFilter() {
  loadStats()
}

function clearDateFilter() {
  dateFilters.fromDate = ''
  dateFilters.toDate = ''
  loadStats()
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

// Build a short caption showing the date range echoed back by the
// statistics endpoint. Returns null when no range is present so the
// caption can be hidden cleanly.
const statsRangeLabel = ref(null)

function updateRangeLabel(s) {
  if (!s) {
    statsRangeLabel.value = null
    return
  }
  const from = s.fromDate ? formatDate(s.fromDate) : null
  const to   = s.toDate   ? formatDate(s.toDate)   : null
  if (from && to)       statsRangeLabel.value = `Khoảng thống kê: ${from} → ${to}`
  else if (from)        statsRangeLabel.value = `Khoảng thống kê: từ ${from}`
  else if (to)          statsRangeLabel.value = `Khoảng thống kê: đến ${to}`
  else                  statsRangeLabel.value = null
}

const ICON_RECEIPT = 'M19 3H5c-1.1 0-2 .9-2 2v16l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H6.17L4 17V5h16v12zM7 7h10v2H7zm0 4h10v2H7z'
const ICON_CHECK   = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
const ICON_CLOCK   = 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
const ICON_X       = 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
const ICON_BLOCK   = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z'
</script>

<template>
  <div class="admin-dashboard">
    <!-- Date filter (Phase 10) -->
    <section class="admin-dashboard__filter-card">
      <div class="admin-dashboard__filter-row">
        <div class="admin-dashboard__filter-field">
          <label for="admin-stats-from">Từ ngày</label>
          <input
            id="admin-stats-from"
            v-model="dateFilters.fromDate"
            type="date"
            class="admin-dashboard__filter-input"
          />
        </div>
        <div class="admin-dashboard__filter-field">
          <label for="admin-stats-to">Đến ngày</label>
          <input
            id="admin-stats-to"
            v-model="dateFilters.toDate"
            type="date"
            class="admin-dashboard__filter-input"
          />
        </div>
        <div class="admin-dashboard__filter-actions">
          <button
            type="button"
            class="admin-dashboard__filter-btn admin-dashboard__filter-btn--primary"
            :disabled="statsLoading"
            @click="applyDateFilter"
          >
            Áp dụng
          </button>
          <button
            type="button"
            class="admin-dashboard__filter-btn admin-dashboard__filter-btn--ghost"
            :disabled="statsLoading"
            @click="clearDateFilter"
          >
            Đặt lại
          </button>
        </div>
      </div>
      <p class="admin-dashboard__filter-hint">
        Khoảng thống kê: từ ngày (bao gồm) đến trước ngày kết thúc (không bao gồm).
        Để trống để xem toàn bộ dữ liệu.
      </p>
    </section>

    <!-- KPI grid -->
    <DashboardSection title="Tổng quan hệ thống" subtitle="Số liệu thống kê từ backend">
      <template v-if="statsRangeLabel" #actions>
        <span class="admin-dashboard__range">{{ statsRangeLabel }}</span>
      </template>
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

.admin-dashboard__range {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.admin-dashboard__filter-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.admin-dashboard__filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--space-3);
  align-items: end;
}

.admin-dashboard__filter-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.admin-dashboard__filter-field label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
}

.admin-dashboard__filter-input {
  height: 38px;
  padding: 0 var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-base);
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.admin-dashboard__filter-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.admin-dashboard__filter-actions {
  display: flex;
  gap: var(--space-2);
}

.admin-dashboard__filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color var(--transition-fast);
}

.admin-dashboard__filter-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-dashboard__filter-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.admin-dashboard__filter-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.admin-dashboard__filter-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.admin-dashboard__filter-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.admin-dashboard__filter-hint {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .admin-dashboard__filter-row {
    grid-template-columns: 1fr;
  }
}
</style>
