import type {
  Complaint,
  Notice,
  Scheme,
  User,
  Panchayat,
  PlatformOverview,
  AuditEvent,
  DashboardStats,
  AdminDashboardStats,
} from '../types'

const API_BASE = '/api'

interface ApiResponseError {
  error?: string
}

/** Thrown when an endpoint answers 404 — lets pages show a dedicated
 *  not-found state instead of a generic load error. */
export class ApiNotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'ApiNotFoundError'
  }
}

async function parseError(response: Response): Promise<Error> {
  try {
    const data: ApiResponseError = await response.json()
    return new Error(data.error || 'Request failed')
  } catch {
    return new Error('Request failed')
  }
}

export async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      await response.json().catch(() => undefined)
      throw new ApiNotFoundError()
    }
    throw await parseError(response)
  }

  return response.json()
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  village: string
  phone: string
  panchayatId: string
}

export interface CreateComplaintPayload {
  category: string
  title: string
  description: string
  image_url?: string
}

export interface UpdateStatusPayload {
  status: string
  remarks?: string
}

export const authAPI = {
  me: () => fetchWithAuth<{ user: User; panchayat: { panchayatId: string; name: string } | null }>('/auth/me'),
  login: (username: string, password: string) =>
    fetchWithAuth<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (data: RegisterPayload) =>
    fetchWithAuth<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () => fetchWithAuth<{ success: boolean }>('/auth/logout', { method: 'POST' }),
}

export const complaintsAPI = {
  list: () => fetchWithAuth<{ complaints: Complaint[] }>('/complaints'),
  get: (id: string) => fetchWithAuth<{ complaint: Complaint }>(`/complaints/${id}`),
  create: (data: CreateComplaintPayload) =>
    fetchWithAuth<{ complaint: Complaint }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, data: UpdateStatusPayload) =>
    fetchWithAuth<{ complaint: Complaint }>(`/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

export const noticesAPI = {
  list: (panchayatId?: string) =>
    fetchWithAuth<{ notices: Notice[] }>(
      '/notices' + (panchayatId ? `?p=${encodeURIComponent(panchayatId)}` : ''),
    ),
  get: (id: string) => fetchWithAuth<{ notice: Notice }>(`/notices/${encodeURIComponent(id)}`),
  create: (data: Partial<Notice>) =>
    fetchWithAuth<{ notice: Notice }>('/notices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const schemesAPI = {
  list: () => fetchWithAuth<{ schemes: Scheme[] }>('/schemes'),
}

export interface PlatformStats {
  total: number
  pending: number
  in_progress: number
  resolved: number
}

export const statsAPI = {
  /** Public platform-wide counters used on the landing page */
  get: () => fetchWithAuth<PlatformStats>('/stats'),
}

export interface CitizenDashboard {
  complaints: Complaint[]
  stats: DashboardStats
}

export interface AdminDashboard {
  complaints: Complaint[]
  stats: AdminDashboardStats
}

export const dashboardAPI = {
  citizen: () => fetchWithAuth<CitizenDashboard>('/dashboard/citizen'),
  admin: (panchayatId?: string) =>
    fetchWithAuth<AdminDashboard>(
      '/dashboard/admin' + (panchayatId ? `?panchayatId=${encodeURIComponent(panchayatId)}` : ''),
    ),
}

export const panchayatsAPI = {
  /** Public directory of active panchayats (id + name only) */
  listPublic: () => fetchWithAuth<{ panchayats: Array<{ panchayatId: string; name: string; district: string }> }>('/panchayats'),
}

export const superAPI = {
  overview: () => fetchWithAuth<PlatformOverview>('/super/overview'),
  listPanchayats: () => fetchWithAuth<{ panchayats: Panchayat[] }>('/super/panchayats'),
  createPanchayat: (payload: {
    panchayatId?: string
    name: string
    district?: string
    state?: string
    contactEmail?: string
    contactPhone?: string
    adminUsername?: string
    adminEmail?: string
    adminPassword?: string
  }) =>
    fetchWithAuth<{ panchayat: Panchayat; adminCreated: boolean }>('/super/panchayats', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  setPanchayatStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    fetchWithAuth<{ panchayat: Panchayat }>(`/super/panchayats/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  audit: () => fetchWithAuth<{ events: AuditEvent[] }>('/super/audit'),
}

/**
 * Upload an image to S3 through the Flask API with progress reporting.
 * fetch() cannot report upload progress, so this uses XMLHttpRequest.
 */
export function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/uploads`)
    xhr.withCredentials = true

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const data: ApiResponseError & { url?: string } = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          resolve({ url: data.url })
        } else {
          reject(new Error(data.error || 'Upload failed'))
        }
      } catch {
        reject(new Error('Upload failed'))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'))

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}
