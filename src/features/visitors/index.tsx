import { useMemo, useState } from 'react'
import { type z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Ban, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
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
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to create')),
  })

  // Guest Codes are prefixed with the house code, so houses without one cannot be picked.
  const houseItems = [
    { value: COMMON_AREA, label: 'Common area (no house)' },
    ...houses
      .filter((h) => h.is_active)
      .map((h) => ({
        value: h.house_id,
        label: h.house_code
          ? h.house_number
          : `${h.house_number} (no house code)`,
        disabled: !h.house_code,
      })),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New visitor</DialogTitle>
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
              label='House'
              items={houseItems}
            />
            <SelectField
              control={form.control}
              name='duration'
              label='Duration'
              required
              items={DURATIONS.map((d) => ({ label: d, value: d }))}
            />
            <TextField
              control={form.control}
              name='full_name'
              label='Name'
              maxLength={128}
            />
            <TextField
              control={form.control}
              name='phone_number'
              label='Phone Number'
              maxLength={32}
            />
            <TextField
              control={form.control}
              name='license_plate'
              label='License Plate (ANPR)'
              maxLength={32}
            />
            <TextField
              control={form.control}
              name='purpose'
              label='Purpose'
              maxLength={64}
              placeholder='e.g. delivery, guest'
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
                  <FormLabel>Issue Guest Code (QR / Keypad)</FormLabel>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='visitor-form' disabled={create.isPending}>
            {create.isPending && <Loader2 className='animate-spin' />}
            Create
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
  return (
    <Dialog open={!!created} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className='text-center sm:max-w-sm'
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className='text-center'>Visitor created</DialogTitle>
          <DialogDescription className='text-center'>
            Valid until {fmtUtc(created?.valid_until ?? null)}
          </DialogDescription>
        </DialogHeader>
        {created?.code && (
          <div>
            <p className='text-sm text-muted-foreground'>
              Guest Code (shown only once)
            </p>
            <p className='my-2 font-mono text-3xl font-bold'>{created.code}</p>
            <p className='text-xs text-muted-foreground'>
              Keypad: {keypadDigits(created.code)}
            </p>
          </div>
        )}
        <Button onClick={onClose} className='w-full'>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export function Visitors() {
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
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to revoke')),
  })

  const columns = useMemo<ColumnDef<Visitor>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Name' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.full_name ?? '-'}</span>
        ),
      },
      {
        id: 'house',
        accessorFn: (v) => v.house_number ?? 'Common area',
        header: 'House',
      },
      {
        accessorKey: 'license_plate',
        header: 'Plate',
        cell: ({ row }) => (
          <span className='font-mono text-sm'>
            {row.original.license_plate ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'purpose',
        header: 'Purpose',
        cell: ({ row }) => row.original.purpose ?? '-',
      },
      {
        accessorKey: 'valid_until',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Valid Until' />
        ),
        cell: ({ row }) => fmtUtc(row.original.valid_until),
      },
      {
        accessorKey: 'issued_by_type',
        header: 'Issued By',
        cell: ({ row }) => row.original.issued_by_type ?? '-',
      },
      {
        id: 'status',
        accessorFn: visitorStatus,
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue() as ReturnType<typeof visitorStatus>
          return <Badge className={STATUS_CLASS[s]}>{s}</Badge>
        },
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Actions</span>,
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
                <Ban /> Revoke
              </Button>
            </div>
          ),
      },
    ],
    []
  )

  return (
    <Page
      title='Visitors'
      description='Visitor passes and one-time Guest Codes.'
      actions={
        <>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='valid-only'
              checked={validOnly}
              onCheckedChange={(c) => setValidOnly(c === true)}
            />
            <Label htmlFor='valid-only'>Valid only</Label>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> New Visitor
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
            ? apiErrorMessage(visitors.error, 'Failed to load')
            : null
        }
        searchPlaceholder='Search visitors...'
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
        title='Revoke this visitor?'
        desc='The visitor pass and its Guest Code will stop working.'
        confirmText='Revoke'
        destructive
        isLoading={revoke.isPending}
        handleConfirm={() => revoking && revoke.mutate(revoking)}
      />
    </Page>
  )
}
