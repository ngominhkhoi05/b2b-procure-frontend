/**
 * Upload service — wraps the /api/v1/uploads/* multipart endpoints.
 *
 * The shared `api` instance in @/services/api.js sets Content-Type:
 * application/json by default, which BREAKS multipart uploads
 * (browsers need to add the boundary parameter themselves). So we
 * set Content-Type to `undefined` on each request — axios then
 * auto-detects FormData and lets the browser build the multipart
 * envelope. The 401 interceptor still fires normally.
 *
 * Backend endpoints:
 *   POST /api/v1/uploads/avatar   multipart/form-data (file)        — any auth user
 *   POST /api/v1/uploads/cover    multipart/form-data (file)        — any auth user
 *   POST /api/v1/uploads/product  multipart/form-data (file, folder?) — ADMIN, SUPPLIER
 */

import { api } from './api'

/**
 * @typedef {Object} UploadResponse
 * @property {string}  publicId    — Cloudinary stable id (useful for delete)
 * @property {string}  url         — secure HTTPS URL, drop into <img src>
 * @property {string}  format      — file extension without dot
 * @property {number|null} width
 * @property {number|null} height
 * @property {number}  sizeBytes
 */

/**
 * Upload an avatar image.
 *
 * @param {File|Blob} file
 * @returns {Promise<UploadResponse>}
 */
export async function uploadAvatar(file) {
  return upload(file, '/uploads/avatar')
}

/**
 * Upload a cover image.
 *
 * @param {File|Blob} file
 * @returns {Promise<UploadResponse>}
 */
export async function uploadCover(file) {
  return upload(file, '/uploads/cover')
}

/**
 * Upload a product image.
 *
 * @param {File|Blob} file
 * @param {{ folder?: string }} [opts]  — optional sub-folder, e.g. "products/42"
 * @returns {Promise<UploadResponse>}
 */
export async function uploadProductImage(file, opts = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (opts.folder) {
    formData.append('folder', opts.folder)
  }
  return postFormData('/uploads/product', formData)
}

/**
 * Convenience helper for endpoints that take only `file`.
 *
 * @param {File|Blob} file
 * @param {string}    path
 * @returns {Promise<UploadResponse>}
 */
async function upload(file, path) {
  const formData = new FormData()
  formData.append('file', file)
  return postFormData(path, formData)
}

/**
 * Send a multipart request and unwrap the ApiResponse envelope.
 *
 * Why `Content-Type: undefined`?
 *   - If we send 'multipart/form-data' as-is, the boundary is missing and
 *     Spring rejects the request.
 *   - If we send nothing, axios auto-detects FormData and sets the right
 *     Content-Type with a generated boundary.
 *   - Setting `undefined` (not `null`) is the documented axios escape hatch.
 */
async function postFormData(path, formData) {
  const response = await api.post(path, formData, {
    headers: { 'Content-Type': undefined },
  })
  return response.data.data
}
