import { NewPurchaseOrder } from '@/components/new-purchase-order';

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; from?: string; edit?: string }>;
}) {
  const q = await searchParams;
  return (
    <NewPurchaseOrder initialSupplierId={q.supplier} fromRestock={q.from === 'restock'} editId={q.edit} />
  );
}
