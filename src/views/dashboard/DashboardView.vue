<script setup>
/**
 * DashboardView — role-aware router.
 *
 * Single route `/dashboard`. The view inspects the authenticated user's role
 * and renders one of AdminDashboard / SupplierDashboard / BuyerDashboard.
 *
 * Falls back to a placeholder if the role is unknown or unauthenticated.
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import AdminDashboard from './AdminDashboard.vue'
import SupplierDashboard from './SupplierDashboard.vue'
import BuyerDashboard from './BuyerDashboard.vue'

const auth = useAuthStore()

const view = computed(() => {
  // Accept both `role` (login/oauth payload) and `roleName` (canonical /users/me payload).
  const role = auth.currentUser?.role ?? auth.currentUser?.roleName
  if (role === 'ADMIN')    return AdminDashboard
  if (role === 'SUPPLIER') return SupplierDashboard
  if (role === 'BUYER')    return BuyerDashboard
  return null
})

const greetingName = computed(() => {
  const u = auth.currentUser
  if (!u) return ''
  return u.fullName || u.username || ''
})
</script>

<template>
  <div class="dashboard-view">
    <header class="dashboard-view__header">
      <h1 class="dashboard-view__title">Bảng điều khiển</h1>
      <p v-if="greetingName" class="dashboard-view__subtitle">
        Xin chào, <strong>{{ greetingName }}</strong>
      </p>
    </header>

    <component :is="view" v-if="view" />

    <BaseEmpty
      v-else
      title="Không thể xác định vai trò"
      description="Phiên đăng nhập của bạn không có vai trò hợp lệ. Vui lòng đăng nhập lại."
    />
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.dashboard-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.dashboard-view__title {
  margin: 0;
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.dashboard-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.dashboard-view__subtitle strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-semibold);
}
</style>
