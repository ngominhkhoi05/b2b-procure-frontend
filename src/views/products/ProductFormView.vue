<script setup>
/**
 * ProductFormView — create / edit a product.
 *
 * Routes:
 *   /products/new           → create mode (ADMIN, SUPPLIER)
 *   /products/:id/edit      → edit mode (ADMIN, SUPPLIER)
 *
 * Prefetches categories and (admin only) supplier companies for the
 * dropdowns. Supplier companies are not yet exposed via a public API in
 * Phase 4, so when isAdmin && no companies are supplied, the supplier
 * selector is still rendered but empty — admin users in this scenario
 * cannot currently create products with explicit supplier selection
 * without backend support.
 *
 * The router guard already blocks Buyer access (meta.roles).
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductById, createProduct, updateProduct } from '@/services/productService'
import { listCategories } from '@/services/categoryService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseError from '@/components/common/BaseError.vue'
import ProductForm from '@/components/product/ProductForm.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)
const isAdmin = computed(() => role.value === 'ADMIN')
const isSupplier = computed(() => role.value === 'SUPPLIER')

const productId = computed(() => route.params.id)
const isEdit = computed(() => Boolean(productId.value))

const product = ref(null)
const loading = ref(false)
const loadError = ref(null)

const categories = ref([])
const submitting = ref(false)
const formErrors = reactive({})

async function loadCategories() {
  try {
    const page = await listCategories({ size: 500, sort: 'name,asc' })
    categories.value = page.content || []
  } catch (err) {
    // Form will show an empty category dropdown; backend will still reject create.
    categories.value = []
  }
}

async function loadProduct() {
  if (!isEdit.value) {
    product.value = null
    return
  }
  loading.value = true
  loadError.value = null
  try {
    product.value = await getProductById(productId.value)
  } catch (err) {
    loadError.value = err
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCategories()
  await loadProduct()
})

function mapBackendErrors(err) {
  // Reset
  Object.keys(formErrors).forEach((k) => { formErrors[k] = '' })
  const fieldErrors = err?.errors
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const [key, val] of Object.entries(fieldErrors)) {
      const message = Array.isArray(val) ? val[0] : val
      if (typeof message === 'string') {
        formErrors[key] = message
      }
    }
  }
}

async function handleSubmit(payload) {
  submitting.value = true
  formErrors.general = ''
  try {
    let response
    if (isEdit.value) {
      response = await updateProduct(productId.value, payload)
      toast.success('Cập nhật sản phẩm thành công')
      router.push({ name: 'product-detail', params: { id: response.id } })
    } else {
      response = await createProduct(payload)
      toast.success('Tạo sản phẩm thành công')
      router.push({ name: 'product-detail', params: { id: response.id } })
    }
  } catch (err) {
    const { message } = handleApiError(err)
    mapBackendErrors(err)
    formErrors.general = message
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  if (isEdit.value) {
    router.push({ name: 'product-detail', params: { id: productId.value } })
  } else {
    router.push({ name: 'products' })
  }
}
</script>

<template>
  <div class="product-form-view">
    <header class="product-form-view__header">
      <RouterLink to="/products" class="product-form-view__back">
        ← Quay lại danh sách
      </RouterLink>
      <h1 class="product-form-view__title">
        {{ isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới' }}
      </h1>
      <p class="product-form-view__subtitle">
        <template v-if="isSupplier">Sản phẩm sẽ được gắn với công ty của bạn.</template>
        <template v-else-if="isAdmin">Sản phẩm sẽ được tạo trong hệ thống quản trị.</template>
      </p>
    </header>

    <div v-if="loading" class="product-form-view__state">
      <BaseLoading label="Đang tải sản phẩm..." />
    </div>

    <div v-else-if="loadError" class="product-form-view__state">
      <BaseError
        :title="loadError.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không tải được sản phẩm'"
        :error="loadError"
        @retry="loadProduct"
      />
    </div>

    <ProductForm
      v-else
      :initial-product="product"
      :categories="categories"
      :is-admin="isAdmin"
      :submitting="submitting"
      :errors="formErrors"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.product-form-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.product-form-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.product-form-view__back {
  font-size: var(--font-sm);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--weight-medium);
  margin-bottom: var(--space-2);
}

.product-form-view__back:hover {
  text-decoration: underline;
}

.product-form-view__title {
  margin: 0;
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.product-form-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.product-form-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  min-height: 200px;
}
</style>
