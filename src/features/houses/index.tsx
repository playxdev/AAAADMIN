import { useMemo, useState } from 'react'
import { type z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Loader2, Pencil, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import type { House, PaymentStatus } from '@/lib/types'
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
import { houseSchema, toHousePayload, useHouses } from './data'

const PAYMENT_CLASS: Record<PaymentStatus, string> = {
  NORMAL: 'bg-emerald-600 text-white',
  OVERDUE: 'bg-amber-500 text-white',
  OVERDUE_SEVERE: 'bg-destructive text-white',
}

type FormValues = z.input<typeof houseSchema>

function HouseDialog({
  house,
  open,
  onOpenChange,
}: {
  house?: House
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(houseSchema),
    values: {
      house_number: house?.house_number ?? '',
      house_code: house?.house_code ?? '',
      zone_or_soi: house?.zone_or_soi ?? '',
      payment_status: house?.payment_status ?? 'NORMAL',
    },
  })
  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = toHousePayload(v, !!house)
      return house
        ? api.patch(`/houses/${encodeURIComponent(house.house_id)}`, payload)
        : api.post('/houses', payload)
    },
    onSuccess: () => {
      toast.success(house ? 'House updated' : 'House created')
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['houses'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to save')),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{house ? 'Edit house' : 'New house'}</DialogTitle>
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
              label='House Number'
              required
              maxLength={32}
              placeholder='e.g. 123/45'
            />
            <TextField
              control={form.control}
              name='house_code'
              label='House Code (Guest Code prefix)'
              inputMode='numeric'
              maxLength={6}
              placeholder='e.g. 9801'
            />
            <TextField
              control={form.control}
              name='zone_or_soi'
              label='Zone / Soi'
              maxLength={64}
              placeholder='e.g. Soi 1'
            />
            {house && (
              <SelectField
                control={form.control}
                name='payment_status'
                label='Payment Status'
                items={['NORMAL', 'OVERDUE', 'OVERDUE_SEVERE'].map((s) => ({
                  label: s,
                  value: s,
                }))}
              />
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='house-form' disabled={save.isPending}>
            {save.isPending && <Loader2 className='animate-spin' />}
            {house ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Houses() {
  const queryClient = useQueryClient()
  const houses = useHouses()
  const [editing, setEditing] = useState<House | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [disabling, setDisabling] = useState<House | undefined>()

  const { mutate: toggleActive, ...toggle } = useMutation({
    mutationFn: (h: House) =>
      api.patch(`/houses/${encodeURIComponent(h.house_id)}`, {
        is_active: !h.is_active,
      }),
    onSuccess: () => {
      setDisabling(undefined)
      queryClient.invalidateQueries({ queryKey: ['houses'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to update')),
  })

  const columns = useMemo<ColumnDef<House>[]>(
    () => [
      {
        accessorKey: 'house_number',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='House Number' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.house_number}</span>
        ),
      },
      {
        accessorKey: 'house_code',
        header: 'House Code',
        cell: ({ row }) => (
          <span className='font-mono text-sm'>
            {row.original.house_code ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'zone_or_soi',
        header: 'Zone/Soi',
        cell: ({ row }) => row.original.zone_or_soi ?? '-',
      },
      {
        accessorKey: 'payment_status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Payment' />
        ),
        cell: ({ row }) => (
          <Badge className={PAYMENT_CLASS[row.original.payment_status]}>
            {row.original.payment_status}
          </Badge>
        ),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => <ActiveBadge active={!!row.original.is_active} />,
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Actions</span>,
        enableHiding: false,
        cell: ({ row }) => {
          const h = row.original
          return (
            <div className='flex justify-end gap-1'>
              <Button
                variant='ghost'
                size='icon'
                aria-label='Edit'
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
                aria-label={h.is_active ? 'Disable' : 'Enable'}
                className={
                  h.is_active
                    ? 'text-destructive hover:text-destructive'
                    : undefined
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
    [toggleActive]
  )

  return (
    <Page
      title='Houses'
      description='House numbers, Guest Code prefixes and payment status.'
      actions={
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus /> New House
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={houses.data ?? []}
        isLoading={houses.isPending}
        error={
          houses.isError
            ? apiErrorMessage(houses.error, 'Failed to load')
            : null
        }
        searchPlaceholder='Search houses...'
      />
      {/* Mounted only while open, so every open starts from fresh form values. */}
      {formOpen && (
        <HouseDialog house={editing} open onOpenChange={setFormOpen} />
      )}
      <ConfirmDialog
        open={!!disabling}
        onOpenChange={(o) => !o && setDisabling(undefined)}
        title='Disable this house?'
        desc={`House ${disabling?.house_number ?? ''} will be disabled.`}
        confirmText='Disable'
        destructive
        isLoading={toggle.isPending}
        handleConfirm={() => disabling && toggleActive(disabling)}
      />
    </Page>
  )
}
