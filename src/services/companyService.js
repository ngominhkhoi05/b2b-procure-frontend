/**
 * Company service — admin-scoped company APIs and current-company APIs.
 *
 * Admin endpoints (ADMIN only):
 *   GET    /api/v1/admin/companies                  (PageResponse<CompanyResponse>)
 *   GET    /api/v1/admin/companies/{companyId}     (AdminCompanyResponse)
 *   PATCH  /api/v1/admin/companies/{companyId}/status body { status }
 *
 * Shared endpoints (any authenticated role; PUT limited to BUYER/SUPPLIER):
 *   GET    /api/v1/companies/me                    (CompanyResponse; 400 if user has no company)
 *   PUT    /api/v1/companies/me                    (UpdateCompanyRequest; BUYER/SUPPLIER)
 *
 * Reuses the shared `api` instance.
 */

import { api } from './api'

// ── Admin company management ────────────────────────────────────────────

/**
 * Fetch a paginated list of companies (ADMIN only).
 *
 * @param {{
 *   companyType?: string,  // 'BUYER' | 'SUPPLIER'
 *   status?: string,        // 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
 *   keyword?: string,
 *   page?: number,
 *   size?: number,
 *   sort?: string,
 * }} [params]
 * @returns {Promise<PageResponse<CompanyResponse>>}
 */
export async function listCompanies(params = {}) {
  const {
    companyType,
    status,
    keyword,
    page = 0,
    size = 20,
    sort = 'id,asc',
  } = params

  const queryParams = { page, size, sort }
  if (companyType) queryParams.companyType = companyType
  if (status)      queryParams.status      = status
  if (keyword)     queryParams.keyword     = keyword

  const response = await api.get('/admin/companies', { params: queryParams })
  return response.data.data
}

/**
 * Fetch a single company's full details (ADMIN only).
 *
 * Returns AdminCompanyResponse which includes `userCount` and `productCount`
 * in addition to the base CompanyResponse fields.
 *
 * @param {number|string} companyId
 * @returns {Promise<AdminCompanyResponse>}
 */
export async function getCompanyByIdForAdmin(companyId) {
  const response = await api.get(`/admin/companies/${companyId}`)
  return response.data.data
}

/**
 * Update a company's status (ADMIN only).
 *
 * @param {number|string} companyId
 * @param {'ACTIVE'|'INACTIVE'|'BLOCKED'} status
 * @returns {Promise<CompanyResponse>}
 */
export async function updateCompanyStatus(companyId, status) {
  const response = await api.patch(`/admin/companies/${companyId}/status`, { status })
  return response.data.data
}

// ── Shared current-company APIs ────────────────────────────────────────

/**
 * Fetch the currently authenticated user's company.
 *
 * Backend returns 400 with `BusinessException` if the user has no company
 * (e.g. ADMIN). The caller is expected to handle that case and skip
 * rendering the company section.
 *
 * @returns {Promise<CompanyResponse>}
 */
export async function getCurrentCompany() {
  const response = await api.get('/companies/me')
  return response.data.data
}

/**
 * Update the currently authenticated user's company (BUYER / SUPPLIER only).
 *
 * @param {UpdateCompanyRequest} body
 * @returns {Promise<CompanyResponse>}
 */
export async function updateCurrentCompany(body) {
  const response = await api.put('/companies/me', body)
  return response.data.data
}

// ── Types ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CompanyResponse
 * @property {number}         id
 * @property {string}         name
 * @property {string}         taxCode
 * @property {string|null}    email
 * @property {string|null}    phone
 * @property {string|null}    address
 * @property {string}         companyType           — 'BUYER' | 'SUPPLIER'
 * @property {string}         status                — 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
 * @property {string|null}    createdAt
 * @property {string|null}    updatedAt
 */

/**
 * @typedef {Object} AdminCompanyResponse
 * @property {number}         id
 * @property {string}         name
 * @property {string}         taxCode
 * @property {string|null}    email
 * @property {string|null}    phone
 * @property {string|null}    address
 * @property {string}         companyType
 * @property {string}         status
 * @property {string|null}    createdAt
 * @property {string|null}    updatedAt
 * @property {number}         userCount
 * @property {number}         productCount
 */

/**
 * @typedef {Object} UpdateCompanyRequest
 * @property {string}         name                  — required
 * @property {string|null}    [taxCode]
 * @property {string|null}    [email]               — must be valid email format
 * @property {string|null}    [phone]
 * @property {string|null}    [address]
 */

/**
 * @typedef {Object} PageResponse
 * @property {CompanyResponse[]} content
 * @property {number}             pageNo
 * @property {number}             pageSize
 * @property {number}             totalElements
 * @property {number}             totalPages
 * @property {boolean}            last
 * @property {boolean}            first
 */
