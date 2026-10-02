<script setup>
/**
 * HomeView — Trang giới thiệu dự án & tác giả.
 *
 * Cấu trúc:
 *   - Header sticky: brand + (Đăng nhập / Vào dashboard tuỳ trạng thái)
 *   - Layout 2 cột: sidebar trái (anchor nav) + main content
 *   - 4 section anchor:
 *       #about-author    Giới thiệu tác giả
 *       #tech-stack      Tech stack
 *       #highlights      Điểm đáng chú ý (kèm cách triển khai)
 *       #limitations     Hạn chế ở bản deploy
 *
 * Sidebar trái highlight link đang ở viewport qua IntersectionObserver.
 */

import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/common/BaseButton.vue'

const auth = useAuthStore()

// ── Section definitions (cũng dùng để render sidebar) ───────────────────────
const sections = [
  { id: 'about-author', label: 'Giới thiệu' },
  { id: 'tech-stack',   label: 'Tech stack' },
  { id: 'highlights',   label: 'Điểm nổi bật' },
  { id: 'limitations',  label: 'Hạn chế deploy' },
]

const activeSection = ref(sections[0].id)

let observer = null

onMounted(async () => {
  await nextTick()
  // IntersectionObserver: section nào "ở giữa" viewport thì active.
  // rootMargin âm ở trên/dưới để coi section đang ở khoảng 40%–45% giữa màn hình.
  observer = new IntersectionObserver(
    (entries) => {
      // Lấy các entry đang trong vùng quan sát, sắp theo vị trí top
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length > 0) {
        activeSection.value = visible[0].target.id
      }
    },
    {
      rootMargin: '-40% 0px -55% 0px',
      threshold: 0,
    }
  )
  sections.forEach((s) => {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  })
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const headerOffset = 80
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset
  window.scrollTo({ top, behavior: 'smooth' })
}
</script>

