<script setup>
/**
 * CartView — Buyer's cart page.
 *
 * Loads the cart on mount, groups items by supplier, and lets the buyer
 * update quantities, remove items, clear the cart, and (Phase 6) select
 * items for a single-supplier checkout.
 *
 * Selection invariants (Phase 6):
 *   - One checkout = one supplier.
 *   - Selecting an item from a different supplier unchecks the current
 *     selection so we never accidentally send mixed-supplier data.
 *
 * Notes:
 *   - All pricing, stock and availability values come from the backend.
 *   - After every mutation we re-fetch the cart via the Pinia store so
 *     totals and per-row data stay in sync.
 *   - Checkout is wired up in Phase 6. COD ends at /checkout/result;
 *     ZaloPay does a full-tab redirect from the checkout page.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { saveCheckoutSession } from '@/utils/checkoutSession'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'

import CartSupplierGroup from '@/components/cart/CartSupplierGroup.vue'
import CartSummary from '@/components/cart/CartSummary.vue'

const router = useRouter()
const cartStore = useCartStore()
const toast = useToastStore()

const showClearModal = ref(false)
const clearing = ref(false)

// productId currently being mutated (update or remove). Single-flight per row.
const submittingId = ref(null)

// Phase 6 — selected CartItem IDs (CartItem.id, NOT productId).
const selectedIds = ref(new Set())

const cart = computed(() => cartStore.cart)
const loading = computed(() => cartStore.loading && !cart.value)
const loadError = computed(() => cartStore.error)

// Group items by supplier — backend already provides supplierCompanyId
// and supplierCompanyName on every CartItemResponse.
//
// Each item is decorated with `selected: boolean` so the children can
// stay purely controlled.
const supplierGroups = computed(() => {
  if (!cart.value?.items) return []
  const groups = new Map()
  for (const item of cart.value.items) {
    const key = item.supplierCompanyId ?? 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        name: item.supplierCompanyName || 'Nhà cung cấp',
        items: [],
      })
    }
    groups.get(key).items.push({
      ...item,
      selected: selectedIds.value.has(item.id),
    })
  }
  return Array.from(groups.values())
})

// All currently-checked CartItem IDs (one supplier only by construction).
const selectedCartItems = computed(() => {
  const result = []
  for (const group of supplierGroups.value) {
    for (const item of group.items) {
      if (item.selected) result.push(item)
    }
  }
  return result
})

const selectedSupplierId = computed(() => {
  const items = selectedCartItems.value
  if (items.length === 0) return null
  return items[0].supplierCompanyId
})

const selectedSupplierName = computed(() => {
  const items = selectedCartItems.value
  if (items.length === 0) return null
  return items[0].supplierCompanyName || 'Nhà cung cấp'
})

// All selected items must be available AND have a unit price — the
// backend will reject any that aren't, but we surface it earlier.
const allSelectedAreValid = computed(() => {
  const items = selectedCartItems.value
  if (items.length === 0) return false
  return items.every((i) => i.available && i.unitPrice != null)
})

const canCheckout = computed(
  () =>
    selectedCartItems.value.length > 0 &&
    !!selectedSupplierId.value &&
    allSelectedAreValid.value
)

const checkoutHint = computed(() => {
  if (selectedCartItems.value.length === 0) {
    return 'Vui lòng chọn ít nhất một sản phẩm để thanh toán'
  }
  if (!allSelectedAreValid.value) {
    return 'Vui lòng bỏ chọn các sản phẩm không khả dụng'
  }
  return null
})

async function load() {
  try {
    await cartStore.fetchCart()
  } catch {
    // error is stored on the store; UI shows it via BaseError with retry
  }
  // Re-fetch discards any stale selections.
  selectedIds.value = new Set()
}

onMounted(load)

// If the cart changes underneath us (e.g. supplier deactivated, items
// removed by a background poll) prune any selections that no longer
// reference valid cart items.
watch(
  () => cart.value?.items?.map((i) => i.id) || [],
  (currentIds) => {
    const set = new Set(currentIds)
    let mutated = false
    for (const id of selectedIds.value) {
      if (!set.has(id)) {
        selectedIds.value.delete(id)
        mutated = true
      }
    }
    if (mutated) selectedIds.value = new Set(selectedIds.value)
  }
)

async function onUpdateQuantity({ productId, quantity }) {
  submittingId.value = productId
  try {
    await cartStore.updateItem(productId, quantity)
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    submittingId.value = null
  }
}

async function onRemove(productId) {
  submittingId.value = productId
  try {
    await cartStore.removeItem(productId)
    toast.success('Đã xóa sản phẩm khỏi giỏ hàng')
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    submittingId.value = null
  }
}

function openClearModal() {
  showClearModal.value = true
}

function closeClearModal() {
  if (clearing.value) return
  showClearModal.value = false
}

async function confirmClear() {
  clearing.value = true
  try {
    await cartStore.clearAll()
    toast.success('Đã xóa toàn bộ giỏ hàng')
    selectedIds.value = new Set()
    showClearModal.value = false
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    clearing.value = false
  }
}

function browseProducts() {
  router.push({ name: 'products' })
}

// ── Selection (Phase 6) ────────────────────────────────────────────────────

/**
 * Toggle the selected state of a single item.
 *
 * Enforces the single-supplier invariant: when a user checks an item
 * that belongs to a different supplier than the current selection, we
 * silently replace the selection with that single new item. This
 * matches the backend's "one checkout = one supplier" rule.
 */
function onUpdateItemSelected({ cartItemId, selected }) {
  const next = new Set(selectedIds.value)

  if (selected) {
    const item = cart.value?.items?.find((i) => i.id === cartItemId)
    if (!item) return

    const incomingSupplier = item.supplierCompanyId
    if (selectedSupplierId.value && selectedSupplierId.value !== incomingSupplier) {
      // Different supplier — wipe the previous selection.
      next.clear()
    }
    next.add(cartItemId)
  } else {
    next.delete(cartItemId)
  }

  selectedIds.value = next
}

