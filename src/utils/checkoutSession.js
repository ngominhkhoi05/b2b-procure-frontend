/**
 * Checkout session — short-lived persistence for the checkout flow.
 *
 * Why sessionStorage?
 *   The two-step ZaloPay flow performs a full-tab redirect (`window.location.assign`)
 *   to ZaloPay. Memory state is wiped by that redirect; localStorage would survive
 *   longer than we need (across future unrelated orders).
 *
 *   `sessionStorage` survives the redirect but is cleared when the tab closes,
 *   which is exactly the lifetime we want for a pending order's UI affordances.
 *
 * Security note:
 *   We only persist non-sensitive identifiers (orderId, paymentId, orderCode,
 *   selectedItems). We NEVER persist payment secrets, JWTs, or ZaloPay tokens.
 *   The backend already rejects requests from another buyer via ownership checks,
 *   so leaking a paymentId into the browser is harmless.
 */

const STORAGE_KEY = 'b2b_checkout_session'

function safeGet(key) {
  try {
    if (typeof window === 'undefined') return null
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(key, value)
  } catch {
    /* quota / private mode — silently ignore */
  }
}

function safeRemove(key) {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * @typedef {Object} CheckoutSelectionItem
 * @property {number} cartItemId           — CartItem.id from Phase 5's response
 * @property {number} productId
 * @property {string} productName
 * @property {string|null} productImageUrl
 * @property {string} sku
 * @property {number} quantity
 * @property {string|number} unitPrice     — backend-computed
 * @property {string|number} subtotal      — backend-computed
 * @property {number} supplierCompanyId
 * @property {string} supplierCompanyName
 * @property {boolean} available           — backend-computed
 */

/**
 * @typedef {Object} CheckoutSession
 * @property {number|null}                       orderId        — null until checkout succeeds
 * @property {string|null}                       orderCode
 * @property {number|null}                       paymentId
 * @property {string|null}                       paymentCode
 * @property {'COD'|'ZALOPAY'|null}              paymentMethod
 * @property {string|null}                       paymentStatus  — raw backend value
 * @property {string|null}                       orderStatus    — raw backend value
 * @property {string|number|null}                subtotal
 * @property {string|number|null}                totalAmount
 * @property {string|null}                       paymentExpiredAt
 * @property {number}                            supplierCompanyId
 * @property {string}                            supplierCompanyName
 * @property {CheckoutSelectionItem[]}           selectedItems
 * @property {number}                            createdAt      — epoch ms when the session was first written
 */

/**
 * Load the current checkout session.
 * @returns {CheckoutSession | null}
 */
export function loadCheckoutSession() {
  const raw = safeGet(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Persist (replace) the current checkout session.
 * @param {CheckoutSession} payload
 */
export function saveCheckoutSession(payload) {
  if (!payload || typeof payload !== 'object') return
  safeSet(STORAGE_KEY, JSON.stringify(payload))
}

/**
 * Merge a partial update into the existing session.
 * @param {Partial<CheckoutSession>} patch
 */
export function patchCheckoutSession(patch) {
  const current = loadCheckoutSession() || {}
  saveCheckoutSession({ ...current, ...patch })
}

/**
 * Clear the current checkout session.
 */
export function clearCheckoutSession() {
  safeRemove(STORAGE_KEY)
}
