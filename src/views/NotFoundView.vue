<script setup>
import BaseEmpty from '@/components/common/BaseEmpty.vue'
</script>

<template>
  <main class="not-found-view">
    <BaseEmpty
      title="Trang không tìm thấy"
      description="Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển."
    >
      <RouterLink to="/">
        <button class="back-btn">Quay lại trang chủ</button>
      </RouterLink>
    </BaseEmpty>
  </main>
</template>

<style scoped>
.not-found-view {
  min-height: 100vh;
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
