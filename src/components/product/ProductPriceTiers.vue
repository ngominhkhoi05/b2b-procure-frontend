<script setup>
/**
 * ProductPriceTiers — list + inline management of a product's price tiers.
 *
 * Props:
 *   productId — number|string
 *   editable  — boolean
 *
 * Behaviour:
 *   - Always loads /products/{id}/prices on mount and after mutations.
 *   - When editable=true, surfaces add/edit/delete buttons + modals.
 *   - Surfaces backend errors via toast (no fake client-side overlap detection —
 *     backend is source of truth).
 */
import { ref, onMounted, computed } from 'vue'
import {
  listProductPrices,
  createProductPrice,
  updateProductPrice,
  deleteProductPrice,
} from '@/services/productService'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatCurrency, formatDateTime } from '@/utils/format'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ProductPriceTierForm from './ProductPriceTierForm.vue'

const props = defineProps({
  productId: {
    type: [Number, String],
    required: true,
  },
  editable: {
    type: Boolean,
    default: false,
  },
})

const toast = useToastStore()

const tiers = ref([])
const loading = ref(false)
const error = ref(null)

const showAdd = ref(false)
const showEdit = ref(false)
const showDelete = ref(false)
const editingTier = ref(null)
const deletingTier = ref(null)
const submitting = ref(false)
const formError = ref('')

const sortedTiers = computed(() => {
  // Backend already returns sorted asc by minQuantity; re-sort defensively.
  return [...tiers.value].sort((a, b) => a.minQuantity - b.minQuantity)
})