<template>
  <div class="home-view">
    <!-- Action góc trên phải (AuthLayout đã lo brand strip ở trên) -->
    <div class="home-actions" aria-label="Hành động tài khoản">
      <template v-if="auth.isAuthenticated">
        <RouterLink to="/dashboard" custom v-slot="{ navigate }">
          <BaseButton variant="primary" @click="navigate">
            Vào bảng điều khiển
          </BaseButton>
        </RouterLink>
      </template>
      <template v-else>
        <RouterLink to="/register" custom v-slot="{ navigate }">
          <BaseButton variant="secondary" @click="navigate">Đăng ký</BaseButton>
        </RouterLink>
        <RouterLink to="/login" custom v-slot="{ navigate }">
          <BaseButton variant="primary" @click="navigate">Đăng nhập</BaseButton>
        </RouterLink>
      </template>
    </div>

    <!-- Layout 2 cột: sidebar trái (anchor) + main content -->
    <div class="home-layout">
      <aside class="home-sidebar" aria-label="Điều hướng trong trang">
        <nav>
          <p class="home-sidebar__title">Nội dung trang</p>
          <ul class="home-sidebar__list">
            <li v-for="s in sections" :key="s.id">
              <button
                type="button"
                :class="[
                  'home-sidebar__link',
                  { 'home-sidebar__link--active': activeSection === s.id },
                ]"
                :aria-current="activeSection === s.id ? 'true' : undefined"
                @click="scrollToSection(s.id)"
              >
                {{ s.label }}
              </button>
            </li>
          </ul>
        </nav>
        <p class="home-sidebar__hint">
          Mẹo: nhấp vào mục để nhảy nhanh tới nội dung tương ứng.
        </p>
      </aside>

      <main class="main-content">
        <!-- 1. Hero / Giới thiệu tác giả -->
        <section id="about-author" class="section section--hero">
          <div class="hero-card">
            <p class="hero-eyebrow">Dự án cá nhân · 2026</p>
            <h1 class="hero-title">
              Xin chào, em là <span class="hero-title__name">Ngô Minh Khôi</span>
            </h1>
            <p class="hero-subtitle">
              Em đang là intern tại <strong class="text-emphasis">Jienie</strong>.
              Đây là dự án cá nhân em xây dựng để học và thực hành kiến trúc một nền
              tảng B2B
            </p>
            <ul class="hero-tags" aria-label="Vai trò / công nghệ chính">
              <li class="hero-tag hero-tag--primary">Frontend Vue 3</li>
              <li class="hero-tag">Backend Spring Boot</li>
              <li class="hero-tag">Intern @ Jienie</li>
            </ul>
          </div>
        </section>

        <!-- 2. Tech stack -->
        <section id="tech-stack" class="section">
          <h2 class="section-title">Công nghệ sử dụng</h2>
          <p class="section-lead">
            Em dùng các công nghệ quen thuộc trong hệ sinh thái Java &amp; Vue để
            giữ cho codebase rõ ràng, dễ bảo trì và theo sát convention doanh nghiệp.
          </p>

          <div class="stack-grid">
            <article class="stack-card">
              <h3 class="stack-card__title">Frontend</h3>
              <ul class="stack-list">
                <li>Vue 3 (Composition API + script setup)</li>
                <li>Vue Router 4</li>
                <li>Pinia — state management</li>
                <li>Axios — HTTP client</li>
                <li>Vite — dev server &amp; bundler</li>
              </ul>
            </article>

            <article class="stack-card">
              <h3 class="stack-card__title">Backend</h3>
              <ul class="stack-list">
                <li>Java 21 + Spring Boot 4.1.1</li>
                <li>Spring MVC · Spring Data JPA / Hibernate</li>
                <li>Spring Security · JWT (jjwt)</li>
                <li>MapStruct · Lombok</li>
                <li>SpringDoc OpenAPI / Swagger</li>
                <li>Flyway · PostgreSQL</li>
              </ul>
            </article>

            <article class="stack-card">
              <h3 class="stack-card__title">Hạ tầng &amp; tích hợp</h3>
              <ul class="stack-list">
                <li>Cloudinary — lưu trữ ảnh</li>
                <li>Zalo Pay (sandbox) — thanh toán</li>
                <li>Google OAuth2 — đăng nhập</li>
                <li>Docker Compose — triển khai</li>
                <li>ngrok — callback URL khi dev</li>
              </ul>
            </article>
          </div>
        </section>

        <!-- 3. Điểm đáng chú ý -->
        <section id="highlights" class="section">
          <h2 class="section-title">Điểm đáng chú ý đã triển khai</h2>
          <p class="section-lead">
            Một vài tính năng em đã làm
          </p>

          <div class="highlight-grid">
            <article class="highlight-card">
              <div class="highlight-card__head">
                <span class="highlight-card__icon" aria-hidden="true">G</span>
                <h3 class="highlight-card__title">Đăng nhập qua Google</h3>
              </div>
              <p class="highlight-card__desc">
                Spring Security OAuth2 client xử lý phía backend. Sau khi Google xác thực,
                <code>OAuth2AuthenticationSuccessHandler</code> redirect về trang
                <code>/oauth2/redirect</code> của frontend kèm JWT và status
                (<code>SUCCESS</code> / <code>NEED_REGISTER</code>). Frontend đọc
                query string rồi gọi <code>auth.loginWithOAuth2Success(...)</code> trong
                Pinia store để set token và currentUser.
              </p>
              <p class="highlight-card__how">
                <strong>Cách làm:</strong> Spring Security OAuth2 client + AuthAccount
                (bảng riêng cho account Google) → link hoặc tạo nhanh tài khoản.
              </p>
            </article>

            <article class="highlight-card">
              <div class="highlight-card__head">
                <span class="highlight-card__icon" aria-hidden="true">Tìm</span>
                <h3 class="highlight-card__title">Tìm kiếm FTS tiếng Việt</h3>
              </div>
              <p class="highlight-card__desc">
                Bảng <code>products</code> có thêm cột generated <code>search_vector</code>
                gộp từ <code>name</code> (weight A), <code>sku</code> (B) và
                <code>description</code> (C), kèm GIN index. Tìm kiếm dùng
                <code>websearch_to_tsquery('vn_simple', :keyword)</code> và sắp xếp
                theo <code>ts_rank</code>.
              </p>
              <p class="highlight-card__how">
                <strong>Cách làm:</strong> Migration V16 tạo config <code>vn_simple</code>
                (= <code>simple</code> + dict <code>unaccent</code> để bỏ dấu) → hỗ trợ
                cả "hộp" và "hop" trong một truy vấn.
              </p>
            </article>

            <article class="highlight-card">
              <div class="highlight-card__head">
                <span class="highlight-card__icon" aria-hidden="true">Số</span>
                <h3 class="highlight-card__title">DB lớn: ~1 triệu sp / ~2 triệu giá</h3>
              </div>
              <p class="highlight-card__desc">
                Vì áp dụng cơ chế <strong>mua nhiều giảm nhiều</strong>, mỗi sản phẩm
                có nhiều bậc giá trong bảng <code>product_prices</code> — đó là lý do
                bảng giá có thể lên tới 2 triệu bản ghi. Để buyer browse vẫn nhanh,
                em denormalize một cột <code>is_listable</code> trên
                <code>products</code> và tạo partial index nhỏ cho tập buyer.
              </p>
              <p class="highlight-card__how">
                <strong>Cách làm:</strong> Migration V20 thêm cột <code>is_listable</code>
                + trigger đồng bộ với <code>status</code> và sự tồn tại của
                <code>product_prices</code> → index <code>idx_products_listable_browse</code>.
              </p>
            </article>

            <article class="highlight-card">
              <div class="highlight-card__head">
                <span class="highlight-card__icon" aria-hidden="true">₫</span>
                <h3 class="highlight-card__title">Thanh toán Zalo Pay (sandbox)</h3>
              </div>
              <p class="highlight-card__desc">
                Buyer chọn thanh toán → backend gọi <code>/v2/create</code> để tạo URL
                thanh toán; Zalo Pay gọi IPN về callback của backend khi giao dịch xong.
                Hệ thống verify MAC bằng <code>key2</code>, cập nhật
                <code>Payment.status = SUCCESS</code>, đổi Order sang
                <code>PAID</code> và ghi <code>OrderStatusHistory</code>.
              </p>
              <p class="highlight-card__how">
                <strong>Cách làm:</strong> Service <code>ZaloPayServiceImpl</code> +
                callback controller; mã đơn nội bộ sinh theo format
                <code>ORD-{timestamp}-{rand}</code>.
              </p>
            </article>

            <article class="highlight-card">
              <div class="highlight-card__head">
                <span class="highlight-card__icon" aria-hidden="true">🔒</span>
                <h3 class="highlight-card__title">Chống bán lố (overselling)</h3>
              </div>
              <p class="highlight-card__desc">
                Bảng <code>products</code> có 2 cột <code>stock_quantity</code> và
                <code>reserved_quantity</code>. Khi checkout, backend khóa
                <code>Product</code> bằng <code>PESSIMISTIC_WRITE</code> rồi cộng dồn
                vào <code>reserved</code> (không trừ <code>stock</code> ngay) — đảm bảo
                hai buyer cùng đặt không thể "ăn" vượt quá tồn kho.
              </p>
              <p class="highlight-card__how">
                <strong>Cách làm:</strong> Migration V7 thêm
                <code>reserved_quantity</code>; Checkout dùng
                <code>@Lock(PESSIMISTIC_WRITE)</code>; invariant <code>reserved ≤ stock</code>
                được enforce trong entity qua <code>validateInvariants()</code>.
              </p>
            </article>

            <article class="highlight-card">
              <div class="highlight-card__head">
                <span class="highlight-card__icon" aria-hidden="true">☁</span>
                <h3 class="highlight-card__title">Lưu ảnh trên Cloudinary</h3>
              </div>
              <p class="highlight-card__desc">
                Ảnh sản phẩm, avatar, cover image được upload lên Cloudinary qua
                <code>CloudinaryStorageService</code>. Backend chỉ lưu
                <code>secure_url</code> + <code>public_id</code> — không bao giờ lưu
                ảnh dạng binary trong DB. Khi supplier thay ảnh, ảnh cũ được dọn.
              </p>
              <p class="highlight-card__how">
                <strong>Cách làm:</strong> Giới hạn 5 MB, whitelist content-type
                (jpeg/png/webp/gif); folder theo <code>{root}/{subPath}</code> (vd
                <code>avatars</code>, <code>products/&lt;id&gt;</code>).
              </p>
            </article>

            <article class="highlight-card">
              <div class="highlight-card__head">
                <span class="highlight-card__icon" aria-hidden="true">≡</span>
                <h3 class="highlight-card__title">CRUD cơ bản</h3>
              </div>
              <p class="highlight-card__desc">
                Đầy đủ create / read / update / delete cho Company, User, Category,
                Product, ProductPrice, Cart, Order, OrderItem, CommissionRate. Phân
                quyền theo vai trò ở mức service: supplier chỉ thấy sản phẩm của
                công ty mình, buyer chỉ thấy đơn của buyer company mình.
              </p>
              <p class="highlight-card__how">
                <strong>Cách làm:</strong> Controller mỏng gọi Service; Service chứa
                business rule + transaction; Repository là Spring Data JPA. Authorization
                luôn dựa trên user đang đăng nhập, không bao giờ tin client.
              </p>
            </article>
          </div>
        </section>

        <!-- 4. Hạn chế ở bản deploy -->
        <section id="limitations" class="section section--last">
          <h2 class="section-title">Hạn chế ở bản deploy này</h2>
          <p class="section-lead">
            Một vài tính năng đã code xong nhưng tạm thời không thể bật trên môi
            trường deploy hiện tại vì giới hạn kỹ thuật của môi trường. Em ghi
            rõ ở đây để anh biết khi test.
          </p>

          <div class="callout" role="note" aria-label="Cảnh báo về hạn chế deploy">
              <div class="callout__head">
                <span class="callout__icon" aria-hidden="true">!</span>
                <strong class="callout__title">Hai tính năng đã triển khai nhưng tạm thời bị bỏ qua</strong>
              </div>

              <div class="callout__item">
                <h4 class="callout__item-title">Zalo Pay sandbox — callback không nhận được</h4>
                <p>
                  Backend của em chạy trong VM với IP cục bộ. Zalo Pay sandbox
                  cần một địa chỉ công khai để gọi IPN về, mà IP local thì không
                  public được. Em có dùng ngrok để dev, nhưng khi deploy thật thì
                  callback không thể gọi về.
                </p>
                <p class="callout__item-consequence">
                  <strong>Hệ quả:</strong> nếu khách thanh toán qua Zalo Pay thì
                  đơn sẽ chỉ ở trạng thái <code>payment_pending</code> /
                  <code>PENDING_CONFIRMATION</code>. Hệ thống có sẵn
                  <code>AdminRefundRetryService</code> để admin xử lý thủ công khi
                  cần, nhưng flow tự động sẽ không chạy được.
                </p>
              </div>

              <div class="callout__item">
                <h4 class="callout__item-title">Đăng nhập Google — đã code xong nhưng không dùng được</h4>
                <p>
                  Tính năng này em đã code xong phía backend
                  (<code>OAuth2AuthenticationSuccessHandler</code>, <code>AuthAccount</code>,
                  ...). Tuy nhiên Google yêu cầu một domain hợp lệ để cấu hình
                  <code>redirect_uri</code>, mà em hiện chưa có domain riêng.
                </p>
                <p class="callout__item-consequence">
                  <strong>Hệ quả:</strong> ở bản deploy này em chỉ bật nút
                  <em>Đăng nhập thường</em>. Nếu muốn dùng Google, hãy tạo tài
                  khoản bằng form đăng ký.
                </p>
              </div>
            </div>
        </section>

        <footer class="home-footer">
          <p>Dự án cá nhân · Spring Boot + Vue 3 · 2026</p>
        </footer>
      </main>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  position: relative;
  min-height: 100dvh;
  background: var(--color-background);
}

