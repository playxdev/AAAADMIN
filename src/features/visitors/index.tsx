import { useMemo, useState } from 'react'
import { type z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Ban,
  CircleCheck,
  Loader2,
  Pencil,
  Plus,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { type TKey, useT } from '@/lib/i18n'
import type { House, Visitor, VisitorCreated } from '@/lib/types'
import { digitsOnly, fmtUtc, plateCategoryChars } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { SelectField, TextField } from '@/components/form-fields'
import { Page } from '@/components/layout/page'
import { formatPlate } from '@/features/houses/access-data'
import { useColorItems } from '@/features/houses/components/color-items'
import { useHouses } from '@/features/houses/data'
import { BRANDS, PROVINCES } from '@/features/houses/vehicle-options'
import {
  COMMON_AREA,
  DURATIONS,
  keypadDigits,
  splitPlate,
  toVisitorEditPayload,
  toVisitorPayload,
  useVisitors,
  visitorSchema,
  visitorStatus,
} from './data'

const STATUS_CLASS = {
  VALID: 'bg-emerald-600 text-white',
  EXPIRED: 'bg-amber-500 text-white',
  REVOKED: 'bg-destructive text-white',
}

type FormValues = z.input<typeof visitorSchema>

/** New visitor, or edit one (visitor set): editing keeps house, validity and Guest Code. */
function VisitorDialog({
  houses,
  visitor,
  open,
  onOpenChange,
  onCreated,
}: {
  houses: House[]
  visitor?: Visitor
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (r: VisitorCreated) => void
}) {
  const t = useT()
  const colorItems = useColorItems()
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      house_id: visitor?.house_id ?? COMMON_AREA,
      duration: '1d',
      full_name: visitor?.full_name ?? '',
      phone_number: visitor?.phone_number ?? '',
      plate_prefix: splitPlate(visitor?.license_plate ?? null)[0],
      plate_number: splitPlate(visitor?.license_plate ?? null)[1],
      province: visitor?.province ?? '',
      brand: visitor?.brand ?? '',
      color: visitor?.color ?? '',
      purpose: visitor?.purpose ?? '',
      issue_code: !visitor,
      status: visitor?.id_status === 'REVOKED' ? 'REVOKED' : 'ACTIVE',
    },
  })
  const create = useMutation({
    mutationFn: (v: FormValues) =>
      visitor
        ? api
            .patch(
              `/visitors/${encodeURIComponent(visitor.visitor_id)}`,
              toVisitorEditPayload(v)
            )
            .then(() => undefined)
        : api
            .post<VisitorCreated>('/visitors', toVisitorPayload(v))
            .then((r) => r.data),
    onSuccess: (r) => {
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
      if (r) onCreated(r)
      else toast.success(t('vis.updated'))
    },
    onError: (e) =>
      toast.error(apiErrorMessage(e, t(visitor ? 'err.save' : 'err.create'))),
  })

  // Guest Codes are prefixed with the house code, so houses without one cannot be picked.
  const houseItems = [
    { value: COMMON_AREA, label: t('vis.commonAreaOpt') },
    ...houses
      .filter((h) => h.is_active)
      .map((h) => ({
        value: h.house_id,
        label: h.house_code
          ? h.house_number
          : t('vis.noHouseCode', { n: h.house_number }),
        disabled: !h.house_code,
      })),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserCheck className='size-5' />
            {t(visitor ? 'vis.editTitle' : 'vis.newTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='visitor-form'
            onSubmit={form.handleSubmit((v) => create.mutate(v))}
            className='space-y-4'
          >
            {visitor && (
              <SelectField
                control={form.control}
                name='status'
                label={t('col.status')}
                items={[
                  {
                    value: 'ACTIVE',
                    label: (
                      <span className='flex items-center gap-2'>
                        <CircleCheck className='size-4 text-success' />
                        {t('vis.statusActive')}
                      </span>
                    ),
                  },
                  {
                    value: 'REVOKED',
                    label: (
                      <span className='flex items-center gap-2'>
                        <Ban className='size-4 text-destructive' />
                        {t('status.REVOKED')}
                      </span>
                    ),
                  },
                ]}
              />
            )}
            {!visitor && (
              <>
                <SelectField
                  control={form.control}
                  name='house_id'
                  label={t('col.house')}
                  items={houseItems}
                />
                <SelectField
                  control={form.control}
                  name='duration'
                  label={t('vis.duration')}
                  required
                  items={DURATIONS.map((d) => ({
                    label: t(`dur.${d}`),
                    value: d,
                  }))}
                />
              </>
            )}
            <TextField
              control={form.control}
              name='full_name'
              label={t('vis.name')}
              maxLength={128}
            />
            <TextField
              control={form.control}
              name='phone_number'
              label={t('col.phone_number')}
              maxLength={32}
            />
            <div className='space-y-2'>
              <p className='text-sm font-medium'>{t('vis.plate')}</p>
              {/* Same layout as a house vehicle (Access dialog). */}
              <div className='grid grid-cols-2 items-start gap-2 md:grid-cols-6'>
                <TextField
                  control={form.control}
                  name='plate_prefix'
                  transform={plateCategoryChars}
                  label={t('acc.platePrefix')}
                  maxLength={4}
                  placeholder={t('acc.ph.platePrefix')}
                />
                <TextField
                  control={form.control}
                  name='plate_number'
                  transform={digitsOnly}
                  label={t('acc.plateNumber')}
                  inputMode='numeric'
                  maxLength={4}
                  placeholder='1234'
                />
                <div className='md:col-span-2'>
                  <TextField
                    control={form.control}
                    name='province'
                    label={t('acc.province')}
                    maxLength={64}
                    list='visitor-provinces'
                    autoComplete='aaa-no-autofill'
                  />
                </div>
                <TextField
                  control={form.control}
                  name='brand'
                  label={t('acc.brand')}
                  maxLength={64}
                  list='visitor-brands'
                  autoComplete='aaa-no-autofill'
                />
                <SelectField
                  control={form.control}
                  name='color'
                  label={t('acc.color')}
                  items={colorItems}
                />
              </div>
              <datalist id='visitor-provinces'>
                {PROVINCES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <datalist id='visitor-brands'>
                {BRANDS.map(([value, th]) => (
                  <option key={value} value={value} label={th} />
                ))}
              </datalist>
            </div>
            <TextField
              control={form.control}
              name='purpose'
              label={t('col.purpose')}
              maxLength={64}
              placeholder={t('vis.ph.purpose')}
            />
            {!visitor && (
              <FormField
                control={form.control}
                name='issue_code'
                render={({ field }) => (
                  <FormItem className='flex items-center gap-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                    </FormControl>
                    <FormLabel>{t('vis.issueCode')}</FormLabel>
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type='submit'
            form='visitor-form'
            variant={visitor ? 'default' : 'success'}
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 className='animate-spin' />}
            {t(visitor ? 'common.update' : 'common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The API returns the Guest Code only once (the DB stores a hash), so the admin must note it now. */
function CreatedDialog({
  created,
  onClose,
}: {
  created?: VisitorCreated
  onClose: () => void
}) {
  const t = useT()
  return (
    <Dialog open={!!created} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className='text-center sm:max-w-sm'
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center justify-center gap-2'>
            <CircleCheck className='size-5 text-emerald-600' />
            {t('vis.created')}
          </DialogTitle>
          <DialogDescription className='text-center'>
            {t('vis.validUntil', { d: fmtUtc(created?.valid_until ?? null) })}
          </DialogDescription>
        </DialogHeader>
        {created?.code && (
          <div>
            <p className='text-sm text-muted-foreground'>{t('vis.codeOnce')}</p>
            <p className='my-2 flex items-center justify-center gap-2 font-mono text-3xl font-bold'>
              {created.code}
              <CopyButton value={created.code} />
            </p>
            <p className='text-xs text-muted-foreground'>
              {t('vis.keypad', { d: keypadDigits(created.code) })}
            </p>
          </div>
        )}
        <Button variant='info' onClick={onClose} className='w-full'>
          {t('common.done')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export function Visitors() {
  const t = useT()
  const queryClient = useQueryClient()
  const [validOnly, setValidOnly] = useState(true)
  const visitors = useVisitors(validOnly)
  const houses = useHouses()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Visitor>()
  const [created, setCreated] = useState<VisitorCreated>()
  const [revoking, setRevoking] = useState<Visitor>()

  const revoke = useMutation({
    mutationFn: (v: Visitor) =>
      api.delete(`/visitors/${encodeURIComponent(v.visitor_id)}`),
    onSuccess: () => {
      setRevoking(undefined)
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.revoke'))),
  })

  const columns = useMemo<ColumnDef<Visitor>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('col.full_name')} />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.full_name ?? '-'}</span>
        ),
      },
      {
        id: 'house',
        accessorFn: (v) => v.house_number ?? t('common.commonArea'),
        header: t('col.house'),
      },
      {
        accessorKey: 'license_plate',
        header: t('col.license_plate'),
        cell: ({ row }) => (
          <span className='flex flex-col'>
            <span className='font-mono text-sm'>
              {row.original.license_plate
                ? formatPlate(row.original.license_plate)
                : '-'}
            </span>
            {row.original.license_plate && (
              <span className='text-xs text-muted-foreground'>
                {[
                  row.original.province,
                  row.original.brand,
                  row.original.color &&
                    t(`color.${row.original.color}` as TKey),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'purpose',
        header: t('col.purpose'),
        cell: ({ row }) => row.original.purpose ?? '-',
      },
      {
        accessorKey: 'valid_until',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('col.valid_until')} />
        ),
        cell: ({ row }) => fmtUtc(row.original.valid_until),
      },
      {
        accessorKey: 'issued_by_type',
        header: t('col.issued_by_type'),
        cell: ({ row }) => row.original.issued_by_type ?? '-',
      },
      {
        id: 'status',
        accessorFn: visitorStatus,
        header: t('col.status'),
        cell: ({ getValue }) => {
          const s = getValue() as ReturnType<typeof visitorStatus>
          return <Badge className={STATUS_CLASS[s]}>{t(`status.${s}`)}</Badge>
        },
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>{t('common.actions')}</span>,
        enableHiding: false,
        // Every record can be edited (also revoked / expired ones); only active ones can be revoked.
        cell: ({ row }) => (
          <div className='flex justify-end gap-1'>
            <Button
              variant='ghost'
              size='icon'
              aria-label={t('common.edit')}
              onClick={() => setEditing(row.original)}
            >
              <Pencil />
            </Button>
            {row.original.id_status !== 'REVOKED' && (
              <Button
                variant='ghost'
                size='sm'
                className='text-destructive hover:text-destructive'
                onClick={() => setRevoking(row.original)}
              >
                <Ban /> {t('common.revoke')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t]
  )

  return (
    <Page
      title={t('nav.visitors')}
      icon={UserCheck}
      description={t('vis.desc')}
      actions={
        <>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='valid-only'
              checked={validOnly}
              onCheckedChange={(c) => setValidOnly(c === true)}
            />
            <Label htmlFor='valid-only'>{t('vis.validOnly')}</Label>
          </div>
          <Button variant='success' onClick={() => setFormOpen(true)}>
            <Plus /> {t('vis.new')}
          </Button>
        </>
      }
    >
      <DataTable
        columns={columns}
        data={visitors.data ?? []}
        isLoading={visitors.isPending}
        error={
          visitors.isError
            ? apiErrorMessage(visitors.error, t('err.load'))
            : null
        }
        searchPlaceholder={t('vis.search')}
      />
      {formOpen && (
        <VisitorDialog
          houses={houses.data ?? []}
          open
          onOpenChange={setFormOpen}
          onCreated={setCreated}
        />
      )}
      {editing && (
        <VisitorDialog
          houses={houses.data ?? []}
          visitor={editing}
          open
          onOpenChange={(o) => !o && setEditing(undefined)}
          onCreated={setCreated}
        />
      )}
      <CreatedDialog created={created} onClose={() => setCreated(undefined)} />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(undefined)}
        title={t('vis.revokeTitle')}
        desc={t('vis.revokeDesc')}
        confirmText={t('common.revoke')}
        destructive
        isLoading={revoke.isPending}
        handleConfirm={() => revoking && revoke.mutate(revoking)}
      />
    </Page>
  )
}
