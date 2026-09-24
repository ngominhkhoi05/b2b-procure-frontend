<script setup>
/**
 * ProductDetailView — single product detail page.
 *
 * Loads /products/{id} + /products/{id}/prices.
 * Admin / Supplier see management actions (status change + price tiers + edit).
 * Buyer is read-only.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductById } from '@/services/productService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatCurrency, formatDateTime, formatNumber, truncate } from '@/utils/format'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

import ProductStatusBadge from '@/components/product/ProductStatusBadge.vue'
import ProductPriceTiers from '@/components/product/ProductPriceTiers.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const productId = computed(() => route.params.id)
const role = computed(() => auth.currentUser?.role ?? auth.currentUser?.roleName)

const isBuyer = computed(() => role.value === 'BUYER')
const isSupplier = computed(() => role.value === 'SUPPLIER')
const isAdmin = computed(() => role.value === 'ADMIN')
const canManage = computed(() => isAdmin.value || isSupplier.value)

const product = ref(null)
const loading = ref(false)
const error = ref(null)

const showStatusModal = ref(false)
const statusDraft = ref('ACTIVE')
const statusSubmitting = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    product.value = await getProductById(productId.value)
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

onMounted(load)

function gotoEdit() {
  router.push({ name: 'product-edit', params: { id: productId.value } })
}

function openStatusModal() {
  statusDraft.value = product.value?.status || 'ACTIVE'
  showStatusModal.value = true
}

async function submitStatusChange() {
  statusSubmitting.value = true
  try {
    const { updateProductStatus } = await import('@/services/productService')
    await updateProductStatus(productId.value, statusDraft.value)
    toast.success('Cập nhật trạng thái thành công')
    showStatusModal.value = false
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    toast.error(message)
  } finally {
    statusSubmitting.value = false
  }
}

function onImgError(e) {
  e.target.style.display = 'none'
  e.target.closest('.product-detail-view__image-wrap')?.classList.add('product-detail-view__image-wrap--no-image')
}
</script>

<template>
  <div class="product-detail-view">
    <!-- Loading -->
    <div v-if="loading" class="product-detail-view__state">
      <BaseLoading label="Đang tải sản phẩm..." />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="product-detail-view__state">
      <BaseError
        :title="error.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không tải được sản phẩm'"
        :error="error"
        @retry="load"
      />
    </div>

    <!-- Not found -->
    <div v-else-if="!product" class="product-detail-view__state">
      <BaseEmpty title="Không tìm thấy sản phẩm" />
    </div>

    <!-- Content -->
    <article v-else class="product-detail-view__content">
      <!-- Breadcrumb / back -->
      <nav class="product-detail-view__breadcrumb" aria-label="breadcrumb">
        <RouterLink to="/products" class="product-detail-view__back">
          ← Quay lại danh sách
        </RouterLink>
      </nav>

      <!-- Hero -->
      <section class="product-detail-view__hero">
        <div class="product-detail-view__image-wrap">
          <img
            v-if="product.imageUrl"
            :src="product.imageUrl"
            :alt="product.name"
            class="product-detail-view__image"
            @error="onImgError"
          />
          <div v-else class="product-detail-view__image-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
        </div>

        <div class="product-detail-view__hero-info">
          <div class="product-detail-view__badges">
            <ProductStatusBadge :status="product.status" />
            <span v-if="product.categoryName" class="product-detail-view__category-pill">
              {{ product.categoryName }}
            </span>
          </div>

          <h1 class="product-detail-view__name">{{ product.name }}</h1>

          <div class="product-detail-view__meta">
            <span><strong>SKU:</strong> {{ product.sku }}</span>
            <span v-if="product.supplierCompanyName">
              <strong>Nhà cung cấp:</strong> {{ product.supplierCompanyName }}
            </span>
          </div>

          <div class="product-detail-view__stats">
            <div class="product-detail-view__stat">
              <span class="product-detail-view__stat-label">Tồn kho</span>
              <span class="product-detail-view__stat-value">
                {{ product.stockQuantity != null ? formatNumber(product.stockQuantity) : '—' }}
              </span>
            </div>
            <div class="product-detail-view__stat">
              <span class="product-detail-view__stat-label">Có thể bán</span>
              <span class="product-detail-view__stat-value">
                {{ product.availableQuantity != null ? formatNumber(product.availableQuantity) : '—' }}
              </span>
            </div>
            <div class="product-detail-view__stat">
              <span class="product-detail-view__stat-label">Đã đặt trước</span>
              <span class="product-detail-view__stat-value">
                {{ product.reservedQuantity != null ? formatNumber(product.reservedQuantity) : '—' }}
              </span>
            </div>
          </div>

          <!-- Description -->
          <div v-if="product.description" class="product-detail-view__description">
            <h3 class="product-detail-view__section-title">Mô tả</h3>
            <p>{{ product.description }}</p>
          </div>

          <!-- Actions (Admin/Supplier only) -->
          <div v-if="canManage" class="product-detail-view__actions">
            <BaseButton variant="primary" @click="gotoEdit">Sửa sản phẩm</BaseButton>
            <BaseButton variant="secondary" @click="openStatusModal">
              Đổi trạng thái
            </BaseButton>
          </div>
        </div>
      </section>

      <!-- Price tiers -->
      <section class="product-detail-view__section">
        <ProductPriceTiers :product-id="productId" :editable="canManage" />
      </section>

      <!-- Footer metadata -->
      <footer class="product-detail-view__footer">
        <span v-if="product.createdAt">Tạo lúc: {{ formatDateTime(product.createdAt) }}</span>
        <span v-if="product.updatedAt">Cập nhật: {{ formatDateTime(product.updatedAt) }}</span>
      </footer>
    </article>

    <!-- Status modal -->
    <BaseModal v-model="showStatusModal" title="Đổi trạng thái sản phẩm" size="sm">
      <div class="product-detail-view__status-modal">
        <p>
          Trạng thái hiện tại: <ProductStatusBadge :status="product?.status" />
        </p>
        <BaseSelect
          v-model="statusDraft"
          label="Trạng thái mới"
          :options="[
            { value: 'ACTIVE', label: 'ACTIVE — Đang kinh doanh' },
            { value: 'INACTIVE', label: 'INACTIVE — Ngừng kinh doanh' },
          ]"
        />
      </div>
      <template #footer>
        <button
          type="button"
          class="product-detail-view__modal-btn product-detail-view__modal-btn--ghost"
          :disabled="statusSubmitting"
          @click="showStatusModal = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="product-detail-view__modal-btn product-detail-view__modal-btn--primary"
          :disabled="statusSubmitting"
          @click="submitStatusChange"
        >
          <span v-if="statusSubmitting" class="product-detail-view__spinner" aria-hidden="true" />
          Cập nhật
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.product-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.product-detail-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  min-height: 200px;
}

.product-detail-view__breadcrumb {
  font-size: var(--font-sm);
}

.product-detail-view__back {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--weight-medium);
}

.product-detail-view__back:hover {
  text-decoration: underline;
}

.product-detail-view__hero {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: var(--space-6);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-6);
}

.product-detail-view__image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-alt);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-detail-view__image-wrap--no-image {
  /* hide broken image so placeholder shows through */
}

