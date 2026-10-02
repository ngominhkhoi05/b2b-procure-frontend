/**
 * Centralised status / payment label and tone utilities for the Order domain.
 *
 * Single source of truth — all order views import from here instead of
 * hard-coding Vietnamese strings or CSS class names.
 */

/**
 * Vietnamese labels for all 8 OrderStatus values.
 * @type {Record<string, string>}
 */
export const ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  PAID: 'Đã thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã hủy',
}

/**
 * Semantic CSS class key per OrderStatus.
 * Allowed values: 'warning' | 'info' | 'success' | 'danger' | 'neutral'
 * @type {Record<string, string>}
 */
export const ORDER_STATUS_TONE = {
  PENDING_CONFIRMATION: 'warning',
  PAID: 'info',
  CONFIRMED: 'info',
  PREPARING: 'info',
  SHIPPING: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
}

/**
 * Vietnamese labels for supported PaymentMethod values.
 * MOMO intentionally omitted per Phase 7 spec (MVP only shows COD + ZaloPay).
 * @type {Record<string, string>}
 */
export const PAYMENT_METHOD_LABELS = {
  COD: 'Thanh toán khi nhận hàng',
  ZALOPAY: 'ZaloPay',
}

/**
 * Vietnamese labels for all 6 PaymentStatus values.
 * @type {Record<string, string>}
 */
export const PAYMENT_STATUS_LABELS = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
  REFUND_PENDING: 'Chờ hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
}

/**
 * Semantic CSS class key per PaymentStatus.
 * @type {Record<string, string>}
 */
export const PAYMENT_STATUS_TONE = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  EXPIRED: 'neutral',
  REFUND_PENDING: 'warning',
  REFUNDED: 'info',
}

/**
 * Options array for a BaseSelect `options` prop — includes all 8 order statuses
 * plus a leading "All" option.
 * @type {{value: string, label: string}[]}
 */
export const ORDER_STATUS_OPTIONS = [
  { value: 'PENDING_CONFIRMATION', label: ORDER_STATUS_LABELS.PENDING_CONFIRMATION },
  { value: 'PAID',                 label: ORDER_STATUS_LABELS.PAID },
  { value: 'CONFIRMED',            label: ORDER_STATUS_LABELS.CONFIRMED },
  { value: 'PREPARING',            label: ORDER_STATUS_LABELS.PREPARING },
  { value: 'SHIPPING',             label: ORDER_STATUS_LABELS.SHIPPING },
  { value: 'COMPLETED',            label: ORDER_STATUS_LABELS.COMPLETED },
  { value: 'REJECTED',             label: ORDER_STATUS_LABELS.REJECTED },
  { value: 'CANCELLED',            label: ORDER_STATUS_LABELS.CANCELLED },
]

/**
 * Options array for a BaseSelect `options` prop for COD + ZaloPay.
 * The "Tất cả phương thức" placeholder is rendered by BaseSelect itself
 * via the `placeholder` prop, so it must NOT be included here.
 * @type {{value: string, label: string}[]}
 */
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'COD',     label: PAYMENT_METHOD_LABELS.COD },
  { value: 'ZALOPAY', label: PAYMENT_METHOD_LABELS.ZALOPAY },
]

/**
 * Returns true when the buyer is allowed to cancel an order with the given status.
 * Backend enforces this rule independently; this helper is for UI gating only.
 *
 * @param {string} status
 * @returns {boolean}
 */
export function canCancelOrder(status) {
  return status === 'PENDING_CONFIRMATION' || status === 'PAID'
}

/**
 * Returns true when the payment status is refund-relevant and should trigger
 * the refund banner in the detail view.
 *
 * @param {string} paymentStatus
 * @returns {boolean}
 */
export function isRefundRelevant(paymentStatus) {
  return paymentStatus === 'REFUND_PENDING' || paymentStatus === 'REFUNDED'
}

/**
 * Looks up the Vietnamese label for an OrderStatus.
 * Falls back to the raw string when the status is unknown.
 *
 * @param {string} status
 * @returns {string}
 */
export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] ?? status
}

/**
 * Looks up the semantic CSS class key for an OrderStatus.
 * Falls back to 'neutral' when the status is unknown.
 *
 * @param {string} status
 * @returns {string}
 */
export function getOrderStatusTone(status) {
  return ORDER_STATUS_TONE[status] ?? 'neutral'
}

/**
 * Looks up the Vietnamese label for a PaymentMethod.
 * Falls back to the raw string when the method is unknown.
 *
 * @param {string} method
 * @returns {string}
 */
export function getPaymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

/**
 * Looks up the Vietnamese label for a PaymentStatus.
 * Falls back to the raw string when the status is unknown.
 *
 * @param {string} status
 * @returns {string}
 */
export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] ?? status
}

/**
 * Looks up the semantic CSS class key for a PaymentStatus.
 * Falls back to 'neutral' when the status is unknown.
 *
 * @param {string} status
 * @returns {string}
 */
export function getPaymentStatusTone(status) {
  return PAYMENT_STATUS_TONE[status] ?? 'neutral'
}

// ─── Supplier-specific helpers ────────────────────────────────────────────────

