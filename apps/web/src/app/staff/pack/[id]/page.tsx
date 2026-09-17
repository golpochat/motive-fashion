'use client';

import { useParams } from 'next/navigation';
import { PackStation } from '@/components/pack-station';

export default function StaffPackOrderPage() {
  const params = useParams<{ id: string }>();
  return <PackStation orderId={params.id} backHref="/staff/pack" backLabel="Back to pack queue" />;
}
