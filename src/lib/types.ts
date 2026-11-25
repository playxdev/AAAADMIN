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
