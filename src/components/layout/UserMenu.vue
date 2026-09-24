<script setup>
/**
 * UserMenu — header user dropdown.
 *
 * Shows avatar (or initials fallback), display name, and role chip.
 * Provides:
 *   - Hồ sơ   → /profile
 *   - Đăng xuất → auth.logout()
 *
 * No notification item (Phase 3 spec: no notification system).
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const isOpen = ref(false)
const menuRef = ref(null)

const displayName = computed(() => {
  const u = auth.currentUser
  if (!u) return ''
  // currentUser from store keeps only a few fields; fall back gracefully.
  return u.fullName || u.username || ''
})

const username = computed(() => auth.currentUser?.username || '')

const roleLabel = computed(() => {
  // Accept both `role` and `roleName` shapes.
  const r = auth.currentUser?.role ?? auth.currentUser?.roleName
  if (r === 'ADMIN')    return 'Quản trị viên'
  if (r === 'BUYER')    return 'Nhà mua hàng'
  if (r === 'SUPPLIER') return 'Nhà cung cấp'
  return r || ''
})

const initials = computed(() => {
  const name = displayName.value || username.value
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
})

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function goProfile() {
  close()
  router.push('/profile')
}

function handleLogout() {
  close()
  auth.logout()
  router.replace('/login')
}

function onDocumentClick(e) {
  if (!isOpen.value || !menuRef.value) return
  if (!menuRef.value.contains(e.target)) close()
}

function onEscape(e) {
  if (e.key === 'Escape' && isOpen.value) close()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onEscape)
})
</script>

<template>
  <div ref="menuRef" class="user-menu">
    <button
      type="button"
      class="user-menu__trigger"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click="toggle"
    >
      <span class="user-menu__avatar" aria-hidden="true">
        {{ initials }}
      </span>
      <span class="user-menu__meta">
        <span class="user-menu__name">{{ displayName || username || 'Người dùng' }}</span>
        <span class="user-menu__role">{{ roleLabel }}</span>
      </span>
      <span class="user-menu__chevron" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/>
        </svg>
      </span>
    </button>

    <div
      v-if="isOpen"
      class="user-menu__dropdown"
      role="menu"
    >
      <div class="user-menu__header">
        <div class="user-menu__avatar user-menu__avatar--lg" aria-hidden="true">
          {{ initials }}
        </div>
        <div class="user-menu__header-meta">
          <span class="user-menu__name user-menu__name--lg">
            {{ displayName || username || 'Người dùng' }}
          </span>
          <span class="user-menu__role">{{ roleLabel }}</span>
        </div>
      </div>

      <button
        type="button"
        class="user-menu__item"
        role="menuitem"
        @click="goProfile"
      >
        <span class="user-menu__item-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </span>
        Hồ sơ
      </button>

      <hr class="user-menu__divider" />

      <button
        type="button"
        class="user-menu__item user-menu__item--danger"
        role="menuitem"
        @click="handleLogout"
      >
        <span class="user-menu__item-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </span>
        Đăng xuất
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

.user-menu__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-2) var(--space-1) var(--space-1);
  border-radius: var(--radius-full);
  background: transparent;
  transition: background-color var(--transition-fast);
  border: 1px solid transparent;
}

.user-menu__trigger:hover {
  background: var(--color-surface-alt);
  border-color: var(--color-border);
}

.user-menu__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  flex-shrink: 0;
}

.user-menu__avatar--lg {
  width: 40px;
  height: 40px;
  font-size: var(--font-sm);
}

.user-menu__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: var(--leading-tight);
}

.user-menu__name {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu__name--lg {
  font-size: var(--font-md);
  max-width: 220px;
}

.user-menu__role {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.user-menu__chevron {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-menu__chevron :deep(svg) {
  width: 100%;
  height: 100%;
}

.user-menu__dropdown {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  min-width: 240px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-overlay);
  padding: var(--space-2);
}

.user-menu__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-2);
}

.user-menu__header-meta {
  display: flex;
  flex-direction: column;
  line-height: var(--leading-tight);
  min-width: 0;
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
  transition: background-color var(--transition-fast);
}

.user-menu__item:hover {
  background: var(--color-surface-alt);
}

.user-menu__item--danger {
  color: var(--color-danger);
}

.user-menu__item--danger:hover {
  background: var(--color-danger-bg);
}

.user-menu__item-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-menu__item-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.user-menu__divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--space-2) 0;
}

/* ── Mobile: hide meta, keep avatar + chevron ───────────────────────── */
@media (max-width: 640px) {
  .user-menu__meta {
    display: none;
  }
}
</style>
