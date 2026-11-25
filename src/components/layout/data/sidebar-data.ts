import { Home, LayoutDashboard, UserCheck } from 'lucide-react'
import { type SidebarData } from '../types'

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
      ],
    },
  ],
}
