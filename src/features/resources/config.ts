import { z } from 'zod'
import {
  Ban,
  Building2,
  Car,
  Cpu,
  Home,
  type LucideIcon,
  Users,
} from 'lucide-react'

export type FieldDef = {
  name: string
  label: string
  required?: boolean
  type?: 'text' | 'textarea' | 'select'
  options?: { label: string; value: string }[]
  placeholder?: string
}

export type ColumnDef = {
  key: string
  label: string
  mono?: boolean
  badge?: boolean
}

export type ResourceConfig = {
  title: string
  description: string
  icon: LucideIcon
  /** API path under /api/v1 */
  endpoint: string
  /** Business id used in /endpoint/:id */
  idKey: string
  columns: ColumnDef[]
  fields: FieldDef[]
}

const userRoles = [
  { label: 'Resident', value: 'RESIDENT' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Admin', value: 'ADMIN' },
]

const deviceTypes = [
  { label: 'LPR Camera', value: 'LPR_CAMERA' },
  { label: 'RFID Reader', value: 'RFID_READER' },
  { label: 'QR Scanner', value: 'QR_SCANNER' },
  { label: 'Barrier Gate', value: 'BARRIER_GATE' },
  { label: 'Controller', value: 'CONTROLLER' },
]

const projectField: FieldDef = {
  name: 'project_id',
  label: 'Project ID',
  required: true,
  placeholder: 'e.g. PRJ-xxx',
}
const statusColumn: ColumnDef = {
  key: 'id_status',
  label: 'Status',
  badge: true,
}

export const resources = {
  projects: {
    title: 'Projects',
    description: 'Residential projects managed by the system.',
    icon: Building2,
    endpoint: '/projects',
    idKey: 'project_id',
    columns: [
      { key: 'project_id', label: 'Project ID', mono: true },
      { key: 'project_name', label: 'Name' },
      { key: 'address', label: 'Address' },
      { key: 'contact_number', label: 'Contact' },
      statusColumn,
    ],
    fields: [
      { name: 'project_name', label: 'Project Name', required: true },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'contact_number', label: 'Contact Number' },
    ],
  },
  houses: {
    title: 'Houses',
    description: 'Houses and units inside each project.',
    icon: Home,
    endpoint: '/houses',
    idKey: 'house_id',
    columns: [
      { key: 'house_id', label: 'House ID', mono: true },
      { key: 'house_number', label: 'House Number' },
      { key: 'project_id', label: 'Project', mono: true },
      { key: 'zone_or_soi', label: 'Zone/Soi' },
      statusColumn,
    ],
    fields: [
      projectField,
      {
        name: 'house_number',
        label: 'House Number',
        required: true,
        placeholder: 'e.g. 123/45',
      },
      { name: 'zone_or_soi', label: 'Zone / Soi', placeholder: 'e.g. Soi 1' },
    ],
  },
  users: {
    title: 'Users',
    description: 'Residents, staff and admins.',
    icon: Users,
    endpoint: '/users',
    idKey: 'user_id',
    columns: [
      { key: 'user_id', label: 'User ID', mono: true },
      { key: 'full_name', label: 'Full Name' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'role', label: 'Role', badge: true },
      { key: 'project_id', label: 'Project', mono: true },
      statusColumn,
    ],
    fields: [
      { name: 'full_name', label: 'Full Name', required: true },
      projectField,
      { name: 'house_id', label: 'House ID', placeholder: 'e.g. HSE-xxx' },
      { name: 'phone_number', label: 'Phone Number' },
      { name: 'line_id', label: 'Line ID' },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        options: userRoles,
      },
    ],
  },
  vehicles: {
    title: 'Vehicles',
    description: 'Registered vehicles and their owners.',
    icon: Car,
    endpoint: '/vehicles',
    idKey: 'vehicle_id',
    columns: [
      { key: 'vehicle_id', label: 'Vehicle ID', mono: true },
      { key: 'license_plate', label: 'License Plate', mono: true },
      { key: 'province', label: 'Province' },
      { key: 'brand', label: 'Brand' },
      { key: 'color', label: 'Color' },
      { key: 'user_id', label: 'Owner', mono: true },
    ],
    fields: [
      projectField,
      {
        name: 'user_id',
        label: 'User ID',
        required: true,
        placeholder: 'e.g. USR-xxx',
      },
      { name: 'license_plate', label: 'License Plate', required: true },
      { name: 'province', label: 'Province' },
      { name: 'brand', label: 'Brand' },
      { name: 'color', label: 'Color' },
    ],
  },
  devices: {
    title: 'Devices',
    description: 'Gate devices: cameras, readers, barriers and controllers.',
    icon: Cpu,
    endpoint: '/devices',
    idKey: 'device_id',
    columns: [
      { key: 'device_id', label: 'Device ID', mono: true },
      { key: 'gate_name', label: 'Gate Name' },
      { key: 'device_type', label: 'Type', badge: true },
      { key: 'ip_address', label: 'IP Address', mono: true },
      { key: 'project_id', label: 'Project', mono: true },
      statusColumn,
    ],
    fields: [
      projectField,
      {
        name: 'gate_name',
        label: 'Gate Name',
        required: true,
        placeholder: 'e.g. Main Gate',
      },
      {
        name: 'device_type',
        label: 'Device Type',
        type: 'select',
        options: deviceTypes,
      },
      {
        name: 'ip_address',
        label: 'IP Address',
        placeholder: 'e.g. 192.168.1.100',
      },
    ],
  },
  blacklist: {
    title: 'Blacklist',
    description: 'License plates denied entry.',
    icon: Ban,
    endpoint: '/blacklist',
    idKey: 'blacklist_id',
    columns: [
      { key: 'blacklist_id', label: 'ID', mono: true },
      { key: 'license_plate', label: 'License Plate', mono: true },
      { key: 'reason', label: 'Reason' },
      { key: 'project_id', label: 'Project', mono: true },
      statusColumn,
    ],
    fields: [
      projectField,
      { name: 'license_plate', label: 'License Plate', required: true },
      { name: 'reason', label: 'Reason', type: 'textarea' },
    ],
  },
} satisfies Record<string, ResourceConfig>

export type Row = Record<string, unknown>

/** Form values -> API payload: trimmed strings, empty optional fields become null. */
export function toPayload(fields: FieldDef[], values: Record<string, string>) {
  return Object.fromEntries(
    fields.map((f) => {
      const v = (values[f.name] ?? '').trim()
      return [f.name, v === '' && !f.required ? null : v]
    })
  )
}

export function buildSchema(config: ResourceConfig) {
  return z.object(
    Object.fromEntries(
      config.fields.map((f) => [
        f.name,
        f.required
          ? z.string().trim().min(1, `${f.label} is required.`)
          : z.string(),
      ])
    )
  )
}
