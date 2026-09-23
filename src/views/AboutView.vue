<script setup>
</script>

<template>
  <main class="about-view">
    <div class="container">
      <div class="card">
        <h1 class="page-title">Giới thiệu</h1>
        <p class="lead">
          <strong>B2B Procure</strong> là hệ thống trung gian B2B giữa Admin, Nhà cung cấp và Người mua,
          được xây dựng bằng Vue 3 + Vite ở frontend và Spring Boot ở backend.
        </p>

        <h2>Công nghệ sử dụng</h2>
        <ul class="tech-list">
          <li><strong>Frontend:</strong> Vue 3, Vite, Vue Router, Pinia, Axios</li>
          <li><strong>Backend:</strong> Spring Boot, REST API</li>
          <li><strong>Thanh toán:</strong> ZaloPay</li>
        </ul>

        <h2>Kiến trúc</h2>
        <p>
          Giao diện người dùng được thiết kế theo mô hình SPA (Single Page Application),
          sử dụng component-based architecture và centralized state management.
        </p>

        <div class="nav-links">
          <RouterLink to="/">&larr; Quay lại trang chủ</RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.about-view {
  min-height: 100vh;
  padding: var(--space-8) var(--space-4);
}

.container {
  max-width: var(--container-md);
  margin: 0 auto;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
}

.page-title {
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  margin: 0 0 var(--space-6);
}

.lead {
  font-size: var(--font-md);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-6);
}

h2 {
  font-size: var(--font-lg);
  font-weight: var(--weight-semibold);
  margin: var(--space-6) 0 var(--space-3);
}

h2:first-of-type {
  margin-top: 0;
}

p {
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-4);
}

.tech-list {
  list-style: disc;
  padding-left: var(--space-6);
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tech-list li strong {
  color: var(--color-text-primary);
}

.nav-links {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border);
}
</style>
