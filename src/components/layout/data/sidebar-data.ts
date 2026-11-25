import { LayoutDashboard, ScrollText } from 'lucide-react'
import { resources } from '@/features/resources/config'
import { type SidebarData } from '../types'

const r = resources

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Overview',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Access Logs', url: '/access-logs', icon: ScrollText },
      ],
    },
    {
      title: 'Management',
      items: [
        { title: r.projects.title, url: '/projects', icon: r.projects.icon },
        { title: r.houses.title, url: '/houses', icon: r.houses.icon },
        { title: r.users.title, url: '/users', icon: r.users.icon },
        { title: r.vehicles.title, url: '/vehicles', icon: r.vehicles.icon },
        { title: r.devices.title, url: '/devices', icon: r.devices.icon },
        { title: r.blacklist.title, url: '/blacklist', icon: r.blacklist.icon },
      ],
    },
  ],
}
