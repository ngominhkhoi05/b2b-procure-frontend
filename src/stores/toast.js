/**
 * Toast / notification store.
 *
 * Phase 1: lightweight foundation so later phases don't rebuild this.
 *
 * Usage:
 *   import { useToastStore } from '@/stores/toast'
 *   const toast = useToastStore()
 *   toast.success('Saved!')
 *   toast.error('Something went wrong', { duration: 5000 })
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {'success'|'error'|'warning'|'info'} type
 * @property {string} message
 * @property {number} duration  milliseconds; 0 = persistent
 */

let _idCounter = 0

export const useToastStore = defineStore('toast', () => {
  /** @type {import('vue').Ref<Toast[]>} */
  const toasts = ref([])

  /**
   * Add a toast.
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} message
   * @param {{ duration?: number }} [options]
   * @returns {string} toast id
   */
  function addToast(type, message, { duration = 3500 } = {}) {
    const id = `toast-${++_idCounter}`
    toasts.value.push({ id, type, message, duration })

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }

    return id
  }

  function removeToast(id) {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  function success(message, options) { return addToast('success', message, options) }
  function error(message, options)   { return addToast('error',   message, options) }
  function warning(message, options) { return addToast('warning', message, options) }
  function info(message, options)   { return addToast('info',    message, options) }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
})