/* ── Action góc phải (AuthLayout đã lo brand strip phía trên) ──────────── */
.home-actions {
  position: absolute;
  top: var(--space-4);
  right: var(--space-5);
  z-index: var(--z-raised);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 640px) {
  .home-actions {
    top: var(--space-3);
    right: var(--space-4);
  }
}

/* ── Layout 2 cột ────────────────────────────────────────────────────────── */
.home-layout {
  max-width: var(--container-2xl);
  margin: 0 auto;
  padding: var(--space-8) var(--space-5);
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--space-8);
  align-items: start;
}

/* ── Sidebar trái ────────────────────────────────────────────────────────── */
.home-sidebar {
  position: sticky;
  top: 96px;
  align-self: start;
}

.home-sidebar__title {
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-3);
  padding: 0 var(--space-3);
}

.home-sidebar__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.home-sidebar__link {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  border: none;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.home-sidebar__link:hover {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.home-sidebar__link--active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: var(--weight-semibold);
}

.home-sidebar__hint {
  margin: var(--space-4) 0 0;
  padding: 0 var(--space-3);
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
}

/* ── Main content ────────────────────────────────────────────────────────── */
.section {
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--color-border);
}

.section--last {
  border-bottom: none;
}

.section-title {
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-3);
  scroll-margin-top: 96px;
}

