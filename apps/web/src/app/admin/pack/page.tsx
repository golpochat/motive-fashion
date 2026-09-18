'use client';

import { PackQueue } from '@/components/pack-queue';

export default function AdminPackQueue() {
  return <PackQueue stationHref={(id) => `/admin/pack/${id}`} />;
}
