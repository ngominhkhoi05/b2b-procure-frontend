/**
 * Vue Router — Phase 3 Application Shell & Role Dashboards.
 *
 * Routes:
 *   Public:           /, /about, /login, /register, /oauth2/redirect, /403, /404
 *   Authenticated:    /dashboard (role router), /profile
 *   Placeholder:      /products, /cart, /orders, /users, /companies,
 *                     /categories, /commission, /statistics, /settings
 *                     → all point to the ProfileView (intentionally incomplete).
 *
 * Guard behaviour:
 *   - Unauthenticated → /login?redirect=<target>
 *   - Authenticated + wrong role → /403
 *   - publicOnly routes redirect authenticated users to /dashboard
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy-import views so the bundle stays tree-shakeable.
const HomeView           = () => import('@/views/HomeView.vue')
const AboutView          = () => import('@/views/AboutView.vue')
const LoginView          = () => import('@/views/auth/LoginView.vue')
const RegisterView       = () => import('@/views/auth/RegisterView.vue')
const OAuth2RedirectView = () => import('@/views/auth/OAuth2RedirectView.vue')
const ForbiddenView      = () => import('@/views/ForbiddenView.vue')
const NotFoundView       = () => import('@/views/NotFoundView.vue')
const DashboardView      = () => import('@/views/dashboard/DashboardView.vue')
const ProfileView        = () => import('@/views/profile/ProfileView.vue')

// ── Phase 4 — Product & Category views ────────────────────────────────────
const ProductListView         = () => import('@/views/products/ProductListView.vue')
const ProductDetailView       = () => import('@/views/products/ProductDetailView.vue')
const ProductFormView         = () => import('@/views/products/ProductFormView.vue')
const CategoryManagementView  = () => import('@/views/categories/CategoryManagementView.vue')

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

  // ── Application routes ─────────────────────────────────────────────────
  // Single role-aware dashboard route; the view itself picks the right
  // dashboard based on auth.currentUser.role.
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
      title: 'Bảng điều khiển',
    },
  },

  // Profile placeholder (Phase 3 — no editable profile yet).
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
      title: 'Hồ sơ',
    },
  },

  // ── Phase 4 routes ───────────────────────────────────────────────────
  // Single role-aware product catalog — the view renders cards (Buyer)
  // or a management table (Admin/Supplier) based on the auth role.
  {
    path: '/products',
    name: 'products',
    component: ProductListView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
      title: 'Sản phẩm',
    },
  },
  {
    path: '/products/new',
    name: 'product-new',
    component: ProductFormView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'SUPPLIER'],
      title: 'Thêm sản phẩm',
    },
  },
  {
    path: '/products/:id',
    name: 'product-detail',
    component: ProductDetailView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
      title: 'Chi tiết sản phẩm',
    },
  },
  {
    path: '/products/:id/edit',
    name: 'product-edit',
    component: ProductFormView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'SUPPLIER'],
      title: 'Chỉnh sửa sản phẩm',
    },
  },
  // Admin: full category management. Supplier: read-only listing.
  {
    path: '/categories',
    name: 'categories',
    component: CategoryManagementView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'SUPPLIER'],
      title: 'Danh mục',
    },
  },
  {
    path: '/cart',
    name: 'cart',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['BUYER'],
      title: 'Giỏ hàng',
    },
  },
  {
    path: '/orders',
    name: 'orders',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
      title: 'Đơn hàng',
    },
  },
  {
    path: '/users',
    name: 'users',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN'],
      title: 'Người dùng',
    },
  },
  {
    path: '/companies',
    name: 'companies',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN'],
      title: 'Công ty',
    },
  },
  {
    path: '/commission',
    name: 'commission',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN'],
      title: 'Hoa hồng',
    },
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN'],
      title: 'Thống kê',
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: ProfileView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN'],
      title: 'Cài đặt',
    },
  },

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
 * Phase 3 auth guard (extends Phase 2):
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
  // Send them to the dashboard instead of leaving them on the auth screen.
  if (to.meta?.publicOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
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

    // Role check — accept both `role` and `roleName` shapes so that
    // login responses (role) and /users/me responses (roleName) both work.
    const allowedRoles = to.meta?.roles
    const userRole = auth.currentUser?.role ?? auth.currentUser?.roleName
    if (
      Array.isArray(allowedRoles) &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(userRole)
    ) {
      return { name: 'forbidden' }
    }
  }

  // Allow navigation
  return true
})

export default router
