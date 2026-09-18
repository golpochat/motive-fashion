'use client';

import { PackQueue } from '@/components/pack-queue';

export default function StaffPackQueue() {
  return <PackQueue stationHref={(id) => `/staff/pack/${id}`} />;
}
