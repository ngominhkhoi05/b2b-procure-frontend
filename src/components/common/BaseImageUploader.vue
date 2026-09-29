<script setup>
/**
 * BaseImageUploader — preview + upload + URL output combo.
 *
 * Two ways to drive it:
 *   1. v-model:url   — bind the resulting URL (Cloudinary) to a form field.
 *   2. uploadFn prop — supply your own upload function so the component
 *                      stays decoupled from the upload service. Defaults
 *                      to importing uploadAvatar / uploadCover /
 *                      uploadProductImage from the relevant service.
 *
 * The component:
 *   - Shows the current image (or a placeholder if url is empty).
 *   - Lets the user pick a file from disk.
 *   - Validates locally (size + mime) before sending to the server so
 *     we don't waste a round trip on obvious junk.
 *   - Calls the upload function with the file, awaits the secure URL,
 *     then emits `update:url` so the parent form picks it up.
 *   - Shows a spinner during upload, then a success or error toast
 *     via the parent's toast store if provided.
 *
 * Props:
 *   modelValue (url)  — current image URL (v-model:url)
 *   uploadFn          — async (file) => { url, publicId, ... } | string
 *   label             — field label text
 *   help              — hint text under the field
 *   error             — server-side error string
 *   disabled          — disables the picker + clear button
 *   shape             — 'square' (avatar) | 'wide' (cover/product)
 *   maxBytes          — local pre-validation, default 5 MB
 *   altText           — alt text for the preview image
 *   bare              — when true, only render the preview (no label,
 *                       help text, or action buttons). Parent is
 *                       expected to wire up its own controls.
 *
 * Emits:
 *   update:url        — emitted with the new URL after successful upload
 *   update:publicId   — emitted with the Cloudinary publicId (useful for cleanup later)
 *   upload-error      — emitted with the error message when upload fails
 */
import { ref, computed } from 'vue'
import { uploadAvatar, uploadCover, uploadProductImage } from '@/services/uploadService'
import { useToastStore } from '@/stores/toast'
import { handleApiError } from '@/utils/errorHandler'

