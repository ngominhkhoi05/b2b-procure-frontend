import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

// Global styles — CSS variables + base reset
import '@/assets/styles/index.css'

const app = createApp(App)

// 1. Pinia (state management)
const pinia = createPinia()
app.use(pinia)

// 2. Bootstrap auth store from localStorage.
//    Must come before the router so the request interceptor
//    already has the persisted token on the first navigation.
const authStore = useAuthStore()
authStore.bootstrapFromStorage()

/**
 * Wait for the bootstrap fetch to settle before mounting the router.
 *
 * - If we have a token, restore the user profile (may fail with 401 → cleared).
 * - If we have no token, there's nothing to do.
 *
 * Without this await, the router's first navigation runs while
 * `currentUser` is still `null`, the guard sees `isAuthenticated === false`,
 * and a logged-in user gets bounced to /login on every hard reload.
 *
 * We render a tiny loading splash so the user doesn't see a flash of the
 * login page while the network round-trip is in flight.
 */
function showBootstrapSplash(show) {
  let el = document.getElementById('app-bootstrap-splash')
  if (!show) {
    if (el) el.remove()
    return
  }
  if (el) return
  el = document.createElement('div')
  el.id = 'app-bootstrap-splash'
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.textContent = 'Đang tải…'
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:var(--color-bg,#f7f8fa)',
    'color:var(--color-text-secondary,#475569)',
    'font:500 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
    'z-index:9999',
  ].join(';')
  document.body.appendChild(el)
}

async function bootstrapSession() {
  if (!authStore.token) return
  showBootstrapSplash(true)
  try {
    await authStore.fetchCurrentUser()
  } finally {
    showBootstrapSplash(false)
  }
}

// 3. Restore session (if any) BEFORE installing the router so the first
//    navigation sees a fully-hydrated auth store. Top-level await is fine
//    because main.js is an ES module loaded by Vite.
await bootstrapSession()

// 4. Vue Router (client-side routing)
app.use(router)

// 5. Mount
app.mount('#app')
