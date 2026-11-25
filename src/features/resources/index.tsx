import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import type { ListResponse } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { ResourceFormDialog } from './components/resource-form-dialog'
import { type ResourceConfig, type Row, toPayload } from './config'

function resourceColumns(
  config: ResourceConfig,
  actions?: { onEdit: (row: Row) => void; onDelete: (row: Row) => void }
): ColumnDef<Row>[] {
  const cols: ColumnDef<Row>[] = config.columns.map((c) => ({
    accessorKey: c.key,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={c.label} />
    ),
    cell: ({ getValue }) => {
      const v = getValue() as string | null | undefined
      if (v == null || v === '')
        return <span className='text-muted-foreground'>-</span>
      if (c.badge) return <Badge variant='secondary'>{v}</Badge>
      return (
        <span className={c.mono ? 'font-mono text-sm' : undefined}>{v}</span>
      )
    },
  }))
  if (actions)
    cols.push({
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => (
        <div className='flex justify-end gap-1'>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Edit'
            onClick={() => actions.onEdit(row.original)}
          >
            <Pencil />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Delete'
            className='text-destructive hover:text-destructive'
            onClick={() => actions.onDelete(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
      enableHiding: false,
    })
  return cols
}

export function ResourcePage({ config }: { config: ResourceConfig }) {
  const queryClient = useQueryClient()
  const queryKey = [config.endpoint]
  const [editing, setEditing] = useState<Row | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Row | undefined>()

  const list = useQuery({
    queryKey,
    queryFn: () =>
      api.get<ListResponse<Row>>(config.endpoint).then((r) => r.data),
  })

  const save = useMutation({
    mutationFn: (values: Record<string, string>) => {
      const payload = toPayload(config.fields, values)
      return editing
        ? api.put(`${config.endpoint}/${editing[config.idKey]}`, payload)
        : api.post(config.endpoint, payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Updated' : 'Created')
      setFormOpen(false)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to save')),
  })

  const remove = useMutation({
    mutationFn: (row: Row) =>
      api.delete(`${config.endpoint}/${row[config.idKey]}`),
    onSuccess: () => {
      toast.success('Deleted')
      setDeleting(undefined)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to delete')),
  })

  const columns = useMemo(
    () =>
      resourceColumns(config, {
        onEdit: (row) => {
          setEditing(row)
          setFormOpen(true)
        },
        onDelete: setDeleting,
      }),
    [config]
  )

  return (
    <>
      <AppHeader />
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {config.title}
            </h2>
            <p className='text-muted-foreground'>{config.description}</p>
          </div>
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> New
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={list.data?.data ?? []}
          isLoading={list.isPending}
          error={
            list.isError ? apiErrorMessage(list.error, 'Failed to load') : null
          }
          searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
        />
      </Main>

      <ResourceFormDialog
        config={config}
        currentRow={editing}
        open={formOpen}
        isSaving={save.isPending}
        onOpenChange={setFormOpen}
        onSubmit={(values) => save.mutate(values)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${config.title.replace(/s$/, '').toLowerCase()}?`}
        desc={`"${String(deleting?.[config.idKey] ?? '')}" will be deleted. This cannot be undone.`}
        confirmText='Delete'
        destructive
        isLoading={remove.isPending}
        handleConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
