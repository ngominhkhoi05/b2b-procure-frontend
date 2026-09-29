<script setup>
/**
 * SettingsListView — Admin system settings management.
 *
 * ADMIN only. The backend intentionally exposes only:
 *   GET  /settings
 *   GET  /settings/{key}
 *   PUT  /settings/{key}        body { settingValue }
 *
 * No create / rename / delete endpoints exist. The UI must therefore not
 * allow those operations.
 *
 * For known integer-valued settings (PAYMENT_TIMEOUT_MINUTES,
 * SUPPLIER_CONFIRM_TIMEOUT_HOURS) we enforce > 0 and digit-only input.
 * Backend remains the final authority.
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { listSettings, updateSetting } from '@/services/settingsService'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'
import { formatDateTime } from '@/utils/format'

import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseError from '@/components/common/BaseError.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const toast = useToastStore()

const settings = ref([])
const loading = ref(false)
const error = ref(null)

// ── Edit modal ─────────────────────────────────────────────────────────
const showEdit = ref(false)
const editTarget = ref(null)
const editValue = ref('')
const editSubmitting = ref(false)
const editError = ref('')

// Settings whose value must be a positive integer.
// Backend is the final authority; this list only enables stricter UI hints.
const INTEGER_KEYS = new Set(['PAYMENT_TIMEOUT_MINUTES', 'SUPPLIER_CONFIRM_TIMEOUT_HOURS'])
const isIntegerSetting = computed(() =>
  editTarget.value ? INTEGER_KEYS.has(editTarget.value.settingKey) : false
)

async function load() {
  loading.value = true
  error.value = null
  try {
    settings.value = await listSettings()
  } catch (err) {
    const { message } = handleApiError(err)
    error.value = err
    toast.error(message)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openEdit(s) {
  editTarget.value = s
  editValue.value = s.settingValue ?? ''
  editError.value = ''
  showEdit.value = true
}

function validateEdit() {
  editError.value = ''
  const value = (editValue.value ?? '').toString().trim()
  if (!value) {
    editError.value = 'Giá trị không được để trống.'
    return false
  }
  if (isIntegerSetting.value) {
    if (!/^\d+$/.test(value)) {
      editError.value = 'Giá trị phải là số nguyên dương.'
      return false
    }
    if (Number(value) <= 0) {
      editError.value = 'Giá trị phải lớn hơn 0.'
      return false
    }
  }
  return true
}

async function submitEdit() {
  if (!editTarget.value) return
  if (!validateEdit()) return
  editSubmitting.value = true
  try {
    await updateSetting(editTarget.value.settingKey, editValue.value.trim())
    toast.success('Cập nhật cài đặt thành công')
    showEdit.value = false
    editTarget.value = null
    await load()
  } catch (err) {
    const { message } = handleApiError(err)
    editError.value = message
  } finally {
    editSubmitting.value = false
  }
}

// Restrict non-digit keystrokes for integer settings to keep UX tidy.
function onIntegerKeydown(e) {
  if (!isIntegerSetting.value) return
  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (allowed.includes(e.key)) return
  if (!/^\d$/.test(e.key)) e.preventDefault()
}
</script>

<template>
  <div class="settings-list-view">
    <!-- Header -->
    <header class="settings-list-view__header">
      <div>
        <h1 class="settings-list-view__title">Cài đặt hệ thống</h1>
        <p class="settings-list-view__subtitle">
          Các tham số cấu hình nền tảng. Quản trị viên chỉ có thể cập nhật
          giá trị của những cài đặt đã tồn tại; không thể thêm, xóa hay đổi tên.
        </p>
      </div>
    </header>

    <!-- States -->
    <div v-if="loading && settings.length === 0" class="settings-list-view__state">
      <BaseLoading label="Đang tải cài đặt hệ thống..." />
    </div>

    <div v-else-if="error && settings.length === 0" class="settings-list-view__state">
      <BaseError
        title="Không tải được cài đặt hệ thống"
        :error="error"
        @retry="load"
      />
    </div>

    <div v-else-if="settings.length === 0" class="settings-list-view__state">
      <BaseEmpty
        title="Chưa có cài đặt nào"
        description="Hệ thống chưa được cấu hình bất kỳ cài đặt nào."
      />
    </div>

    <!-- Table -->
    <div v-else class="settings-list-view__table-wrap">
      <table class="settings-list-view__table">
        <thead>
          <tr>
            <th scope="col">Khoá cài đặt</th>
            <th scope="col">Mô tả</th>
            <th scope="col">Giá trị hiện tại</th>
            <th scope="col">Cập nhật lúc</th>
            <th scope="col" class="settings-list-view__col-actions">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in settings" :key="s.id" class="settings-list-view__row">
            <td><code class="settings-list-view__key">{{ s.settingKey }}</code></td>
            <td>{{ s.description || '—' }}</td>
            <td>
              <span class="settings-list-view__value">{{ s.settingValue }}</span>
            </td>
            <td>{{ s.updatedAt ? formatDateTime(s.updatedAt) : '—' }}</td>
            <td class="settings-list-view__col-actions">
              <button
                type="button"
                class="settings-list-view__row-action"
                @click="openEdit(s)"
              >
                Cập nhật
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit modal -->
    <BaseModal v-model="showEdit" title="Cập nhật cài đặt" size="md">
      <div v-if="editTarget" class="settings-list-view__edit">
        <div class="settings-list-view__edit-meta">
          <span class="settings-list-view__edit-label">Khoá cài đặt</span>
          <code class="settings-list-view__key">{{ editTarget.settingKey }}</code>
        </div>
        <p v-if="editTarget.description" class="settings-list-view__edit-desc">
          {{ editTarget.description }}
        </p>

        <BaseInput
          v-model="editValue"
          :label="isIntegerSetting ? 'Giá trị (số nguyên > 0)' : 'Giá trị'"
          :type="isIntegerSetting ? 'text' : 'text'"
          :inputmode="isIntegerSetting ? 'numeric' : 'text'"
          required
          :error="editError"
          @keydown="onIntegerKeydown"
        />
        <p v-if="isIntegerSetting" class="settings-list-view__edit-hint">
          Giá trị phải là số nguyên dương (ví dụ 30). Backend sẽ kiểm tra lần cuối.
        </p>
      </div>
      <template #footer>
        <button
          type="button"
          class="settings-list-view__modal-btn settings-list-view__modal-btn--ghost"
          :disabled="editSubmitting"
          @click="showEdit = false"
        >
          Hủy
        </button>
        <button
          type="button"
          class="settings-list-view__modal-btn settings-list-view__modal-btn--primary"
          :disabled="editSubmitting"
          @click="submitEdit"
        >
          <span v-if="editSubmitting" class="settings-list-view__spinner" aria-hidden="true" />
          Lưu thay đổi
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.settings-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--container-2xl);
  margin: 0 auto;
  width: 100%;
}

.settings-list-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.settings-list-view__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.settings-list-view__subtitle {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  max-width: 720px;
  line-height: var(--leading-relaxed);
}

.settings-list-view__state {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.settings-list-view__table-wrap {
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.settings-list-view__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.settings-list-view__table thead {
  background: var(--color-surface-alt);
}

.settings-list-view__table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.settings-list-view__table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.settings-list-view__row:last-child td {
  border-bottom: none;
}

.settings-list-view__col-actions {
  text-align: right;
  white-space: nowrap;
}

.settings-list-view__key {
  background: var(--color-surface-alt);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: var(--font-xs);
  color: var(--color-text-primary);
}

.settings-list-view__value {
  display: inline-block;
  font-weight: var(--weight-semibold);
  color: var(--color-primary);
}

.settings-list-view__row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  background-color: var(--color-surface);
  font-size: var(--font-xs);
  font-weight: var(--weight-medium);
  color: var(--color-primary);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.settings-list-view__row-action:hover {
  background-color: var(--color-primary-soft);
}

/* ── Edit ─────────────────────────────────────────────────── */
.settings-list-view__edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.settings-list-view__edit-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.settings-list-view__edit-label {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}

.settings-list-view__edit-desc {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
}

.settings-list-view__edit-hint {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.settings-list-view__modal-btn {
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
  border: 1px solid transparent;
  transition: background-color var(--transition-fast);
}

.settings-list-view__modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-list-view__modal-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.settings-list-view__modal-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.settings-list-view__modal-btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.settings-list-view__modal-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.settings-list-view__spinner {
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
</style>
