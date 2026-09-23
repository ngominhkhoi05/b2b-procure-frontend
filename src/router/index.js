/**
 * Vue Router — Phase 1 Foundation.
 *
 * This file sets up the router with:
 *   - A minimal set of placeholder routes for sanity-checking the app boots.
 *   - Route meta fields (`requiresAuth`, `roles`) ready for Phase 2+.
 *   - A `beforeEach` guard that reads auth state but does NOT redirect yet
 *     (no Login UI in Phase 1 — it only warns and continues).
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy-import the three foundation views so the bundle stays tree-shakeable.
const HomeView     = () => import('@/views/HomeView.vue')
const AboutView    = () => import('@/views/AboutView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

// ── Route definitions ─────────────────────────────────────────────────────────

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      /** Future phases: set to true for protected routes. */
      requiresAuth: false,
      /** Placeholder roles array — populate per-route in later phases. */
      roles: [],
      /** Human-readable label used by future breadcrumb / nav features. */
      title: 'Trang chủ',
    },
  },

  {
    path: '/about',
    name: 'about',
    component: AboutView,
    meta: {
      requiresAuth: false,
      roles: [],
      title: 'Giới thiệu',
    },
  },

  // Catch-all 404 — must be LAST.
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      requiresAuth: false,
      roles: [],
      title: 'Không tìm thấy',
    },
  },
]

// ── Router instance ────────────────────────────────────────────────────────────

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Scroll to top on every navigation.
  scrollBehavior() {
    return { top: 0 }
  },
})

// ── Navigation guard ───────────────────────────────────────────────────────────

/**
 * Phase 1 behaviour:
 *   - If a route has `requiresAuth: true` and the user has no token,
 *     we warn to the console and still allow navigation.
 *   - This lets the foundation boot cleanly even without a real auth UI.
 *
 * Phase 2 (Login):
 *   - Flip the warning to: `return { name: 'login', query: { redirect: to.fullPath } }`
 *   - Add the login route to this file.
 */
router.beforeEach((to) => {
  // Update browser tab title from route meta.
  const title = to.meta?.title
  if (title) {
    const appName = import.meta.env.VITE_APP_NAME ?? 'B2B Procure'
    document.title = `${title} — ${appName}`
  }

  if (to.meta?.requiresAuth) {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Router] Route "${to.name}" requires authentication. ` +
          'Redirect will be wired in Phase 2.'
      )
      // TODO Phase 2: return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  return true
})

export default router
