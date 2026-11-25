import {
  Building2,
  FileBarChart,
  Home,
  LayoutDashboard,
  UserCheck,
} from 'lucide-react'
import { type SidebarData } from '../types'

/** Nav groups for this user: ROOT also sees root-only items. */
export const navGroupsFor = (isRoot: boolean) =>
  sidebarData.navGroups.map((g) => ({
    ...g,
    items: g.items.filter((i) => isRoot || !i.rootOnly),
  }))

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'nav.overview',
      items: [{ title: 'nav.dashboard', url: '/', icon: LayoutDashboard }],
    },
    {
      title: 'nav.management',
      items: [
        { title: 'nav.houses', url: '/houses', icon: Home },
        { title: 'nav.visitors', url: '/visitors', icon: UserCheck },
        { title: 'nav.reports', url: '/reports', icon: FileBarChart },
        {
          title: 'nav.projects',
          url: '/projects',
          icon: Building2,
          rootOnly: true,
        },
      ],
    },
  ],
}