/**
 * Tab options for the SUPPLIER order-list filter bar.
 * Keys map 1:1 to the backend `status` query parameter accepted by
 * `GET /api/v1/orders` (single-value enum string per request).
 *
 * @type {{ key: string, label: string }[]}
 */
export const SUPPLIER_STATUS_TABS = [
  { key: '',                    label: 'Tất cả' },
  { key: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED',           label: 'Đã xác nhận' },
  { key: 'PREPARING',           label: 'Đang chuẩn bị' },
  { key: 'SHIPPING',            label: 'Đang giao' },
  { key: 'COMPLETED',           label: 'Hoàn thành' },
  { key: 'REJECTED',            label: 'Bị từ chối' },
  { key: 'CANCELLED',           label: 'Đã hủy' },
]

/**
 * Supplier lifecycle action table.
 *
 * This table only controls which buttons are rendered in the UI.
 * The backend is the authoritative source for which transitions are valid —
 * it will return 409 / 422 for invalid transitions (e.g. Confirm on a
 * PENDING_CONFIRMATION order that has already timed out, or Confirm on a PAID
 * order with COD where the buyer has already paid online). The actions card
 * is refreshed after every action by re-fetching the full order detail, so
 * stale state is handled automatically.
 *
 * Per-status rules (must mirror backend OrderLifecycleServiceImpl.confirmOrder):
 *   • PENDING_CONFIRMATION + COD       → confirm + reject
 *   • PENDING_CONFIRMATION + ZALOPAY   → reject only (payment not yet success,
 *                                          backend rejects confirm until PAID)
 *   • PAID (COD or ZALOPAY)            → confirm + reject (refund path)
 *   • CONFIRMED → PREPARING only
 *   • PREPARING → SHIPPING only
 *   • SHIPPING  → COMPLETED only
 *
 * @typedef {Object} SupplierOrderAction
 * @property {'confirm'|'reject'|'preparing'|'shipping'|'complete'} key
 * @property {string}  label     Vietnamese button label
 * @property {'primary'|'danger'} variant
 * @property {boolean} [requiresReason]  true when the backend requires a reason body
 *
 * @type {Record<string, SupplierOrderAction[]>}
 */
export const SUPPLIER_AVAILABLE_ACTIONS = {
  PENDING_CONFIRMATION: [
    { key: 'confirm', label: 'Xác nhận đơn hàng', variant: 'primary' },
    { key: 'reject',  label: 'Từ chối đơn hàng',  variant: 'danger', requiresReason: true },
  ],
  PAID: [
    { key: 'confirm', label: 'Xác nhận đơn hàng',     variant: 'primary' },
    { key: 'reject',  label: 'Từ chối & hoàn tiền',  variant: 'danger', requiresReason: true },
  ],
  CONFIRMED: [
    { key: 'preparing', label: 'Đánh dấu đang chuẩn bị', variant: 'primary' },
  ],
  PREPARING: [
    { key: 'shipping', label: 'Đánh dấu đang giao',    variant: 'primary' },
  ],
  SHIPPING: [
    { key: 'complete', label: 'Đánh dấu hoàn thành',    variant: 'primary' },
  ],
  COMPLETED: [],
  REJECTED:  [],
  CANCELLED: [],
}

/**
 * Filter rules keyed by OrderStatus. Each rule receives the payment context
 * and returns the array of supplier actions to render.
 *
 * Rules intentionally mirror backend gating so the UI never offers an action
 * the API will reject (e.g. Confirm on a PENDING_CONFIRMATION ZaloPay order
 * whose payment has not yet reached SUCCESS — backend rejects with
 * "current status: PENDING_CONFIRMATION, expected: PAID").
 *
 * @typedef {Object} PaymentContext
 * @property {string|null} paymentMethod   'COD' | 'ZALOPAY' | null/unknown
 *
 * @type {Record<string, (ctx: PaymentContext) => SupplierOrderAction[]>}
 */
const SUPPLIER_ACTION_FILTERS = {
  PENDING_CONFIRMATION: ({ paymentMethod }) => {
    // ZaloPay orders in PENDING_CONFIRMATION have not been paid yet — backend
    // will reject any confirm attempt. Only allow reject.
    if (paymentMethod === 'ZALOPAY') {
      return SUPPLIER_AVAILABLE_ACTIONS.PENDING_CONFIRMATION.filter(a => a.key === 'reject')
    }
    // COD (or unknown method, e.g. before payment is loaded): keep both.
    return SUPPLIER_AVAILABLE_ACTIONS.PENDING_CONFIRMATION
  },
  PAID: () => SUPPLIER_AVAILABLE_ACTIONS.PAID,
  CONFIRMED: () => SUPPLIER_AVAILABLE_ACTIONS.CONFIRMED,
  PREPARING: () => SUPPLIER_AVAILABLE_ACTIONS.PREPARING,
  SHIPPING:  () => SUPPLIER_AVAILABLE_ACTIONS.SHIPPING,
}

/**
 * Returns the array of supplier actions to render for the given order status
 * and payment context. Falls back to an empty array for unknown statuses.
 *
 * @param {string} status
 * @param {PaymentContext} [paymentContext]
 * @returns {SupplierOrderAction[]}
 */
export function getAvailableSupplierActions(status, paymentContext = {}) {
  const filter = SUPPLIER_ACTION_FILTERS[status]
  return filter ? filter(paymentContext) : []
}