.section-lead {
  font-size: var(--font-md);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  max-width: 720px;
  margin: 0 0 var(--space-8);
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
.section--hero {
  padding-top: var(--space-8);
}

.hero-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-10) var(--space-8);
  box-shadow: var(--shadow-sm);
}

.hero-eyebrow {
  font-size: var(--font-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  margin: 0 0 var(--space-3);
}

.hero-title {
  font-size: var(--font-3xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
  margin: 0 0 var(--space-4);
}

.hero-title__name {
  color: var(--color-primary);
}

.hero-subtitle {
  font-size: var(--font-md);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  max-width: 720px;
  margin: 0 0 var(--space-5);
}

.text-emphasis {
  color: var(--color-primary);
  font-weight: var(--weight-semibold);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
}

.hero-tag--primary {
  background: var(--color-primary-light);
  color: var(--color-primary-active);
}

/* ── Stack grid ──────────────────────────────────────────────────────────── */
.stack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
}

.stack-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.stack-card__title {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-3);
}

.stack-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stack-list li {
  position: relative;
  padding-left: var(--space-5);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

.stack-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
}

/* ── Highlight grid ──────────────────────────────────────────────────────── */
.highlight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-5);
}

.highlight-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: box-shadow var(--transition-base);
}

.highlight-card:hover {
  box-shadow: var(--shadow-sm);
}

