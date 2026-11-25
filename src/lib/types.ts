// Mirrors AAAAPI /api/v1/admin/* responses (see AAAAPI/src/admin.ts, guest.ts)

export type PaymentStatus = 'NORMAL' | 'OVERDUE' | 'OVERDUE_SEVERE'

export type Occupancy = 'OCCUPIED' | 'VACANT'
export type ContactRole = 'OWNER' | 'RESIDENT' | 'TENANT'

/** House contact (tb_user): owner / resident / tenant, optionally linked to LINE. */
export interface Contact {
  user_id: string
  house_id: string
  full_name: string
  phone_number: string | null
  role: ContactRole
  line_linked: number
}

export interface House {
  house_id: string
  house_number: string
  house_code: string | null
  zone_or_soi: string | null
  payment_status: PaymentStatus
  occupancy_status: Occupancy
  is_active: number
  update_date: string
  /** Active contacts, owner first (= main contact). */
  contacts: Contact[]
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

/** Access methods belong to the house, not to a person. */
export interface HouseDetail extends House {
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
