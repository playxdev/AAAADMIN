// ตรงกับ response ของ AAAAPI /api/v1/admin/* (ดู AAAAPI/src/admin.ts, guest.ts)

export type PaymentStatus = 'NORMAL' | 'OVERDUE' | 'OVERDUE_SEVERE'

export interface House {
  house_id: string
  house_number: string
  house_code: string | null
  zone_or_soi: string | null
  payment_status: PaymentStatus
  is_active: number
  update_date: string
}

export interface Resident {
  user_id: string
  house_id: string | null
  full_name: string
  phone_number: string | null
  line_id: string | null
  role: string
  is_active: number
  update_date: string
}

export interface Vehicle {
  vehicle_id: string
  license_plate: string
  province: string | null
  brand: string | null
  color: string | null
  is_active: number
}

export interface Credential {
  credential_id: string
  cred_type: 'RFID' | 'QRCODE' | 'PIN'
  valid_from: string | null
  valid_until: string | null
  max_uses: number | null
  use_count: number
  is_active: number
  id_status: string
}

export interface ResidentDetail extends Resident {
  vehicles: Vehicle[]
  credentials: Credential[]
}

export interface Visitor {
  visitor_id: string
  house_id: string | null
  house_number: string | null
  house_code: string | null
  full_name: string | null
  phone_number: string | null
  license_plate: string | null
  purpose: string | null
  valid_from: string
  valid_until: string
  issued_by_type: string | null
  issued_by_id: string | null
  is_active: number
  id_status: string
  is_valid_now: number
}

export interface VisitorCreated {
  visitor_id: string
  valid_from: string
  valid_until: string
  credential_id?: string
  code?: string
}

export interface AdminLoginRequest {
  admin_name: string
  password: string
}

export interface AdminLoginResponse {
  access_token: string
  token_type: string
  expires_in: number
}
