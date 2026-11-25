import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { KeyRound, Pencil, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import type { Resident } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Page } from '@/components/layout/page'
import { useHouses } from '@/features/houses/data'
import { ActiveBadge } from '@/features/shared'
import { AccessDialog } from './components/access-dialog'
import { ResidentDialog } from './components/resident-dialog'
import { useResidents } from './data'

export function Residents() {
  const queryClient = useQueryClient()
  const residents = useResidents()
  const houses = useHouses()
  const [editing, setEditing] = useState<Resident>()
  const [formOpen, setFormOpen] = useState(false)
  const [accessFor, setAccessFor] = useState<Resident>()
  const [disabling, setDisabling] = useState<Resident>()

  const houseLabel = useMemo(() => {
    const byId = new Map(
      (houses.data ?? []).map((h) => [h.house_id, h.house_number])
    )
    return (id: string | null) => (id && byId.get(id)) || '-'
  }, [houses.data])

  const deactivate = useMutation({
    mutationFn: (r: Resident) =>
      api.delete(`/residents/${encodeURIComponent(r.user_id)}`),
    onSuccess: () => {
      setDisabling(undefined)
      queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to disable')),
  })

  const columns = useMemo<ColumnDef<Resident>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Full Name' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.full_name}</span>
        ),
      },
      {
        id: 'house',
        accessorFn: (r) => houseLabel(r.house_id),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='House' />
        ),
      },
      {
        accessorKey: 'phone_number',
        header: 'Phone',
        cell: ({ row }) => row.original.phone_number ?? '-',
      },
      {
        accessorKey: 'line_id',
        header: 'Line ID',
        cell: ({ row }) => row.original.line_id ?? '-',
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
          const r = row.original
          return (
            <div className='flex justify-end gap-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setAccessFor(r)}
              >
                <KeyRound /> Access
              </Button>
              <Button
                variant='ghost'
                size='icon'
                aria-label='Edit'
                onClick={() => {
                  setEditing(r)
                  setFormOpen(true)
                }}
              >
                <Pencil />
              </Button>
              {!!r.is_active && (
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Disable'
                  className='text-destructive hover:text-destructive'
                  onClick={() => setDisabling(r)}
                >
                  <Power />
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [houseLabel]
  )

  return (
    <Page
      title='Residents'
      description='Residents and their access methods: plates, RFID / QR / PIN, LINE.'
      actions={
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus /> New Resident
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={residents.data ?? []}
        isLoading={residents.isPending}
        error={
          residents.isError
            ? apiErrorMessage(residents.error, 'Failed to load')
            : null
        }
        searchPlaceholder='Search residents...'
      />
      {formOpen && (
        <ResidentDialog
          resident={editing}
          houses={houses.data ?? []}
          open
          onOpenChange={setFormOpen}
        />
      )}
      <AccessDialog
        residentId={accessFor?.user_id}
        houseLabel={houseLabel(accessFor?.house_id ?? null)}
        onOpenChange={(o) => !o && setAccessFor(undefined)}
      />
      <ConfirmDialog
        open={!!disabling}
        onOpenChange={(o) => !o && setDisabling(undefined)}
        title='Disable this resident?'
        desc='All of their access methods will stop working.'
        confirmText='Disable'
        destructive
        isLoading={deactivate.isPending}
        handleConfirm={() => disabling && deactivate.mutate(disabling)}
      />
    </Page>
  )
}
