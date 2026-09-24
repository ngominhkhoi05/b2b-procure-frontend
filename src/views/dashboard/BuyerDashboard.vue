<script setup>
/**
 * BuyerDashboard — role-specific dashboard for BUYER.
 *
 * Sections:
 *   1. Cart summary        (from /api/v1/cart)
 *   2. Orders count        (from /api/v1/orders, page 0 size 1)
 *   3. Recent orders (5)   (from /api/v1/orders, page 0 size 5)
 *
 * Each section has its own loading / empty / error states.
 */

import { ref, onMounted } from 'vue'
import { getCart } from '@/services/cartService'
import { listOrders } from '@/services/orderService'
import { formatCurrency, formatNumber } from '@/utils/format'

import DashboardSection from '@/components/dashboard/DashboardSection.vue'
import DashboardCard from '@/components/dashboard/DashboardCard.vue'
import RecentOrders from '@/components/dashboard/RecentOrders.vue'

// ── State ──────────────────────────────────────────────────────────────────
const cart = ref(null)
const cartLoading = ref(false)
const cartError = ref(null)

const ordersTotal = ref(null)
const ordersTotalLoading = ref(false)
const ordersTotalError = ref(null)

const recentOrders = ref([])
const recentLoading = ref(false)
const recentError = ref(null)

// ── Loaders ────────────────────────────────────────────────────────────────
async function loadCart() {
  cartLoading.value = true
  cartError.value = null
  try {
    cart.value = await getCart()
  } catch (err) {
    cartError.value = err
  } finally {
    cartLoading.value = false
  }
}

async function loadOrdersCount() {
  ordersTotalLoading.value = true
  ordersTotalError.value = null
  try {
    const page = await listOrders({ page: 0, size: 1 })
    ordersTotal.value = page.totalElements
  } catch (err) {
    ordersTotalError.value = err
  } finally {
    ordersTotalLoading.value = false
  }
}

async function loadRecentOrders() {
  recentLoading.value = true
  recentError.value = null
  try {
    const page = await listOrders({ page: 0, size: 5 })
    recentOrders.value = page.content || []
  } catch (err) {
    recentError.value = err
  } finally {
    recentLoading.value = false
  }
}

onMounted(() => {
  loadCart()
  loadOrdersCount()
  loadRecentOrders()
})

// ── Helpers ────────────────────────────────────────────────────────────────
function toNumber(v) {
  if (v == null || v === '') return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function formatTotal(v) {
  if (v == null) return '—'
  return formatNumber(v)
}

const ICON_CART    = 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM7.16 14.26l.04-.12.96-1.74h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.26-.25z'
const ICON_RECEIPT = 'M19 3H5c-1.1 0-2 .9-2 2v16l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H6.17L4 17V5h16v12zM7 7h10v2H7zm0 4h10v2H7z'
</script>

<template>
  <div class="buyer-dashboard">
    <DashboardSection title="Hoạt động mua hàng" subtitle="Tổng quan cho nhà mua hàng">
      <div class="buyer-dashboard__grid">
        <DashboardCard
          label="Sản phẩm trong giỏ"
          :value="cart ? formatNumber(cart.totalItems ?? 0) : '—'"
          :loading="cartLoading"
          :error="cartError"
          :icon="ICON_CART"
          accent="primary"
          @retry="loadCart"
        />
        <DashboardCard
          label="Tổng tiền giỏ hàng"
          :value="cart ? formatCurrency(toNumber(cart.totalAmount)) : '—'"
          :loading="cartLoading"
          :error="cartError"
          accent="primary"
          @retry="loadCart"
        />
        <DashboardCard
          label="Tổng đơn hàng của tôi"
          :value="ordersTotal == null ? '—' : formatTotal(ordersTotal)"
          :loading="ordersTotalLoading"
          :error="ordersTotalError"
          :icon="ICON_RECEIPT"
          accent="default"
          @retry="loadOrdersCount"
        />
      </div>
    </DashboardSection>

    <DashboardSection title="Đơn hàng gần đây" subtitle="5 đơn hàng mới nhất của bạn">
      <RecentOrders
        :orders="recentOrders"
        :loading="recentLoading"
        :error="recentError"
        @retry="loadRecentOrders"
      />
    </DashboardSection>
  </div>
</template>

<style scoped>
.buyer-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.buyer-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}
</style>
