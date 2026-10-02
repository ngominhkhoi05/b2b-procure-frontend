<script setup>
/**
 * AuthLayout — surface for unauthenticated flows (login, register, OAuth2 redirect, 403).
 *
 * Provides a minimal centred page surface. The auth views (LoginView, RegisterView, …)
 * own their own card styling and validation, so this layout only handles the page-level
 * background and a top brand strip.
 */
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__brand">
      <span class="auth-layout__brand-mark" aria-hidden="true">BP</span>
      <span class="auth-layout__brand-text">B2B Procure</span>
    </div>

    <main class="auth-layout__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.auth-layout__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
}

.auth-layout__brand-mark {
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

.auth-layout__brand-text {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.auth-layout__content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 640px) {
  .auth-layout__brand {
    padding: var(--space-4);
  }
}
</style>
