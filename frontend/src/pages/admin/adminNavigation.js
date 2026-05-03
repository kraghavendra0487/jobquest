import {
  LayoutDashboard,
  Database as DatabaseIcon,
  Building2,
  LayoutList,
  Briefcase,
  Layers,
} from "lucide-react";

export const adminSidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Job Rating', icon: LayoutList, path: '/admin-pipeline-jobs' },
  { name: 'All Jobs', icon: Layers, path: '/admin-all-jobs' },
  { name: 'Company', icon: Building2, path: '/admin-company' },
  { name: 'Database', icon: DatabaseIcon, path: '/admin-database' },
];
