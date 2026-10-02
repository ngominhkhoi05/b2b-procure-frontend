<script setup>
import BaseEmpty from '@/components/common/BaseEmpty.vue'
</script>

<template>
  <div class="forbidden-view">
    <BaseEmpty
      title="Không có quyền truy cập"
      description="Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi."
    >
      <RouterLink to="/">
        <button class="back-btn">Quay lại trang chủ</button>
      </RouterLink>
    </BaseEmpty>
  </div>
</template>

<style scoped>
.forbidden-view {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn {
  padding: var(--space-2) var(--space-5);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.back-btn:hover {
  background: var(--color-primary-hover);
}
</style>
