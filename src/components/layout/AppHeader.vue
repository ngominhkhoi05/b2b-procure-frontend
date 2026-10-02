<script setup>
/**
 * AppHeader — top bar.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ ☰                          🛒 Cart   User ▼ │
 *   └─────────────────────────────────────────────┘
 *
 * The toggle button is always visible. On desktop it collapses the
 * sidebar; on mobile it opens the off-canvas drawer.
 *
 * The cart icon + count chip is only rendered for BUYER users — the
 * cart API is BUYER-only server-side (CartController has class-level
 * @PreAuthorize("hasRole('BUYER')")).
 *
 * The brand wordmark "B2B Procure" lives in the sidebar, so the top
 * bar intentionally does NOT duplicate it here.
 */

import { computed, onMounted, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useBreakpoint } from '@/composables/useBreakpoint'
import UserMenu from './UserMenu.vue'

const ui = useUiStore()
const auth = useAuthStore()
const cartStore = useCartStore()
const { isMobile } = useBreakpoint()

const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)
const isBuyer = computed(() => role.value === 'BUYER')
const cartCount = computed(() => cartStore.totalItems)

function handleToggle() {
  if (isMobile.value) {
    ui.toggleMobileSidebar()
  } else {
    ui.toggleSidebar()
  }
}

// Fetch the cart once when the header mounts AND the user is a buyer.
// On logout / role change, reset the store so we don't leak state.
watch(
  () => auth.currentUser,
  (user) => {
    if (user && isBuyer.value) {
      // Best-effort; tolerate failures silently — the badge just stays at 0.
      cartStore.fetchCart().catch(() => {})
    } else {
      cartStore.reset()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (isBuyer.value && !cartStore.cart) {
    cartStore.fetchCart().catch(() => {})
  }
})
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

    <div class="app-header__spacer" />

    <RouterLink
      v-if="isBuyer"
      to="/cart"
      class="app-header__cart"
      :class="{ 'app-header__cart--has-items': cartCount > 0 }"
      :aria-label="`Giỏ hàng (${cartCount} sản phẩm)`"
      title="Giỏ hàng"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.16 14h9.45c.75 0 1.41-.41 1.75-1.03l3.24-5.88-1.73-.96L17 12H7.53L4.27 5H1v2h2l3.6 7.59L5.25 17.04C5.09 17.32 5 17.65 5 18c0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25z"/>
      </svg>
      <span
        v-if="cartCount > 0"
        class="app-header__cart-count"
        aria-hidden="true"
      >
        {{ cartCount > 99 ? '99+' : cartCount }}
      </span>
    </RouterLink>

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

.app-header__cart {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  text-decoration: none;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.app-header__cart:hover,
.app-header__cart:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
  outline: none;
}

.app-header__cart :deep(svg) {
  width: 20px;
  height: 20px;
}

.app-header__cart--has-items {
  color: var(--color-primary);
}

.app-header__cart--has-items:hover,
.app-header__cart--has-items:focus-visible {
  color: var(--color-primary-hover);
}

.app-header__cart-count {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: var(--weight-semibold);
  line-height: 1;
  pointer-events: none;
}

.app-header__spacer {
  flex: 1;
}

@media (max-width: 640px) {
  .app-header {
    padding: 0 var(--space-3);
  }
}
</style>
