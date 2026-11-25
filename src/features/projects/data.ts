import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Project } from '@/lib/types'

/** Root only (the API answers 403 for ADMIN). */
export function useProjects(enabled = true) {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      api
        .get<{ projects: Project[] }>('/projects')
        .then((r) => r.data.projects),
    enabled,
  })
}
