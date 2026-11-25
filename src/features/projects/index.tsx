import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Building2, Dices, Loader2, Plus, Power, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { api, apiErrorMessage } from '@/lib/api'
import { k, useT } from '@/lib/i18n'
import type { AdminAccount, Project } from '@/lib/types'
import { normalizeProjectCode } from '@/lib/utils'
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
import { CopyButton } from '@/components/copy-button'
import { DataTable } from '@/components/data-table'
import { SelectField, TextField } from '@/components/form-fields'
import { Page } from '@/components/layout/page'
import { ActiveBadge } from '@/features/shared'
import { useProjects } from './data'

const codeField = z
  .string()
  .refine((v) => normalizeProjectCode(v) !== null, k('v.projectCode'))

const projectSchema = z.object({
  project_code: codeField,
  project_name: z.string().trim().min(1, k('v.projectName')).max(128),
})

const adminSchema = z.object({
  project_code: codeField,
  admin_name: z.string().trim().min(1, k('v.adminName')).max(128),
  password: z.string().min(12, k('v.password12')).max(256),
})

// 16 chars without look-alikes; the root copies it once and hands it over.
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const randomPassword = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (b) => PW_ALPHABET[b % PW_ALPHABET.length]
  ).join('')

function ProjectDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const queryClient = useQueryClient()
  const form = useForm<z.input<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { project_code: '', project_name: '' },
  })
  const save = useMutation({
    mutationFn: (v: z.input<typeof projectSchema>) =>
      api.post('/projects', {
        project_code: normalizeProjectCode(v.project_code),
        project_name: v.project_name.trim(),
      }),
    onSuccess: () => {
      toast.success(t('proj.created'))
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.save'))),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Building2 className='size-5' /> {t('proj.new')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='project-form'
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
            className='space-y-4'
          >
            <TextField
              control={form.control}
              name='project_code'
              label={t('auth.projectCode')}
              required
              maxLength={10}
              className='font-mono uppercase'
              placeholder={t('auth.projectCodePh')}
            />
            <TextField
              control={form.control}
              name='project_name'
              label={t('proj.name')}
              required
              maxLength={128}
              placeholder={t('proj.ph.name')}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type='submit'
            form='project-form'
            variant='success'
            disabled={save.isPending}
          >
            {save.isPending && <Loader2 className='animate-spin' />}
            {t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AdminDialog({
  projects,
  onClose,
}: {
  projects: Project[]
  onClose: () => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const [created, setCreated] = useState<{
    code: string
    name: string
    password: string
  }>()
  const form = useForm<z.input<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      project_code: '',
      admin_name: 'admin',
      password: randomPassword(),
    },
  })
  const save = useMutation({
    mutationFn: (v: z.input<typeof adminSchema>) =>
      api.post('/admins', { ...v, admin_name: v.admin_name.trim() }),
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      // The password is shown once so it can be handed to the new admin.
      setCreated({
        code: v.project_code,
        name: v.admin_name.trim(),
        password: v.password,
      })
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.save'))),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserCog className='size-5' /> {t('proj.newAdmin')}
          </DialogTitle>
        </DialogHeader>
        {created ? (
          <div className='space-y-2 text-sm' role='status'>
            <p>{t('proj.adminCreated')}</p>
            {[
              [t('auth.projectCode'), created.code],
              [t('auth.name'), created.name],
              [t('auth.password'), created.password],
            ].map(([label, value]) => (
              <p key={label} className='flex items-center gap-2'>
                <span className='w-28 text-muted-foreground'>{label}</span>
                <span className='font-mono'>{value}</span>
                <CopyButton value={value} />
              </p>
            ))}
            <p className='text-xs text-muted-foreground'>
              {t('acc.shownOnce')}
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              id='admin-form'
              onSubmit={form.handleSubmit((v) => save.mutate(v))}
              className='space-y-4'
            >
              <SelectField
                control={form.control}
                name='project_code'
                label={t('proj.project')}
                required
                items={projects.map((p) => ({
                  value: p.project_code,
                  label: `${p.project_code} · ${p.project_name}`,
                }))}
              />
              <TextField
                control={form.control}
                name='admin_name'
                label={t('auth.name')}
                required
                maxLength={128}
              />
              <div className='flex items-start gap-1'>
                <div className='flex-1'>
                  <TextField
                    control={form.control}
                    name='password'
                    label={t('auth.password')}
                    required
                    className='font-mono'
                    maxLength={256}
                  />
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='mt-[1.375rem]'
                  aria-label={t('proj.randomPassword')}
                  title={t('proj.randomPassword')}
                  onClick={() => form.setValue('password', randomPassword())}
                >
                  <Dices />
                </Button>
              </div>
            </form>
          </Form>
        )}
        <DialogFooter>
          {created ? (
            <Button variant='info' onClick={onClose}>
              {t('common.done')}
            </Button>
          ) : (
            <>
              <Button variant='outline' onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type='submit'
                form='admin-form'
                variant='success'
                disabled={save.isPending}
              >
                {save.isPending && <Loader2 className='animate-spin' />}
                {t('common.create')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Root only: projects (village / condo / building / site) and their admins. */
export function Projects() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAsProject = useAuthStore((s) => s.auth.setAsProject)
  const projects = useProjects()
  const admins = useQuery({
    queryKey: ['admins'],
    queryFn: () =>
      api.get<{ admins: AdminAccount[] }>('/admins').then((r) => r.data.admins),
  })
  const [dialog, setDialog] = useState<'project' | 'admin'>()
  const [disabling, setDisabling] = useState<AdminAccount>()

  const disable = useMutation({
    mutationFn: (a: AdminAccount) =>
      api.delete(`/admins/${encodeURIComponent(a.admin_id)}`),
    onSuccess: () => {
      setDisabling(undefined)
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.disable'))),
  })

  const projectColumns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: 'project_code',
        header: t('auth.projectCode'),
        cell: ({ row }) => (
          <span className='font-mono font-medium'>
            {row.original.project_code}
          </span>
        ),
      },
      { accessorKey: 'project_name', header: t('proj.name') },
      { accessorKey: 'houses', header: t('nav.houses') },
      { accessorKey: 'admins', header: t('proj.admins') },
      {
        id: 'actions',
        header: () => <span className='sr-only'>{t('common.actions')}</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                // Every query refetches for the chosen project.
                setAsProject(row.original.project_code)
                queryClient.resetQueries()
                navigate({ to: '/houses' })
              }}
            >
              {t('proj.manage')}
            </Button>
          </div>
        ),
      },
    ],
    [t, setAsProject, queryClient, navigate]
  )

  const adminColumns = useMemo<ColumnDef<AdminAccount>[]>(
    () => [
      {
        accessorKey: 'ref',
        header: 'Ref',
        cell: ({ row }) => (
          <span className='font-mono text-sm'>{row.original.ref ?? '-'}</span>
        ),
      },
      { accessorKey: 'admin_name', header: t('auth.name') },
      {
        id: 'project',
        accessorFn: (a) => `${a.project_code} ${a.project_name}`,
        header: t('proj.project'),
      },
      {
        accessorKey: 'admin_level',
        header: t('proj.level'),
        cell: ({ row }) => (
          <Badge variant='secondary'>{row.original.admin_level}</Badge>
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
        cell: ({ row }) =>
          row.original.admin_level === 'ADMIN' &&
          !!row.original.is_active && (
            <div className='flex justify-end'>
              <Button
                variant='ghost'
                size='icon'
                aria-label={t('common.disable')}
                className='text-warning hover:text-warning'
                onClick={() => setDisabling(row.original)}
              >
                <Power />
              </Button>
            </div>
          ),
      },
    ],
    [t]
  )

  return (
    <Page
      title={t('nav.projects')}
      icon={Building2}
      description={t('proj.desc')}
      actions={
        <>
          <Button variant='outline' onClick={() => setDialog('admin')}>
            <UserCog /> {t('proj.newAdmin')}
          </Button>
          <Button variant='success' onClick={() => setDialog('project')}>
            <Plus /> {t('proj.new')}
          </Button>
        </>
      }
    >
      <DataTable
        columns={projectColumns}
        data={projects.data ?? []}
        isLoading={projects.isPending}
        error={
          projects.isError
            ? apiErrorMessage(projects.error, t('err.load'))
            : null
        }
        searchPlaceholder={t('proj.search')}
      />
      <h3 className='flex items-center gap-2 text-lg font-semibold'>
        <UserCog className='size-5' /> {t('proj.admins')}
      </h3>
      <DataTable
        columns={adminColumns}
        data={admins.data ?? []}
        isLoading={admins.isPending}
        error={
          admins.isError ? apiErrorMessage(admins.error, t('err.load')) : null
        }
        searchPlaceholder={t('proj.searchAdmins')}
      />
      {dialog === 'project' && (
        <ProjectDialog onClose={() => setDialog(undefined)} />
      )}
      {dialog === 'admin' && (
        <AdminDialog
          projects={projects.data ?? []}
          onClose={() => setDialog(undefined)}
        />
      )}
      <ConfirmDialog
        open={!!disabling}
        onOpenChange={(o) => !o && setDisabling(undefined)}
        title={t('proj.disableAdmin')}
        desc={
          disabling ? `${disabling.admin_name} · ${disabling.project_code}` : ''
        }
        confirmText={t('common.disable')}
        warning
        isLoading={disable.isPending}
        handleConfirm={() => disabling && disable.mutate(disabling)}
      />
    </Page>
  )
}
