<script setup>
/**
 * CategoryTable — admin row table for categories.
 *
 * Props:
 *   categories — CategoryResponse[]
 *   loading   — boolean
 *
 * Emits: row-click (category)
 *
 * Action slots:
 *   actions — per-row action buttons (admin only)
 */
import { formatDateTime } from '@/utils/format'
import CategoryStatusBadge from './CategoryStatusBadge.vue'

defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['row-click'])
</script>

<template>
  <div class="category-table" :class="{ 'category-table--loading': loading }">
    <table class="category-table__table" role="table">
      <thead>
        <tr>
          <th class="category-table__th">Tên danh mục</th>
          <th class="category-table__th">Mô tả</th>
          <th class="category-table__th">Trạng thái</th>
          <th class="category-table__th">Ngày tạo</th>
          <th class="category-table__th category-table__th--actions" />
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading && (!categories || categories.length === 0)">
          <td colspan="5" class="category-table__state">Đang tải...</td>
        </tr>
        <tr v-else-if="!categories || categories.length === 0">
          <td colspan="5" class="category-table__state">Không có danh mục</td>
        </tr>
        <tr
          v-for="c in categories"
          :key="c.id"
          class="category-table__row"
          @click="$emit('row-click', c)"
        >
          <td class="category-table__cell category-table__cell--name">
            <span class="category-table__name">{{ c.name }}</span>
          </td>
          <td class="category-table__cell category-table__cell--desc">
            {{ c.description || '—' }}
          </td>
          <td class="category-table__cell">
            <CategoryStatusBadge :status="c.status" />
          </td>
          <td class="category-table__cell">{{ formatDateTime(c.createdAt) || '—' }}</td>
          <td class="category-table__cell category-table__cell--actions" @click.stop>
            <slot name="actions" :category="c" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.category-table {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.category-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.category-table__th {
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

.category-table__th--actions {
  width: 1%;
  white-space: nowrap;
}

.category-table__row {
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.category-table__row:last-child {
  border-bottom: none;
}

.category-table__row:hover {
  background-color: var(--color-surface-alt);
}

.category-table__cell {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.category-table__cell--name {
  font-weight: var(--weight-medium);
}

.category-table__name {
  color: var(--color-text-primary);
}

.category-table__cell--desc {
  max-width: 320px;
  color: var(--color-text-secondary);
}

.category-table__cell--actions {
  white-space: nowrap;
  text-align: right;
}

.category-table__state {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-muted);
}

.category-table--loading .category-table__row {
  opacity: 0.7;
}

@media (max-width: 720px) {
  .category-table__table,
  .category-table__thead,
  .category-table__tbody,
  .category-table__row,
  .category-table__th,
  .category-table__cell {
    display: block;
  }

  .category-table__thead {
    display: none;
  }

  .category-table__row {
    padding: var(--space-3);
  }

  .category-table__row + .category-table__row {
    border-top: 1px solid var(--color-border);
  }

  .category-table__cell {
    padding: var(--space-1) 0;
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    border: none;
  }

  .category-table__cell--actions {
    justify-content: flex-end;
  }

  .category-table__cell::before {
    content: attr(data-label);
    color: var(--color-text-muted);
    font-size: var(--font-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}
</style>
