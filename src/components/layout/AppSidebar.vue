<script setup>
/**
 * AppSidebar — role-aware, collapsible navigation.
 *
 * Inline nav config (per Phase 3 plan): no external nav-config module.
 * Renders only items appropriate to the current user's role.
 *
 * - Desktop: expanded / collapsed via ui.sidebarCollapsed.
 * - Tablet:  always collapsed (icons only).
 * - Mobile:  off-canvas drawer controlled by ui.mobileSidebarOpen.
 */

import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useBreakpoint } from '@/composables/useBreakpoint'

// ── Auth / UI ──────────────────────────────────────────────────────────────
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const { isMobile } = useBreakpoint()

// ── Inline SVG icons (path d-attribute only) ───────────────────────────────
const ICONS = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  users:     'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  building:  'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z',
  package:   'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  folder:    'M10 4H2v16h20V6H12l-2-2zm-1 5h6v2H9V9zm0 4h6v2H9v-2z',
  cart:      'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM7.16 14.26l.04-.12.96-1.74h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.26-.25z',
  receipt:   'M19 3H5c-1.1 0-2 .9-2 2v16l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H6.17L4 17V5h16v12zM7 7h10v2H7zm0 4h10v2H7z',
  wallet:    'M21 7H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 7c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm9-4h-2v2h2v-2z',
  chart:     'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z',
  cog:       'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.484.484 0 0 0 13.94 2h-3.84a.484.484 0 0 0-.48.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.48a.487.487 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.42.48.42h3.84c.24 0 .44-.18.47-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  user:      'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
}

function iconPath(name) {
  return ICONS[name] || ''
}

// ── Nav config per role ────────────────────────────────────────────────────
// Items marked `placeholder: true` point to a placeholder route.
// This keeps the menu navigable without inventing fake CRUD pages.
const NAV_BY_ROLE = {
  ADMIN: [
    { to: '/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
    { to: '/users',     label: 'Người dùng',      icon: 'users',     placeholder: true },
    { to: '/companies', label: 'Công ty',          icon: 'building',  placeholder: true },
    { to: '/products',  label: 'Sản phẩm',        icon: 'package',   placeholder: true },
    { to: '/categories',label: 'Danh mục',        icon: 'folder',    placeholder: true },
    { to: '/orders',    label: 'Đơn hàng',        icon: 'receipt',   placeholder: true },
    { to: '/commission',label: 'Hoa hồng',        icon: 'wallet',    placeholder: true },
    { to: '/statistics',label: 'Thống kê',        icon: 'chart',     placeholder: true },
    { to: '/settings',  label: 'Cài đặt',         icon: 'cog',       placeholder: true },
    { to: '/profile',   label: 'Hồ sơ',           icon: 'user' },
  ],
  SUPPLIER: [
    { to: '/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
    { to: '/products',  label: 'Sản phẩm',        icon: 'package',   placeholder: true },
    { to: '/categories',label: 'Danh mục',        icon: 'folder',    placeholder: true },
    { to: '/orders',    label: 'Đơn hàng',        icon: 'receipt',   placeholder: true },
    { to: '/profile',   label: 'Hồ sơ',           icon: 'user' },
  ],
  BUYER: [
    { to: '/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
    { to: '/products',  label: 'Sản phẩm',        icon: 'package',   placeholder: true },
    { to: '/cart',      label: 'Giỏ hàng',        icon: 'cart',      placeholder: true },
    { to: '/orders',    label: 'Đơn hàng của tôi',icon: 'receipt',   placeholder: true },
    { to: '/profile',   label: 'Hồ sơ',           icon: 'user' },
  ],
}

// ── Derived state ──────────────────────────────────────────────────────────
const items = computed(() => {
  // Accept both `role` and `roleName` shapes.
  const role = auth.currentUser?.role ?? auth.currentUser?.roleName
  return NAV_BY_ROLE[role] || []
})

// Sidebar is visually collapsed when:
//   - mobile (drawer, no labels)
//   - tablet  (always icons only)
//   - desktop AND ui.sidebarCollapsed
const isCollapsed = computed(() => {
  if (isMobile.value) return true
  return ui.sidebarCollapsed
})

// On mobile the sidebar behaves as a drawer — visibility is driven by
// ui.mobileSidebarOpen rather than always-visible.
const isDrawerOpen = computed(() => isMobile.value && ui.mobileSidebarOpen)

function handleNavClick() {
  // Auto-close drawer after a nav item is clicked on mobile.
  if (isMobile.value) ui.closeMobileSidebar()
}
</script>

<template>
  <!-- Mobile backdrop -->
  <div
    v-if="isDrawerOpen"
    class="app-sidebar__backdrop"
    aria-hidden="true"
    @click="ui.closeMobileSidebar()"
  />

  <aside
    :class="[
      'app-sidebar',
      { 'app-sidebar--collapsed': isCollapsed && !isMobile },
      { 'app-sidebar--drawer': isMobile },
      { 'app-sidebar--drawer-open': isDrawerOpen },
    ]"
    aria-label="Điều hướng chính"
  >
    <!-- Brand (hidden when collapsed on desktop) -->
    <div class="app-sidebar__brand">
      <span class="app-sidebar__brand-mark" aria-hidden="true">BP</span>
      <span v-if="!isCollapsed || isMobile" class="app-sidebar__brand-text">
        B2B Procure
      </span>
    </div>

    <!-- Nav -->
    <nav class="app-sidebar__nav" aria-label="Menu chính">
      <ul class="app-sidebar__list">
        <li v-for="item in items" :key="item.to">
          <RouterLink
            :to="item.to"
            :class="[
              'app-sidebar__link',
              { 'app-sidebar__link--placeholder': item.placeholder },
            ]"
            :title="isCollapsed && !isMobile ? item.label : undefined"
            :aria-current="route.path === item.to ? 'page' : undefined"
            @click="handleNavClick"
          >
            <span class="app-sidebar__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path :d="iconPath(item.icon)" />
              </svg>
            </span>
            <span v-if="!isCollapsed || isMobile" class="app-sidebar__label">
              {{ item.label }}
            </span>
            <span
              v-if="item.placeholder && (!isCollapsed || isMobile)"
              class="app-sidebar__badge"
              aria-hidden="true"
            >Sắp có</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  width: 240px;
  flex-shrink: 0;
  transition: width var(--transition-base);
  height: 100%;
  overflow: hidden;
}

.app-sidebar--collapsed {
  width: 64px;
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  min-height: 64px;
  flex-shrink: 0;
}

.app-sidebar__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-xs);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}

.app-sidebar__brand-text {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar__nav {
  flex: 1;
  padding: var(--space-3) var(--space-2);
  overflow-y: auto;
  overflow-x: hidden;
}

.app-sidebar__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.app-sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.app-sidebar__link:hover {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
  text-decoration: none;
}

.app-sidebar__link.router-link-active,
.app-sidebar__link[aria-current="page"] {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.app-sidebar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.app-sidebar__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.app-sidebar__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar__badge {
  font-size: var(--font-xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* ── Mobile drawer ──────────────────────────────────────────────────── */
.app-sidebar--drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-overlay);
  width: 240px;
  transform: translateX(-100%);
  transition: transform var(--transition-base);
}

.app-sidebar--drawer-open {
  transform: translateX(0);
}

.app-sidebar__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: calc(var(--z-overlay) - 1);
}

/* ── Tablet: force collapsed appearance but keep on-canvas ──────────── */
@media (min-width: 640px) and (max-width: 1023px) {
  .app-sidebar {
    width: 64px;
  }
}
</style>