async function load() {
  if (!props.productId) return
  loading.value = true
  error.value = null
  try {
    tiers.value = await listProductPrices(props.productId)
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openAdd() {
  editingTier.value = null
  formError.value = ''
  showAdd.value = true
}

function openEdit(tier) {
  editingTier.value = tier
  formError.value = ''
  showEdit.value = true
}

function openDelete(tier) {
  deletingTier.value = tier
  showDelete.value = true
}

function closeAll() {
  showAdd.value = false
  showEdit.value = false
  showDelete.value = false
  editingTier.value = null
  deletingTier.value = null
  formError.value = ''
}

async function handleSubmit(payload) {
  submitting.value = true
  formError.value = ''
  try {
    if (editingTier.value) {
      await updateProductPrice(props.productId, editingTier.value.id, payload)
      toast.success('Cập nhật bậc giá thành công')
    } else {
      await createProductPrice(props.productId, payload)
      toast.success('Thêm bậc giá thành công')
    }
    closeAll()
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    formError.value = message
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (!deletingTier.value) return
  submitting.value = true
  try {
    await deleteProductPrice(props.productId, deletingTier.value.id)
    toast.success('Xóa bậc giá thành công')
    closeAll()
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    formError.value = message
    toast.error(message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="price-tiers">
    <header class="price-tiers__header">
      <div>
        <h3 class="price-tiers__title">Bảng giá theo số lượng</h3>
        <p class="price-tiers__subtitle">
          {{ editable ? 'Quản lý các bậc giá cho sản phẩm này.' : 'Các bậc giá áp dụng cho sản phẩm.' }}
        </p>
      </div>
      <BaseButton
        v-if="editable"
        variant="primary"
        @click="openAdd"
      >
        Thêm bậc giá
      </BaseButton>
    </header>

    <!-- Loading -->
    <div v-if="loading && tiers.length === 0" class="price-tiers__state">
      <BaseLoading label="Đang tải bảng giá..." />
    </div>

    <!-- Error -->
    <div v-else-if="error && tiers.length === 0" class="price-tiers__state">
      <BaseError
        title="Không tải được bảng giá"
        :error="error"
        @retry="load"
      />
    </div>

    <!-- Empty -->
    <div v-else-if="tiers.length === 0" class="price-tiers__state">
      <BaseEmpty
        title="Chưa có bậc giá nào"
        :description="editable ? 'Thêm bậc giá đầu tiên để khách hàng có thể mua sản phẩm.' : 'Sản phẩm hiện chưa có bậc giá được cấu hình.'"
      >
        <BaseButton v-if="editable" variant="primary" @click="openAdd">
          Thêm bậc giá
        </BaseButton>
      </BaseEmpty>
    </div>

    <!-- Table -->
    <div v-else class="price-tiers__table-wrap">
      <table class="price-tiers__table" role="table">
        <thead>
          <tr>
            <th class="price-tiers__th">Số lượng tối thiểu</th>
            <th class="price-tiers__th">Số lượng tối đa</th>
            <th class="price-tiers__th price-tiers__th--num">Đơn giá</th>
            <th class="price-tiers__th">Cập nhật</th>
            <th v-if="editable" class="price-tiers__th price-tiers__th--actions" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in sortedTiers" :key="t.id" class="price-tiers__row">
            <td class="price-tiers__cell">{{ t.minQuantity }}</td>
            <td class="price-tiers__cell">
              <span v-if="t.maxQuantity == null" class="price-tiers__infinity">∞</span>
              <span v-else>{{ t.maxQuantity }}</span>
            </td>
            <td class="price-tiers__cell price-tiers__cell--num">
              {{ formatCurrency(t.unitPrice) }}
            </td>
            <td class="price-tiers__cell">{{ formatDateTime(t.updatedAt) || '—' }}</td>
            <td v-if="editable" class="price-tiers__cell price-tiers__cell--actions">
              <button
                type="button"
                class="price-tiers__action price-tiers__action--edit"
                @click="openEdit(t)"
              >
                Sửa
              </button>
              <button
                type="button"
                class="price-tiers__action price-tiers__action--delete"
                @click="openDelete(t)"
              >
                Xóa
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add modal -->
    <BaseModal v-model="showAdd" title="Thêm bậc giá" size="lg">
      <ProductPriceTierForm
        :initial="null"
        :submitting="submitting"
        :error="formError"
        @submit="handleSubmit"
        @cancel="closeAll"
      />
    </BaseModal>

    <!-- Edit modal -->
    <BaseModal v-model="showEdit" title="Cập nhật bậc giá" size="lg">
      <ProductPriceTierForm
        :initial="editingTier"
        :submitting="submitting"
        :error="formError"
        @submit="handleSubmit"
        @cancel="closeAll"
      />
    </BaseModal>

    <!-- Delete confirmation -->
    <BaseModal v-model="showDelete" title="Xóa bậc giá" size="sm">
      <p class="price-tiers__confirm-text">
        Bạn có chắc chắn muốn xóa bậc giá
        <strong v-if="deletingTier">
          [{{ deletingTier.minQuantity }} –
          <span v-if="deletingTier.maxQuantity == null">∞</span>
          <span v-else>{{ deletingTier.maxQuantity }}</span>]
          giá {{ formatCurrency(deletingTier.unitPrice) }}
        </strong>?
        Thao tác này không thể hoàn tác.
      </p>
      <template #footer>
        <button
          type="button"
          class="price-tiers__btn price-tiers__btn--ghost"
          :disabled="submitting"
          @click="closeAll"
        >
          Hủy
        </button>
        <button
          type="button"
          class="price-tiers__btn price-tiers__btn--danger"
          :disabled="submitting"
          @click="confirmDelete"
        >
          <span v-if="submitting" class="price-tiers__spinner" aria-hidden="true" />
          Xóa
        </button>
      </template>
    </BaseModal>
  </section>
</template>

<style scoped>
.price-tiers {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.price-tiers__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.price-tiers__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.price-tiers__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.price-tiers__state {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.price-tiers__table-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.price-tiers__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.price-tiers__th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-surface-alt);
  color: var(--color-text-secondary);
  font-weight: var(--weight-medium);
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
}

.price-tiers__th--num {
  text-align: right;
}

.price-tiers__th--actions {
  width: 1%;
  white-space: nowrap;
}

.price-tiers__row {
  border-bottom: 1px solid var(--color-border);
}

.price-tiers__row:last-child {
  border-bottom: none;
}

.price-tiers__cell {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.price-tiers__cell--num {
  text-align: right;
  font-weight: var(--weight-medium);
}

.price-tiers__cell--actions {
  white-space: nowrap;
  text-align: right;
}

.price-tiers__infinity {
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
}

.price-tiers__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-surface);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  margin-left: var(--space-2);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.price-tiers__action:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.price-tiers__action--delete {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.price-tiers__action--delete:hover {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.price-tiers__confirm-text {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

.price-tiers__confirm-text strong {
  color: var(--color-text-primary);
}

.price-tiers__btn {
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
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid transparent;
}

.price-tiers__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.price-tiers__btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.price-tiers__btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.price-tiers__btn--danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}

.price-tiers__btn--danger:hover:not(:disabled) {
  background-color: #B91C1C;
}

.price-tiers__spinner {
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

@media (max-width: 720px) {
  .price-tiers__table,
  .price-tiers__thead,
  .price-tiers__tbody,
  .price-tiers__row,
  .price-tiers__th,
  .price-tiers__cell {
    display: block;
  }

  .price-tiers__thead {
    display: none;
  }

  .price-tiers__row {
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .price-tiers__cell {
    padding: var(--space-1) 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: none;
    text-align: left;
  }

  .price-tiers__cell--num,
  .price-tiers__cell--actions {
    text-align: left;
  }

  .price-tiers__cell::before {
    content: attr(data-label);
    color: var(--color-text-muted);
    font-size: var(--font-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}
</style>