const props = defineProps({
  // v-model:url
  url: {
    type: String,
    default: '',
  },
  uploadFn: {
    type: Function,
    default: null,
  },
  label: {
    type: String,
    default: 'Hình ảnh',
  },
  help: {
    type: String,
    default: 'PNG, JPG, WEBP hoặc GIF. Tối đa 5 MB.',
  },
  error: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  // 'avatar' is square + small; 'cover' is wide; 'product' is square + larger.
  variant: {
    type: String,
    default: 'avatar',
    validator: (v) => ['avatar', 'cover', 'product'].includes(v),
  },
  maxBytes: {
    type: Number,
    default: 5 * 1024 * 1024,
  },
  altText: {
    type: String,
    default: 'Preview',
  },
  // Bare mode renders ONLY the preview area. No label, no help text,
  // no action buttons. Parent must provide its own file input /
  // upload wiring. Default false to preserve existing behaviour.
  bare: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:url', 'update:publicId', 'upload-error'])

const toast = useToastStore()

const fileInput = ref(null)
const uploading = ref(false)
const localError = ref('')

// Map variant → default upload function. The parent can override via uploadFn.
const defaultUploadFn = computed(() => {
  if (props.uploadFn) return props.uploadFn
  switch (props.variant) {
    case 'avatar':  return uploadAvatar
    case 'cover':   return uploadCover
    case 'product': return uploadProductImage
    default:        return uploadAvatar
  }
})

function pickFile() {
  if (props.disabled || uploading.value) return
  fileInput.value?.click()
}

function clearImage() {
  emit('update:url', '')
  emit('update:publicId', '')
  if (fileInput.value) fileInput.value.value = ''
  localError.value = ''
}

async function onFileChange(event) {
  const file = event.target.files?.[0]
  // Reset the input so the same file can be re-picked after a clear.
  event.target.value = ''
  if (!file) return

  localError.value = ''

  // Local pre-validation: keep the failure fast and offline-friendly.
  if (!file.type || !file.type.startsWith('image/')) {
    localError.value = 'Vui lòng chọn một tệp hình ảnh.'
    emit('upload-error', localError.value)
    return
  }
  if (file.size > props.maxBytes) {
    const mb = Math.round(props.maxBytes / 1024 / 1024)
    localError.value = `Hình ảnh vượt quá ${mb} MB. Vui lòng chọn ảnh nhỏ hơn.`
    emit('upload-error', localError.value)
    return
  }

  uploading.value = true
  try {
    const result = await defaultUploadFn.value(file)
    // Result is either an UploadResponse object or just a URL string.
    const newUrl     = typeof result === 'string' ? result : result?.url
    const newPublicId = typeof result === 'string' ? '' : (result?.publicId ?? '')
    if (!newUrl) {
      throw new Error('Upload service returned no URL')
    }
    emit('update:url', newUrl)
    emit('update:publicId', newPublicId)
  } catch (err) {
    const { message } = handleApiError(err)
    localError.value = message || 'Tải ảnh lên thất bại. Vui lòng thử lại.'
    emit('upload-error', localError.value)
    toast.error(localError.value)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div
    class="base-image-uploader"
    :class="[
      `base-image-uploader--${variant}`,
      { 'base-image-uploader--disabled': disabled, 'base-image-uploader--error': error || localError }
    ]"
  >
    <label v-if="label && !bare" class="base-image-uploader__label">{{ label }}</label>

    <div class="base-image-uploader__preview-wrap">
      <!-- Preview / placeholder -->
      <div
        class="base-image-uploader__preview"
        :class="{ 'base-image-uploader__preview--has-image': url }"
      >
        <img
          v-if="url"
          :src="url"
          :alt="altText"
          class="base-image-uploader__img"
          @error="(e) => { e.target.style.display = 'none' }"
        />
        <div v-else class="base-image-uploader__placeholder">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
            <path d="m4 17 4-4 3 3 4-5 5 6" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="base-image-uploader__placeholder-text">Chưa có hình ảnh</span>
        </div>

        <!-- Upload spinner overlay -->
        <div v-if="uploading" class="base-image-uploader__overlay" aria-live="polite">
          <span class="base-image-uploader__spinner" aria-hidden="true" />
          <span class="base-image-uploader__overlay-text">Đang tải lên...</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div v-if="!bare" class="base-image-uploader__actions">
        <button
          type="button"
          class="base-image-uploader__btn base-image-uploader__btn--primary"
          :disabled="disabled || uploading"
          @click="pickFile"
        >
          {{ url ? 'Thay đổi' : 'Tải ảnh lên' }}
        </button>
        <button
          v-if="url && !disabled"
          type="button"
          class="base-image-uploader__btn base-image-uploader__btn--ghost"
          :disabled="uploading"
          @click="clearImage"
        >
          Xóa
        </button>
      </div>

      <!-- Hidden file input. accept restricts the picker dialog to images. -->
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="base-image-uploader__file-input"
        :disabled="disabled || uploading"
        @change="onFileChange"
      />
    </div>

    <p v-if="localError || error" class="base-image-uploader__error" role="alert">
      {{ localError || error }}
    </p>
    <p v-else-if="help && !bare" class="base-image-uploader__help">{{ help }}</p>
  </div>
</template>

<style scoped>
.base-image-uploader {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.base-image-uploader__label {
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  user-select: none;
}

.base-image-uploader__preview-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Preview frame ─────────────────────────────────────────────────────── */
.base-image-uploader__preview {
  position: relative;
  background: var(--color-surface-alt);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.base-image-uploader--avatar .base-image-uploader__preview {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
}

.base-image-uploader--cover .base-image-uploader__preview {
  width: 100%;
  height: 160px;
  border-radius: var(--radius-md);
}

.base-image-uploader--product .base-image-uploader__preview {
  width: 160px;
  height: 160px;
  border-radius: var(--radius-md);
}

.base-image-uploader__preview--has-image {
  border-style: solid;
  border-color: var(--color-border);
}

.base-image-uploader__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.base-image-uploader__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
}

.base-image-uploader__placeholder-text {
  font-size: var(--font-xs);
}

/* ── Overlay during upload ─────────────────────────────────────────────── */
.base-image-uploader__overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

.base-image-uploader__spinner {
  display: inline-block;
  width: 22px;
  height: 22px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: base-image-uploader-spin 0.7s linear infinite;
}

@keyframes base-image-uploader-spin {
  to { transform: rotate(360deg); }
}

/* ── Actions ───────────────────────────────────────────────────────────── */
.base-image-uploader__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.base-image-uploader__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: var(--weight-medium);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.base-image-uploader__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-image-uploader__btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.base-image-uploader__btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.base-image-uploader__btn--ghost {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.base-image-uploader__btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.base-image-uploader__file-input {
  display: none;
}

/* ── Help / error ──────────────────────────────────────────────────────── */
.base-image-uploader__help {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.base-image-uploader__error {
  margin: 0;
  font-size: var(--font-xs);
  color: var(--color-danger);
}

.base-image-uploader--disabled .base-image-uploader__preview {
  opacity: 0.6;
}
</style>
