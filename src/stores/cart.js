/**
 * Cart store — Buyer cart state shared across views.
 *
 * Why a Pinia store?
 *   - The header badge, the ProductDetailView add-to-cart widget and the
 *     CartView all read or mutate the same entity. A single source of truth
 *     prevents duplicate `GET /cart` calls.
 *   - After every mutation we re-fetch the cart so that the header badge
 *     count, line items and totals stay in sync with the backend.
 *
 * Important:
 *   - Cart operations do NOT reserve stock. Adding only checks
 *     `availableQuantity >= quantity` server-side.
 *   - Pricing is recomputed server-side on every operation; the frontend
 *     never rebuilds quantity-tier logic.
 *   - The store is only meaningful for BUYER. SUPPLIER / ADMIN hitting the
 *     backend endpoints would receive 403 from the controller.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getCart,
  addToCart as svcAddToCart,
  updateCartItem as svcUpdateCartItem,
  removeCartItem as svcRemoveCartItem,
  clearCart as svcClearCart,
} from '@/services/cartService'

export const useCartStore = defineStore('cart', () => {
  // ── State ─────────────────────────────────────────────────────────────────

  /** Latest CartResponse from the backend, or null when not yet fetched. */
  const cart = ref(null)

  /** True while the initial GET /cart is in flight. */
  const loading = ref(false)

  /** Initial-fetch error (not for individual mutations — those throw). */
  const error = ref(null)

  /**
   * True while any single cart mutation is in flight.
   * Used by the header badge as a soft "saving" indicator.
   */
  const mutating = ref(false)

  /** Incremented on every successful mutation to nudge UI watchers. */
  const revision = ref(0)

  // ── Computed ───────────────────────────────────────────────────────────────

  const totalItems = computed(() => cart.value?.totalItems ?? 0)

  const isEmpty = computed(
    () => !cart.value || (cart.value.totalItems ?? 0) === 0
  )

  const itemCount = computed(() =>
    Array.isArray(cart.value?.items) ? cart.value.items.length : 0
  )

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Fetch the current buyer's cart.
   * Resolves with the CartResponse (even on 200 with empty items).
   * Rejects on error so the caller can decide whether to retry / toast.
   */
  async function fetchCart() {
    loading.value = true
    error.value = null
    try {
      cart.value = await getCart()
      revision.value += 1
      return cart.value
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Add an item to the cart and re-sync.
   * Throws on error so callers can surface a toast.
   */
  async function addItem(productId, quantity) {
    mutating.value = true
    try {
      await svcAddToCart({ productId, quantity })
      await fetchCart()
    } finally {
      mutating.value = false
    }
  }

  /**
   * Update an item's quantity (absolute replacement) and re-sync.
   * Throws on error.
   */
  async function updateItem(productId, quantity) {
    mutating.value = true
    try {
      await svcUpdateCartItem(productId, quantity)
      await fetchCart()
    } finally {
      mutating.value = false
    }
  }

  /**
   * Remove an item from the cart and re-sync.
   * Throws on error.
   */
  async function removeItem(productId) {
    mutating.value = true
    try {
      await svcRemoveCartItem(productId)
      await fetchCart()
    } finally {
      mutating.value = false
    }
  }

  /**
   * Clear the cart entirely and re-sync.
   * Throws on error.
   */
  async function clearAll() {
    mutating.value = true
    try {
      await svcClearCart()
      await fetchCart()
    } finally {
      mutating.value = false
    }
  }

  /**
   * Reset the store (e.g. on logout).
   * Prevents stale cart state leaking between user sessions.
   */
  function reset() {
    cart.value = null
    loading.value = false
    error.value = null
    mutating.value = false
    revision.value += 1
  }

  return {
    // state
    cart,
    loading,
    error,
    mutating,
    revision,
    // computed
    totalItems,
    itemCount,
    isEmpty,
    // actions
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    clearAll,
    reset,
  }
})
