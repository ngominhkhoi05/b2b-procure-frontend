<script setup>
/**
 * ProfileView — placeholder route.
 *
 * Per the Phase 3 plan: the user menu links to `/profile`, but full
 * profile editing is out of scope for this phase. This view renders
 * an empty state pointing the user back to the dashboard.
 */
import BaseEmpty from '@/components/common/BaseEmpty.vue'
</script>

<template>
  <div class="profile-view">
    <BaseEmpty
      title="Hồ sơ cá nhân"
      description="Chức năng chỉnh sửa hồ sơ sẽ được phát triển trong các phase tiếp theo."
    >
      <RouterLink to="/dashboard" class="profile-view__link">
        Quay lại Bảng điều khiển
      </RouterLink>
    </BaseEmpty>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: var(--container-md);
  margin: 0 auto;
  padding: var(--space-8) 0;
}

.profile-view__link {
  display: inline-block;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-5);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background-color var(--transition-fast);
}

.profile-view__link:hover {
  background: var(--color-primary-hover);
  color: var(--color-text-inverse);
  text-decoration: none;
}
</style>
