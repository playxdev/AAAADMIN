import { useMemo, useState } from 'react'
import { type z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Ban, CircleCheck, Loader2, Plus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { House, Visitor, VisitorCreated } from '@/lib/types'
import { fmtUtc } from '@/lib/utils'
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
import { useHouses } from '@/features/houses/data'
import {
  COMMON_AREA,
  DURATIONS,
  keypadDigits,
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

function NewVisitorDialog({
  houses,
  open,
  onOpenChange,
  onCreated,
}: {
  houses: House[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (r: VisitorCreated) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      house_id: COMMON_AREA,
      duration: '1d',
      full_name: '',
      phone_number: '',
      license_plate: '',
      purpose: '',
      issue_code: true,
    },
  })
  const create = useMutation({
    mutationFn: (v: FormValues) =>
      api
        .post<VisitorCreated>('/visitors', toVisitorPayload(v))
        .then((r) => r.data),
    onSuccess: (r) => {
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
      onCreated(r)
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.create'))),
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
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserCheck className='size-5' />
            {t('vis.newTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='visitor-form'
            onSubmit={form.handleSubmit((v) => create.mutate(v))}
            className='space-y-4'
          >
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
              items={DURATIONS.map((d) => ({ label: t(`dur.${d}`), value: d }))}
            />
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
            <TextField
              control={form.control}
              name='license_plate'
              label={t('vis.plate')}
              maxLength={32}
            />
            <TextField
              control={form.control}
              name='purpose'
              label={t('col.purpose')}
              maxLength={64}
              placeholder={t('vis.ph.purpose')}
            />
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
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type='submit'
            form='visitor-form'
            variant='success'
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 className='animate-spin' />}
            {t('common.create')}
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
          <span className='font-mono text-sm'>
            {row.original.license_plate ?? '-'}
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
        cell: ({ row }) =>
          row.original.id_status !== 'REVOKED' && (
            <div className='flex justify-end'>
              <Button
                variant='ghost'
                size='sm'
                className='text-destructive hover:text-destructive'
                onClick={() => setRevoking(row.original)}
              >
                <Ban /> {t('common.revoke')}
              </Button>
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
        <NewVisitorDialog
          houses={houses.data ?? []}
          open
          onOpenChange={setFormOpen}
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
