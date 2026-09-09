'use client';

import { Tabs } from '@/components/dashboard-ui';

export const ACCESS_TABS = [
  { href: '/super-admin/users', label: 'Users' },
  { href: '/super-admin/roles', label: 'Roles' },
  { href: '/super-admin/permissions', label: 'Permissions' },
];

export function AccessTabs({ current }: { current: (typeof ACCESS_TABS)[number]['href'] }) {
  return <Tabs items={ACCESS_TABS} current={current} />;
}
