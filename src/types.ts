export interface Project {
  auto_id: number
  prefix: string
  project_id: string
  project_name: string
  address: string | null
  contact_number: string | null
  update_by: string
  update_date: string
  is_active: boolean
  is_delete: boolean
  id_status: string
}

export interface House {
  auto_id: number
  prefix: string
  house_id: string
  project_id: string
  house_number: string
  zone_or_soi: string | null
  update_by: string
  update_date: string
  is_active: boolean
  is_delete: boolean
  id_status: string
}

export interface User {
  auto_id: number
  prefix: string
  user_id: string
  project_id: string
  house_id: string | null
  full_name: string
  phone_number: string | null
  line_id: string | null
  role: string
  update_by: string
  update_date: string
  is_active: boolean
  is_delete: boolean
  id_status: string
}

export interface Vehicle {
  auto_id: number
  prefix: string
  vehicle_id: string
  project_id: string
  user_id: string
  license_plate: string
  province: string | null
  brand: string | null
  color: string | null
  update_by: string
  update_date: string
  is_active: boolean
  is_delete: boolean
  id_status: string
}

export interface Device {
  auto_id: number
  prefix: string
  device_id: string
  project_id: string
  gate_name: string
  device_type: string | null
  ip_address: string | null
  update_by: string
  update_date: string
  is_active: boolean
  is_delete: boolean
  id_status: string
}

export interface AccessLog {
  auto_id: number
  prefix: string
  log_id: string
  project_id: string
  device_id: string | null
  license_plate: string | null
  access_type: string | null
  user_type: string | null
  access_date: string
  image_url: string | null
  remark: string | null
  is_success: boolean
  update_by: string
  update_date: string
  is_active: boolean
  is_delete: boolean
  id_status: string
}

export interface Blacklist {
  auto_id: number
  prefix: string
  blacklist_id: string
  project_id: string
  license_plate: string
  reason: string | null
  update_by: string
  update_date: string
  is_active: boolean
  is_delete: boolean
  id_status: string
}

export interface LoginRequest {
  user_id: string
  phone_number: string
}

export interface LoginResponse {
  token: string
  user_id: string
  full_name: string
  role: string
}

export interface AdminLoginRequest {
  admin_name: string
  password: string
}

export interface AdminLoginResponse {
  token: string
  admin_id: string
  full_name: string
  role: string
}

export interface ListResponse<T> {
  data: T[]
  total: number
}

export interface SuccessResponse {
  message: string
  data?: unknown
}

export interface ErrorResponse {
  error: string
  message?: string
}
