import { useMemo, useState } from 'react'
import { type z } from 'zod'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Home,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { ContactRole, House, PaymentStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { SelectField, TextField } from '@/components/form-fields'
import { Page } from '@/components/layout/page'
import { ActiveBadge } from '@/features/shared'
import { AccessDialog } from './components/access-dialog'
import { houseSchema, saveContacts, toHousePayload, useHouses } from './data'

const PAYMENT_CLASS: Record<PaymentStatus, string> = {
  NORMAL: 'bg-emerald-600 text-white',
  OVERDUE: 'bg-amber-500 text-white',
  OVERDUE_SEVERE: 'bg-destructive text-white',
}

type FormValues = z.input<typeof houseSchema>

const ROLES: ContactRole[] = ['OWNER', 'RESIDENT', 'TENANT']

function HouseDialog({
  house,
  open,
  onOpenChange,
}: {
  house?: House
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(houseSchema),
    values: {
      house_number: house?.house_number ?? '',
      house_code: house?.house_code ?? '',
      zone_or_soi: house?.zone_or_soi ?? '',
      payment_status: house?.payment_status ?? 'NORMAL',
      occupancy_status: house?.occupancy_status ?? 'OCCUPIED',
      // New house: one empty owner row; a blank row is skipped on save.
      contacts: house?.contacts.length
        ? house.contacts.map((c) => ({
            user_id: c.user_id,
            full_name: c.full_name,
            phone_number: c.phone_number ?? '',
            role: c.role,
          }))
        : [{ full_name: '', phone_number: '', role: 'OWNER' }],
    },
  })
  const contacts = useFieldArray({ control: form.control, name: 'contacts' })
  const occupancy = useWatch({
    control: form.control,
    name: 'occupancy_status',
  })
  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = toHousePayload(v, !!house)
      const houseId = house
        ? (await api.patch(
            `/houses/${encodeURIComponent(house.house_id)}`,
            payload
          ),
          house.house_id)
        : (await api.post<{ house_id: string }>('/houses', payload)).data
            .house_id
      await saveContacts(houseId, house?.contacts ?? [], v.contacts)
    },
    onSuccess: () => {
      toast.success(t(house ? 'houses.updated' : 'houses.created'))
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['houses'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.save'))),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Home className='size-5' />
            {t(house ? 'houses.editTitle' : 'houses.newTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='house-form'
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
            className='space-y-4'
          >
            <TextField
              control={form.control}
              name='house_number'
              label={t('col.house_number')}
              required
              maxLength={32}
              placeholder={t('houses.ph.number')}
            />
            <TextField
              control={form.control}
              name='house_code'
              label={t('houses.f.code')}
              inputMode='numeric'
              maxLength={6}
              placeholder={t('houses.ph.code')}
            />
            <TextField
              control={form.control}
              name='zone_or_soi'
              label={t('houses.f.zone')}
              maxLength={64}
              placeholder={t('houses.ph.zone')}
            />
            <SelectField
              control={form.control}
              name='occupancy_status'
              label={t('col.occupancy_status')}
              items={(['OCCUPIED', 'VACANT'] as const).map((o) => ({
                label: t(`occ.${o}`),
                value: o,
              }))}
            />
            {occupancy === 'VACANT' && (
              <p className='-mt-2 text-xs text-warning'>
                {t('houses.vacantHint')}
              </p>
            )}
            {house && (
              <SelectField
                control={form.control}
                name='payment_status'
                label={t('houses.f.payment')}
                items={(['NORMAL', 'OVERDUE', 'OVERDUE_SEVERE'] as const).map(
                  (s) => ({ label: t(`status.${s}`), value: s })
                )}
              />
            )}
            <div className='space-y-2'>
              <p className='text-sm font-medium'>{t('houses.contacts')}</p>
              {contacts.fields.map((f, i) => (
                <div
                  key={f.id}
                  className='grid grid-cols-[1fr_1fr_auto] items-start gap-2 sm:grid-cols-[2fr_1.5fr_1.3fr_auto]'
                >
                  <TextField
                    control={form.control}
                    name={`contacts.${i}.full_name`}
                    label={t('col.full_name')}
                    maxLength={128}
                  />
                  <TextField
                    control={form.control}
                    name={`contacts.${i}.phone_number`}
                    label={t('col.phone_number')}
                    inputMode='tel'
                    maxLength={32}
                  />
                  <div className='col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto'>
                    <SelectField
                      control={form.control}
                      name={`contacts.${i}.role`}
                      label={t('houses.role')}
                      items={ROLES.map((r) => ({
                        label: t(`role.${r}`),
                        value: r,
                      }))}
                    />
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='mt-[1.375rem] text-destructive hover:text-destructive'
                    aria-label={t('common.remove')}
                    onClick={() => contacts.remove(i)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  contacts.append({
                    full_name: '',
                    phone_number: '',
                    role: contacts.fields.length ? 'RESIDENT' : 'OWNER',
                  })
                }
              >
                <Plus /> {t('houses.addContact')}
              </Button>
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type='submit'
            form='house-form'
            variant={house ? 'default' : 'success'}
            disabled={save.isPending}
          >
            {save.isPending && <Loader2 className='animate-spin' />}
            {t(house ? 'common.update' : 'common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Houses() {
  const t = useT()
  const queryClient = useQueryClient()
  const houses = useHouses()
  const [editing, setEditing] = useState<House | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [disabling, setDisabling] = useState<House | undefined>()
  const [accessFor, setAccessFor] = useState<string>()

  const { mutate: toggleActive, ...toggle } = useMutation({
    mutationFn: (h: House) =>
      api.patch(`/houses/${encodeURIComponent(h.house_id)}`, {
        is_active: !h.is_active,
      }),
    onSuccess: () => {
      setDisabling(undefined)
      queryClient.invalidateQueries({ queryKey: ['houses'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.update'))),
  })

  const columns = useMemo<ColumnDef<House>[]>(
    () => [
      {
        accessorKey: 'house_number',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('col.house_number')}
          />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.house_number}</span>
        ),
      },
      {
        id: 'contact',
        // All contacts' names and phones, so the search box finds any of them.
        accessorFn: (h) =>
          h.contacts
            .map((c) => `${c.full_name} ${c.phone_number ?? ''}`)
            .join(' '),
        header: t('col.contact'),
        cell: ({ row }) => {
          const [main, ...rest] = row.original.contacts
          if (!main) return <span className='text-muted-foreground'>-</span>
          return (
            <span className='flex items-center gap-1.5'>
              {main.full_name}
              {rest.length > 0 && (
                <Badge variant='secondary' className='px-1.5'>
                  +{rest.length}
                </Badge>
              )}
            </span>
          )
        },
      },
      {
        id: 'phone_number',
        accessorFn: (h) => h.contacts[0]?.phone_number ?? '',
        header: t('col.phone_number'),
        cell: ({ getValue }) => (getValue() as string) || '-',
      },
      {
        accessorKey: 'house_code',
        header: t('col.house_code'),
        cell: ({ row }) => (
          <span className='font-mono text-sm'>
            {row.original.house_code ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'zone_or_soi',
        header: t('col.zone_or_soi'),
        cell: ({ row }) => row.original.zone_or_soi ?? '-',
      },
      {
        accessorKey: 'payment_status',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('col.payment_status')}
          />
        ),
        cell: ({ row }) => (
          <Badge className={PAYMENT_CLASS[row.original.payment_status]}>
            {t(`status.${row.original.payment_status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'occupancy_status',
        header: t('col.occupancy_status'),
        cell: ({ row }) =>
          row.original.occupancy_status === 'VACANT' ? (
            <Badge className='bg-warning text-black'>{t('occ.VACANT')}</Badge>
          ) : (
            <Badge variant='secondary'>{t('occ.OCCUPIED')}</Badge>
          ),
      },
      {
        accessorKey: 'is_active',
        header: t('col.is_active'),
        cell: ({ row }) => <ActiveBadge active={!!row.original.is_active} />,
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>{t('common.actions')}</span>,
        enableHiding: false,
        cell: ({ row }) => {
          const h = row.original
          return (
            <div className='flex justify-end gap-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setAccessFor(h.house_id)}
              >
                <KeyRound /> {t('houses.access')}
              </Button>
              <Button
                variant='ghost'
                size='icon'
                aria-label={t('common.edit')}
                onClick={() => {
                  setEditing(h)
                  setFormOpen(true)
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                aria-label={t(h.is_active ? 'common.disable' : 'common.enable')}
                className={
                  h.is_active ? 'text-warning hover:text-warning' : undefined
                }
                onClick={() =>
                  h.is_active ? setDisabling(h) : toggleActive(h)
                }
              >
                <Power />
              </Button>
            </div>
          )
        },
      },
    ],
    [toggleActive, t]
  )

  return (
    <Page
      title={t('nav.houses')}
      icon={Home}
      description={t('houses.desc')}
      actions={
        <Button
          variant='success'
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus /> {t('houses.new')}
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={houses.data ?? []}
        isLoading={houses.isPending}
        error={
          houses.isError ? apiErrorMessage(houses.error, t('err.load')) : null
        }
        searchPlaceholder={t('houses.search')}
      />
      {/* Mounted only while open, so every open starts from fresh form values. */}
      {formOpen && (
        <HouseDialog house={editing} open onOpenChange={setFormOpen} />
      )}
      <AccessDialog
        houseId={accessFor}
        onOpenChange={(o) => !o && setAccessFor(undefined)}
      />
      <ConfirmDialog
        open={!!disabling}
        onOpenChange={(o) => !o && setDisabling(undefined)}
        title={t('houses.disableTitle')}
        desc={t('houses.disableDesc', { n: disabling?.house_number ?? '' })}
        confirmText={t('common.disable')}
        warning
        isLoading={toggle.isPending}
        handleConfirm={() => disabling && toggleActive(disabling)}
      />
    </Page>
  )
}