.highlight-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.highlight-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--font-md);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}

.highlight-card__title {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.highlight-card__desc,
.highlight-card__how {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-3);
}

.highlight-card__how {
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-border);
}

.highlight-card__how strong {
  color: var(--color-primary);
}

/* ── Callout (hạn chế) ───────────────────────────────────────────────────── */
.callout {
  background: var(--color-warning-bg);
  border-left: 4px solid var(--color-warning);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  color: var(--color-text-primary);
}

.callout__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.callout__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-warning);
  color: var(--color-text-inverse);
  font-weight: var(--weight-bold);
  font-size: var(--font-md);
  flex-shrink: 0;
}

.callout__title {
  font-size: var(--font-md);
  color: var(--color-text-primary);
}

.callout__item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.callout__item:last-child {
  margin-bottom: 0;
}

.callout__item-title {
  font-size: var(--font-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2);
}

.callout__item p {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-2);
}

.callout__item-consequence {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-border);
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.home-footer {
  padding: var(--space-8) 0 var(--space-4);
  text-align: center;
}

.home-footer p {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin: 0;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .home-layout {
    grid-template-columns: 200px 1fr;
    gap: var(--space-6);
  }
}

@media (max-width: 768px) {
  .home-layout {
    grid-template-columns: 1fr;
    padding: var(--space-6) var(--space-4);
  }

  .home-sidebar {
    position: static;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }

  .home-sidebar__list {
    flex-direction: row;
    overflow-x: auto;
    gap: var(--space-2);
  }

  .home-sidebar__link {
    white-space: nowrap;
  }

  .home-sidebar__hint {
    display: none;
  }

  .hero-card {
    padding: var(--space-6) var(--space-5);
  }

  .hero-title {
    font-size: var(--font-2xl);
  }

  .section-title {
    font-size: var(--font-xl);
  }

  .section {
    padding-block: var(--space-8);
  }
}
</style>