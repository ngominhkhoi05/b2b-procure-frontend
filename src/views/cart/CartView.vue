<script setup>
/**
 * CartView — Buyer's cart page.
 *
 * Loads the cart on mount, groups items by supplier, and lets the buyer
 * update quantities, remove items, and clear the cart.
 *
 * Notes:
 *   - All pricing, stock and availability values come from the backend.
 *   - The checkout button is intentionally disabled — Phase 6 only.
 *   - After every mutation we re-fetch the cart via the Pinia store so
 *     totals and per-row data stay in sync.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'

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

const cart = computed(() => cartStore.cart)
const loading = computed(() => cartStore.loading && !cart.value)
const loadError = computed(() => cartStore.error)

// Group items by supplier — backend already provides supplierCompanyId
// and supplierCompanyName on every CartItemResponse.
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
    groups.get(key).items.push(item)
  }
  return Array.from(groups.values())
})

async function load() {
  try {
    await cartStore.fetchCart()
  } catch {
    // error is stored on the store; UI shows it via BaseError with retry
  }
}

onMounted(load)

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
</script>

<template>
  <div class="cart-view">
    <!-- Header -->
    <header class="cart-view__header">
      <div>
        <h1 class="cart-view__title">Giỏ hàng</h1>
        <p class="cart-view__subtitle">
          Xem và quản lý các sản phẩm bạn đã thêm vào giỏ.
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
          @update-quantity="onUpdateQuantity"
          @remove="onRemove"
        />
      </div>

      <div class="cart-view__aside">
        <CartSummary :cart="cart" :clearing="clearing" @clear="openClearModal" />
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
