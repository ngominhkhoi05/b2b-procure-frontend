<script setup>
/**
 * AppLayout — authenticated application shell.
 *
 * Composes:
 *   AppSidebar   (role-aware, collapsible)
 *   AppHeader    (top bar)
 *   <RouterView/> (the routed page, e.g. /dashboard, /profile)
 *
 * Responsive:
 *   - Desktop: sidebar + header + main.
 *   - Tablet:  collapsed sidebar + header + main.
 *   - Mobile:  drawer sidebar + header + main; backdrop closes the drawer.
 */

import { RouterView } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div class="app-layout">
    <AppSidebar />

    <div class="app-layout__main-col">
      <AppHeader />

      <main class="app-layout__content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100dvh;
  background: var(--color-background);
}

.app-layout__main-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0; /* allow children to shrink below content width */
}

.app-layout__content {
  flex: 1;
  padding: var(--space-6);
  min-width: 0;
  overflow-x: hidden;
}

@media (max-width: 640px) {
  .app-layout__content {
    padding: var(--space-4);
  }
}
</style>
