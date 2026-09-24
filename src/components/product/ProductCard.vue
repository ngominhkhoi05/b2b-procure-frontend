<script setup>
/**
 * ProductCard — buyer-facing product card.
 *
 * Props:
 *   product          — ProductResponse
 *   priceFrom        — optional lowest tier unit price (BigDecimal-as-string or number)
 *   priceTo          — optional highest tier unit price
 *   tierCount        — number of configured tiers (for "từ X đến Y" display)
 *
 * Emits: click
 *
 * Image is rendered via a fallback handler so broken URLs do not crash the layout.
 */
import { computed } from 'vue'
import { formatCurrency, truncate } from '@/utils/format'
import ProductStatusBadge from './ProductStatusBadge.vue'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  priceFrom: {
    type: [String, Number, null],
    default: null,
  },
  priceTo: {
    type: [String, Number, null],
    default: null,
  },
  tierCount: {
    type: Number,
    default: 0,
  },
})

defineEmits(['click'])

const hasImage = computed(() => Boolean(props.product?.imageUrl))

const imageStyle = computed(() => {
  if (hasImage.value) {
    return { backgroundImage: `url("${props.product.imageUrl}")` }
  }
  return {}
})

const priceLabel = computed(() => {
  if (props.priceFrom == null) return 'Liên hệ'
  if (props.priceTo != null && String(props.priceTo) !== String(props.priceFrom)) {
    return `${formatCurrency(props.priceFrom)} – ${formatCurrency(props.priceTo)}`
  }
  return formatCurrency(props.priceFrom)
})

const stockLabel = computed(() => {
  const stock = props.product?.availableQuantity
  if (stock == null) return ''
  if (stock <= 0) return 'Hết hàng'
  return `Còn ${stock}`
})

function onImgError(e) {
  // Hide the broken image so the placeholder shows.
  e.target.style.display = 'none'
  e.target.closest('.product-card__media')?.classList.add('product-card__media--no-image')
}
</script>

<template>
  <article
    class="product-card"
    tabindex="0"
    role="button"
    @click="$emit('click', product)"
    @keydown.enter="$emit('click', product)"
  >
    <!-- Image / placeholder -->
    <div
      :class="[
        'product-card__media',
        { 'product-card__media--no-image': !hasImage },
      ]"
      :style="imageStyle"
    >
      <img
        v-if="hasImage"
        :src="product.imageUrl"
        :alt="product.name"
        class="product-card__img"
        loading="lazy"
        @error="onImgError"
      />
      <span v-else class="product-card__placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </span>
      <span v-if="product.status && product.status !== 'ACTIVE'" class="product-card__status">
        <ProductStatusBadge :status="product.status" />
      </span>
    </div>

    <!-- Body -->
    <div class="product-card__body">
      <div class="product-card__meta">
        <span v-if="product.categoryName" class="product-card__category">
          {{ product.categoryName }}
        </span>
        <span v-if="product.supplierCompanyName" class="product-card__supplier">
          {{ product.supplierCompanyName }}
        </span>
      </div>

      <h3 class="product-card__name" :title="product.name">
        {{ product.name }}
      </h3>

      <p v-if="product.description" class="product-card__desc">
        {{ truncate(product.description, 80) }}
      </p>

      <div class="product-card__footer">
        <div class="product-card__price">
          <span class="product-card__price-value">{{ priceLabel }}</span>
          <span v-if="tierCount > 1" class="product-card__price-tier">
            / {{ tierCount }} bậc giá
          </span>
        </div>
        <span v-if="stockLabel" class="product-card__stock">{{ stockLabel }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.product-card:hover,
.product-card:focus-visible {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  outline: none;
}

.product-card__media {
  position: relative;
  aspect-ratio: 16 / 10;
  background-color: var(--color-surface-alt);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-card__img {
  display: none;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card__media--no-image .product-card__img {
  display: none;
}

/* When the image URL is present and not broken, show it via the inline <img>. */
.product-card__media:not(.product-card__media--no-image) .product-card__img {
  display: block;
}

.product-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.product-card__placeholder svg {
  width: 100%;
  height: 100%;
}

.product-card__status {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
}

.product-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  flex: 1;
}

.product-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.product-card__category {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-weight: var(--weight-medium);
}

.product-card__supplier::before {
  content: '•';
  margin-right: var(--space-2);
  color: var(--color-text-muted);
}

.product-card__name {
  margin: 0;
  font-size: var(--font-base);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__desc {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

.product-card__footer {
  margin-top: auto;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.product-card__price {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.product-card__price-value {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-primary);
}

.product-card__price-tier {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.product-card__stock {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}
</style>
