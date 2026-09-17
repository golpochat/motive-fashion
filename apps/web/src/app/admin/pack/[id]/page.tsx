'use client';

import { useParams } from 'next/navigation';
import { PackStation } from '@/components/pack-station';

export default function AdminPackPage() {
  const params = useParams<{ id: string }>();
  return <PackStation orderId={params.id} backHref="/admin/orders" backLabel="Back to orders" />;
}
