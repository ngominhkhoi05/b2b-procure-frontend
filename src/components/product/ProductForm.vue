<script setup>
/**
 * ProductForm — reusable create / edit form for products.
 *
 * Props:
 *   initialProduct — ProductResponse | null  (null = create mode)
 *   categories     — Array<{id, name}>       (for the category <select>)
 *   isAdmin        — boolean                  (controls supplierCompanyId field)
 *   supplierCompanies — Array<{id, name}>     (only used when isAdmin = true)
 *   submitting     — boolean
 *   errors         — Record<string,string>    (field-level errors from server)
 *
 * Emits:
 *   submit(payload) — payload conforms to backend request shape
 *   cancel()
 */
import { reactive, computed, watch } from 'vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const props = defineProps({
  initialProduct: {
    type: Object,
    default: null,
  },
  categories: {
    type: Array,
    default: () => [],
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  supplierCompanies: {
    type: Array,
    default: () => [],
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  errors: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['submit', 'cancel'])

// ── Local state ──────────────────────────────────────────────────────────
const form = reactive({
  name: '',
  sku: '',
  description: '',
  imageUrl: '',
  stockQuantity: 0,
  categoryId: null,
  supplierCompanyId: null,
})

const localErrors = reactive({
  name: '',
  sku: '',
  description: '',
  imageUrl: '',
  stockQuantity: '',
  categoryId: '',
  supplierCompanyId: '',
})

const isEdit = computed(() => Boolean(props.initialProduct?.id))

const categoryOptions = computed(() =>
  props.categories.map((c) => ({ value: c.id, label: c.name }))
)

const supplierOptions = computed(() =>
  props.supplierCompanies.map((c) => ({ value: c.id, label: c.name }))
)

// ── Initialise from initialProduct / reset on change ─────────────────────
watch(
  () => props.initialProduct,
  (p) => {
    if (p) {
      form.name = p.name || ''
      form.sku = p.sku || ''
      form.description = p.description || ''
      form.imageUrl = p.imageUrl || ''
      form.stockQuantity = p.stockQuantity ?? 0
      form.categoryId = p.categoryId ?? null
      form.supplierCompanyId = p.supplierCompanyId ?? null
    } else {
      form.name = ''
      form.sku = ''
      form.description = ''
      form.imageUrl = ''
      form.stockQuantity = 0
      form.categoryId = null
      form.supplierCompanyId = props.isAdmin ? null : null
    }
    // Reset local validation on reset
    Object.keys(localErrors).forEach((k) => { localErrors[k] = '' })
  },
  { immediate: true }
)

// ── Validation ───────────────────────────────────────────────────────────
function validate() {
  let valid = true
  localErrors.name = ''
  localErrors.sku = ''
  localErrors.description = ''
  localErrors.imageUrl = ''
  localErrors.stockQuantity = ''
  localErrors.categoryId = ''
  localErrors.supplierCompanyId = ''

  if (!form.name.trim()) {
    localErrors.name = 'Tên sản phẩm là bắt buộc'
    valid = false
  }

  if (!isEdit.value && !form.sku.trim()) {
    localErrors.sku = 'SKU là bắt buộc'
    valid = false
  }

  if (!form.categoryId) {
    localErrors.categoryId = 'Vui lòng chọn danh mục'
    valid = false
  }

  if (props.isAdmin && !form.supplierCompanyId) {
    localErrors.supplierCompanyId = 'Vui lòng chọn nhà cung cấp'
    valid = false
  }

  if (form.stockQuantity == null || Number.isNaN(Number(form.stockQuantity)) || Number(form.stockQuantity) < 0) {
    localErrors.stockQuantity = 'Tồn kho phải là số không âm'
    valid = false
  }

  if (form.imageUrl && form.imageUrl.length > 500) {
    localErrors.imageUrl = 'URL hình ảnh không quá 500 ký tự'
    valid = false
  }

  return valid
}

// ── Submit ───────────────────────────────────────────────────────────────
function onSubmit() {
  if (!validate()) return

  const payload = {
    name: form.name.trim(),
    sku: form.sku.trim(),
    description: form.description.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    stockQuantity: Number(form.stockQuantity) || 0,
    categoryId: form.categoryId,
  }

  // Only attach supplierCompanyId when the current user is ADMIN.
  // The backend derives it from the JWT for SUPPLIER, so we must not send it.
  if (props.isAdmin && form.supplierCompanyId) {
    payload.supplierCompanyId = form.supplierCompanyId
  }

  // Backend UpdateProductRequest treats sku as optional; only send it if changed/non-empty
  if (isEdit.value && !payload.sku) {
    delete payload.sku
  }

  emit('submit', payload)
}

// Clear a local field error as the user types
function clearFieldError(field) {
  localErrors[field] = ''
}

function getError(field) {
  return localErrors[field] || props.errors?.[field] || ''
}
</script>

<template>
  <form class="product-form" novalidate @submit.prevent="onSubmit">
    <!-- General error from backend -->
    <div v-if="errors.general" class="product-form__general-error" role="alert">
      {{ errors.general }}
    </div>

    <div class="product-form__grid">
      <BaseInput
        v-model="form.name"
        label="Tên sản phẩm"
        placeholder="Nhập tên sản phẩm"
        :error="getError('name')"
        :disabled="submitting"
        required
        @update:modelValue="clearFieldError('name')"
      />

      <BaseInput
        v-model="form.sku"
        label="SKU"
        placeholder="VD: SP-001"
        :error="getError('sku')"
        :disabled="submitting || isEdit"
        :required="!isEdit"
        @update:modelValue="clearFieldError('sku')"
      />

      <BaseSelect
        v-model="form.categoryId"
        label="Danh mục"
        placeholder="— Chọn danh mục —"
        :options="categoryOptions"
        :error="getError('categoryId')"
        :disabled="submitting"
        required
        @update:modelValue="clearFieldError('categoryId')"
      />

      <!-- Supplier only visible when ADMIN is creating the product. -->
      <BaseSelect
        v-if="isAdmin && !isEdit"
        v-model="form.supplierCompanyId"
        label="Nhà cung cấp"
        placeholder="— Chọn nhà cung cấp —"
        :options="supplierOptions"
        :error="getError('supplierCompanyId')"
        :disabled="submitting"
        required
        @update:modelValue="clearFieldError('supplierCompanyId')"
      />

      <BaseInput
        v-model.number="form.stockQuantity"
        label="Tồn kho"
        type="number"
        placeholder="0"
        :error="getError('stockQuantity')"
        :disabled="submitting"
        @update:modelValue="clearFieldError('stockQuantity')"
      />

      <BaseInput
        v-model="form.imageUrl"
        label="URL hình ảnh"
        placeholder="https://..."
        :error="getError('imageUrl')"
        :disabled="submitting"
        autocomplete="off"
        @update:modelValue="clearFieldError('imageUrl')"
      />
    </div>

    <div class="product-form__field product-form__field--full">
      <BaseInput
        v-model="form.description"
        label="Mô tả"
        placeholder="Mô tả chi tiết sản phẩm"
        :error="getError('description')"
        :disabled="submitting"
        @update:modelValue="clearFieldError('description')"
      />
    </div>

    <!-- Form actions -->
    <div class="product-form__actions">
      <button
        type="button"
        class="product-form__btn product-form__btn--ghost"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Hủy
      </button>
      <button
        type="submit"
        class="product-form__btn product-form__btn--primary"
        :disabled="submitting"
      >
        <span v-if="submitting" class="product-form__spinner" aria-hidden="true" />
        {{ isEdit ? 'Cập nhật' : 'Tạo sản phẩm' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.product-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  background: var(--color-surface);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.product-form__general-error {
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.product-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.product-form__field--full {
  grid-column: 1 / -1;
}

.product-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.product-form__btn {
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

.product-form__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-form__btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.product-form__btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.product-form__btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.product-form__btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.product-form__spinner {
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

@media (max-width: 640px) {
  .product-form__grid {
    grid-template-columns: 1fr;
  }

  .product-form {
    padding: var(--space-4);
  }
}
</style>
