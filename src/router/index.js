/**
 * Vue Router — Phase 2 Authentication.
 *
 * Routes:
 *   Public: /login, /register
 *   Authenticated: (requiresAuth meta)
 *   Role-based: (roles meta)
 *
 * Guard behaviour:
 *   - Unauthenticated → /login?redirect=<target>
 *   - Authenticated + wrong role → /403
 *   - After login → redirect target or /
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy-import views so the bundle stays tree-shakeable.
const HomeView       = () => import('@/views/HomeView.vue')
const AboutView      = () => import('@/views/AboutView.vue')
const LoginView      = () => import('@/views/auth/LoginView.vue')
const RegisterView   = () => import('@/views/auth/RegisterView.vue')
const OAuth2RedirectView = () => import('@/views/auth/OAuth2RedirectView.vue')
const ForbiddenView  = () => import('@/views/ForbiddenView.vue')
const NotFoundView   = () => import('@/views/NotFoundView.vue')

// ── Route definitions ─────────────────────────────────────────────────────────

const routes = [
  // ── Public routes ────────────────────────────────────────────────────────
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      requiresAuth: false,
      roles: [],
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

  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      requiresAuth: false,
      roles: [],
      title: 'Đăng nhập',
      // Skip auth guard so logged-in users can still visit /login
      publicOnly: true,
    },
  },

  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: {
      requiresAuth: false,
      roles: [],
      title: 'Đăng ký',
      publicOnly: true,
    },
  },

  // ── OAuth2 callback ────────────────────────────────────────────────────
  // The backend's OAuth2AuthenticationSuccessHandler redirects the browser
  // to this URL after Google authentication completes. The view reads the
  // query parameters and routes the user to the appropriate destination.
  {
    path: '/oauth2/redirect',
    name: 'oauth2-redirect',
    component: OAuth2RedirectView,
    meta: {
      requiresAuth: false,
      roles: [],
      title: 'Đang đăng nhập với Google',
    },
  },

  // ── Protected routes — add `meta: { requiresAuth: true }` per route ────────
  // Examples:
  // {
  //   path: '/dashboard',
  //   name: 'dashboard',
  //   component: () => import('@/views/DashboardView.vue'),
  //   meta: {
  //     requiresAuth: true,
  //     roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
  //     title: 'Bảng điều khiển',
  //   },
  // },

  // ── Error routes ─────────────────────────────────────────────────────────
  {
    path: '/403',
    name: 'forbidden',
    component: ForbiddenView,
    meta: {
      requiresAuth: false,
      roles: [],
      title: 'Không có quyền truy cập',
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
  scrollBehavior() {
    return { top: 0 }
  },
})

// ── Navigation guard ───────────────────────────────────────────────────────────

/**
 * Phase 2 auth guard:
 *
 * 1. Update browser tab title.
 * 2. Skip guard for publicOnly routes when already authenticated.
 * 3. Redirect unauthenticated users away from protected routes.
 * 4. Check role membership for role-restricted routes.
 */
router.beforeEach((to, _from) => {
  // Update browser tab title
  const title = to.meta?.title
  if (title) {
    const appName = import.meta.env.VITE_APP_NAME ?? 'B2B Procure'
    document.title = `${title} — ${appName}`
  }

  // Get auth store — it is already initialised by main.js
  const auth = useAuthStore()

  // Skip further checks for routes that are public-only
  // (e.g. /login, /register) when the user is already authenticated.
  if (to.meta?.publicOnly && auth.isAuthenticated) {
    // Send to home instead of staying on login/register page.
    return { name: 'home' }
  }

  // Route requires authentication
  if (to.meta?.requiresAuth) {
    if (!auth.isAuthenticated) {
      // Preserve intended destination so we can redirect after login
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    // Role check
    const allowedRoles = to.meta?.roles
    if (
      Array.isArray(allowedRoles) &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(auth.currentUser?.role)
    ) {
      return { name: 'forbidden' }
    }
  }

  // Allow navigation
  return true
})

export default router
