export type UserRole = 'super_admin' | 'panchayat_admin' | 'villager'

export interface User {
  user_id: string
  username: string
  email: string
  role: UserRole
  panchayatId?: string
  village: string
  phone: string
  created_at: string
}

export interface Panchayat {
  panchayatId: string
  name: string
  district: string
  state?: string
  contactEmail?: string
  contactPhone?: string
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt?: string
  complaintCount?: number
}

export interface PlatformOverview {
  totalPanchayats: number
  activePanchayats: number
  suspendedPanchayats: number
  totalUsers: number
  totalComplaints: number
  resolvedComplaints: number
  resolutionRate: number | null
}

export interface AuditEvent {
  audit_id: string
  panchayatId: string
  timestamp: string
  actorId: string
  actorName: string
  action: string
  resourceId: string
  result: string
  details: string
}

export interface Complaint {
  complaint_id: string
  user_id: string
  username: string
  email: string
  category: string
  title: string
  description: string
  image_url: string
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected'
  village: string
  submitted_at: string
  updated_at: string
  admin_remarks: string
  timeline: TimelineEvent[]
}

export interface TimelineEvent {
  status: string
  remarks: string
  at: string
}

export interface Notice {
  notice_id: string
  title: string
  content: string
  category: 'General' | 'Meeting' | 'Alert' | 'Scheme' | 'Event'
  posted_by: string
  posted_at: string
  expiry_date: string
}

export interface Scheme {
  id: string
  name: string
  department: string
  category: string
  description: string
  benefit: string
  eligibility: string
  link: string
  /** Page for this scheme on the national myScheme.gov.in directory */
  myscheme_url?: string
}

export interface DashboardStats {
  total: number
  pending: number
  in_progress: number
  resolved: number
}

export interface AdminDashboardStats extends DashboardStats {
  avg_resolution_hours: number | null
  categories: Record<string, number>
}

export interface AuthResponse {
  user: User
  token?: string
}

export interface ApiError {
  error: string
  message?: string
}

export const COMPLAINT_CATEGORIES = [
  'Road Damage',
  'Water Supply',
  'Electricity',
  'Sanitation',
  'School/Education',
  'Health',
  'Agriculture',
  'Other'
] as const

export const NOTICE_CATEGORIES = [
  'General',
  'Meeting',
  'Alert',
  'Scheme',
  'Event'
] as const