.product-detail-view__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-detail-view__image-wrap--no-image .product-detail-view__image {
  display: none;
}

.product-detail-view__image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.product-detail-view__image-placeholder svg {
  width: 100%;
  height: 100%;
}

.product-detail-view__hero-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.product-detail-view__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.product-detail-view__category-pill {
  display: inline-block;
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
}

.product-detail-view__name {
  margin: 0;
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
}

.product-detail-view__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.product-detail-view__meta strong {
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}

.product-detail-view__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-surface-alt);
  border-radius: var(--radius-md);
}

.product-detail-view__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-detail-view__stat-label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.product-detail-view__stat-value {
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.product-detail-view__description p {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  white-space: pre-wrap;
}

.product-detail-view__section-title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.product-detail-view__actions {
  display: flex;
  gap: var(--space-3);
  padding-top: var(--space-2);
  flex-wrap: wrap;
}

.product-detail-view__section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-5);
}

.product-detail-view__footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.product-detail-view__status-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.product-detail-view__modal-btn {
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

.product-detail-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-detail-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.product-detail-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.product-detail-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.product-detail-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.product-detail-view__spinner {
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
  .product-detail-view__hero {
    grid-template-columns: 1fr;
  }

  .product-detail-view__stats {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 540px) {
  .product-detail-view__stats {
    grid-template-columns: 1fr 1fr;
  }

  .product-detail-view__section {
    padding: var(--space-4);
  }
}
</style>
