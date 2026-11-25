import { Home, LayoutDashboard, UserCheck, Users } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Overview',
      items: [{ title: 'Dashboard', url: '/', icon: LayoutDashboard }],
    },
    {
      title: 'Management',
      items: [
        { title: 'Houses', url: '/houses', icon: Home },
        { title: 'Residents', url: '/residents', icon: Users },
        { title: 'Visitors', url: '/visitors', icon: UserCheck },
      ],
    },
  ],
}
