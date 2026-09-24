<script setup>
/**
 * AppHeader — top bar.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ ☰   B2B Procure              User ▼         │
 *   └─────────────────────────────────────────────┘
 *
 * The toggle button is always visible. On desktop it collapses the
 * sidebar; on mobile it opens the off-canvas drawer.
 */

import { useUiStore } from '@/stores/ui'
import { useBreakpoint } from '@/composables/useBreakpoint'
import UserMenu from './UserMenu.vue'

const ui = useUiStore()
const { isMobile } = useBreakpoint()

function handleToggle() {
  if (isMobile.value) {
    ui.toggleMobileSidebar()
  } else {
    ui.toggleSidebar()
  }
}
</script>

<template>
  <header class="app-header">
    <button
      type="button"
      class="app-header__toggle"
      :aria-label="isMobile ? 'Mở menu điều hướng' : 'Thu / mở sidebar'"
      :aria-expanded="isMobile ? ui.mobileSidebarOpen : !ui.sidebarCollapsed"
      @click="handleToggle"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
      </svg>
    </button>

    <span class="app-header__brand">B2B Procure</span>

    <div class="app-header__spacer" />

    <UserMenu />
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 64px;
  padding: 0 var(--space-5);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: var(--z-raised);
}

.app-header__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.app-header__toggle:hover {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.app-header__toggle :deep(svg) {
  width: 20px;
  height: 20px;
}

.app-header__brand {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.app-header__spacer {
  flex: 1;
}

@media (max-width: 640px) {
  .app-header {
    padding: 0 var(--space-3);
  }

  .app-header__brand {
    display: none;
  }
}
</style>