/**
 * Toggle every available item of one supplier group at once.
 * If `select` is false we clear the entire group from the selection.
 */
function onToggleAll(supplierId, select) {
  const next = new Set(selectedIds.value)

  // If the user is selecting and there's a different supplier already
  // selected, wipe first (single-supplier invariant).
  if (select && selectedSupplierId.value && selectedSupplierId.value !== supplierId) {
    next.clear()
  }

  for (const item of cart.value?.items || []) {
    if (item.supplierCompanyId !== supplierId) continue
    if (!item.available || item.unitPrice == null) continue
    if (select) {
      next.add(item.id)
    } else {
      next.delete(item.id)
    }
  }

  selectedIds.value = next
}

function onCheckout() {
  if (!canCheckout.value) return
  const items = selectedCartItems.value
  const subtotal = items.reduce(
    (acc, i) => acc + (Number(i.subtotal) || 0),
    0
  )
  saveCheckoutSession({
    orderId: null,
    orderCode: null,
    paymentId: null,
    paymentCode: null,
    paymentMethod: null,
    paymentStatus: null,
    orderStatus: null,
    subtotal,
    totalAmount: subtotal,
    paymentExpiredAt: null,
    supplierCompanyId: selectedSupplierId.value,
    supplierCompanyName: selectedSupplierName.value,
    selectedItems: items.map((i) => ({
      cartItemId: i.id,
      productId: i.productId,
      productName: i.productName,
      productImageUrl: i.productImageUrl,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
      supplierCompanyId: i.supplierCompanyId,
      supplierCompanyName: i.supplierCompanyName,
      available: i.available,
    })),
    createdAt: Date.now(),
  })
  router.push({ name: 'checkout', query: { supplier: String(selectedSupplierId.value) } })
}
</script>

<template>
  <div class="cart-view">
    <!-- Header -->
    <header class="cart-view__header">
      <div>
        <h1 class="cart-view__title">Giỏ hàng</h1>
        <p class="cart-view__subtitle">
          Chọn sản phẩm từ một nhà cung cấp để tiến hành thanh toán.
        </p>
      </div>
      <BaseButton
        v-if="cart && cart.totalItems > 0 && !loading"
        variant="ghost"
        @click="openClearModal"
      >
        Xóa toàn bộ
      </BaseButton>
    </header>

    <!-- Loading (initial only) -->
    <div v-if="loading" class="cart-view__state">
      <BaseLoading label="Đang tải giỏ hàng..." />
    </div>

    <!-- Error -->
    <div v-else-if="loadError && !cart" class="cart-view__state">
      <BaseError
        title="Không tải được giỏ hàng"
        :error="loadError"
        @retry="load"
      />
    </div>

    <!-- Empty -->
    <div v-else-if="!cart || cart.totalItems === 0" class="cart-view__state">
      <BaseEmpty
        title="Giỏ hàng của bạn đang trống"
        description="Hãy khám phá các sản phẩm và thêm chúng vào giỏ hàng."
      >
        <BaseButton variant="primary" @click="browseProducts">
          Khám phá sản phẩm
        </BaseButton>
      </BaseEmpty>
    </div>

    <!-- Content -->
    <div v-else class="cart-view__layout">
      <div class="cart-view__groups">
        <CartSupplierGroup
          v-for="group in supplierGroups"
          :key="group.id"
          :supplier-id="group.id"
          :supplier-name="group.name"
          :items="group.items"
          :submitting-id="submittingId"
          selectable
          @update-quantity="onUpdateQuantity"
          @remove="onRemove"
          @update-item-selected="onUpdateItemSelected"
          @toggle-all="(select) => onToggleAll(group.id, select)"
        />
      </div>

      <div class="cart-view__aside">
        <CartSummary
          :cart="cart"
          :clearing="clearing"
          selectable
          :can-checkout="canCheckout"
          :checkout-hint="checkoutHint"
          @clear="openClearModal"
          @checkout="onCheckout"
        />
      </div>
    </div>

    <!-- Clear cart confirmation -->
    <BaseModal v-model="showClearModal" title="Xóa toàn bộ giỏ hàng" size="sm">
      <p class="cart-view__confirm-text">
        Bạn có chắc chắn muốn xóa <strong>tất cả {{ cart?.totalItems ?? 0 }}</strong> sản phẩm khỏi giỏ hàng?
        <br>
        Hành động này không thể hoàn tác.
      </p>
      <template #footer>
        <button
          type="button"
          class="cart-view__modal-btn cart-view__modal-btn--ghost"
          :disabled="clearing"
          @click="closeClearModal"
        >
          Hủy
        </button>
        <button
          type="button"
          class="cart-view__modal-btn cart-view__modal-btn--danger"
          :disabled="clearing"
          @click="confirmClear"
        >
          <span v-if="clearing" class="cart-view__spinner" aria-hidden="true" />
          Xóa
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.cart-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.cart-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.cart-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.cart-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.cart-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.cart-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-5);
  align-items: start;
}

.cart-view__groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.cart-view__aside {
  min-width: 0;
}

.cart-view__confirm-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

.cart-view__confirm-text strong {
  color: var(--color-text-primary);
}

.cart-view__modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 38px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border: 1px solid transparent;
}

.cart-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.cart-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.cart-view__modal-btn--danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}

.cart-view__modal-btn--danger:hover:not(:disabled) {
  background-color: #B91C1C;
}

.cart-view__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .cart-view__layout {
    grid-template-columns: 1fr;
  }
}
</style>
