import { useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useT } from '@/lib/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/features/projects/data'

/** Root only: which project the pages work on (sent as X-Project-Code). */
export function ProjectSwitch() {
  const t = useT()
  const queryClient = useQueryClient()
  const { user, asProject, setAsProject } = useAuthStore((s) => s.auth)
  const isRoot = user?.level === 'ROOT'
  const projects = useProjects(isRoot)
  if (!isRoot) return null
  const own = user.projectCode ?? ''
  return (
    <Select
      value={asProject || own}
      onValueChange={(code) => {
        setAsProject(code === own ? '' : code)
        // Every page refetches for the chosen project.
        queryClient.resetQueries()
      }}
    >
      <SelectTrigger
        size='sm'
        className='h-8 max-w-56 gap-1.5'
        aria-label={t('proj.switch')}
      >
        <Building2 className='size-4 text-muted-foreground' />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align='end'>
        {(projects.data ?? []).map((p) => (
          <SelectItem key={p.project_code} value={p.project_code}>
            <span className='font-mono'>{p.project_code}</span>
            <span className='text-muted-foreground'>{p.project_name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
