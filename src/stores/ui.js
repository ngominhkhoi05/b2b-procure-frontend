/**
 * UI store — application shell state.
 *
 * Phase 3 — App Layout & Role-based Dashboard.
 *
 * Responsibilities:
 *   - Sidebar collapsed state (persisted to localStorage).
 *   - Mobile drawer open / closed state.
 *
 * Persistence pattern mirrors utils/auth.js (safe-get / safe-set wrappers
 * so private-mode and quota failures are swallowed silently).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const SIDEBAR_COLLAPSED_KEY = 'b2b_sidebar_collapsed'

function safeGet(key) {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value)
    }
  } catch {
    /* ignore */
  }
}

function readCollapsedFromStorage() {
  const raw = safeGet(SIDEBAR_COLLAPSED_KEY)
  if (raw === null) return false
  return raw === '1' || raw === 'true'
}

export const useUiStore = defineStore('ui', () => {
  // ── State ─────────────────────────────────────────────────────────────────

  /** Whether the desktop sidebar is collapsed (icons only). */
  const sidebarCollapsed = ref(readCollapsedFromStorage())

  /** Whether the mobile off-canvas sidebar drawer is open. */
  const mobileSidebarOpen = ref(false)

  // ── Computed ───────────────────────────────────────────────────────────────

  /**
   * Effective collapsed state for the current viewport.
   * On mobile the drawer is used; this computed is only meaningful on desktop.
   */
  const effectiveCollapsed = computed(() => sidebarCollapsed.value)

  // ── Actions ───────────────────────────────────────────────────────────────

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    safeSet(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  }

  function setSidebarCollapsed(value) {
    sidebarCollapsed.value = Boolean(value)
    safeSet(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  }

  function openMobileSidebar() {
    mobileSidebarOpen.value = true
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
  }

  function toggleMobileSidebar() {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  }

  return {
    // state
    sidebarCollapsed,
    mobileSidebarOpen,
    // computed
    effectiveCollapsed,
    // actions
    toggleSidebar,
    setSidebarCollapsed,
    openMobileSidebar,
    closeMobileSidebar,
    toggleMobileSidebar,
  }
})
