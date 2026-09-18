'use client';

import { availableStock, formatEur } from '@motive-fashion/utils';
import { DataTable, IconButton, Modal, RowActions, Td } from '@/components/dashboard-ui';
import type { AdminProduct } from '@/components/product-editor';

export function ProductHub({
  product,
  canWrite,
  onClose,
  onEdit,
  onAddSkus,
  onPhotos,
}: {
  product: AdminProduct;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddSkus: () => void;
  onPhotos: () => void;
}) {
  return (
    <Modal title={product.title} onClose={onClose} xl>
      <p className="mb-4 text-sm text-ink/60">
        {product.category?.name ?? 'Uncategorised'}
        {product.published ? '' : ' · unpublished'}
        {(product.images ?? []).length ? ` · ${(product.images ?? []).length} photo${(product.images ?? []).length === 1 ? '' : 's'}` : ' · no photos'}
      </p>
      <div className="mb-4">
        <RowActions>
          <IconButton label="Print hang tags" icon="barcode" href={`/admin/labels?product=${product.id}`} />
          <IconButton
            label="Stock for this style"
            icon="pack"
            href={`/admin/inventory?q=${encodeURIComponent(product.variants[0]?.sku ?? product.title)}`}
          />
          {canWrite ? (
            <>
              <IconButton label="Edit product" icon="edit" onClick={onEdit} />
              <IconButton label="Add SKUs" icon="plus" onClick={onAddSkus} />
              <IconButton label="Photos" icon="photo" onClick={onPhotos} />
            </>
          ) : null}
        </RowActions>
      </div>
      {product.variants.length ? (
        <DataTable headers={['SKU', 'Size / colour', 'Price', 'Free stock']}>
          {product.variants.map((row) => {
            const free = (row.inventory ?? []).reduce((sum, level) => sum + availableStock(level.onHand, level.reserved), 0);
            return (
              <tr key={row.id} className="hover:bg-ink/5">
                <Td>
                  <span className="font-mono text-xs">{row.sku}</span>
                  {row.active ? null : <span className="mt-1 block text-xs text-ink/45">Off</span>}
                </Td>
                <Td>
                  {row.size} / {row.color}
                </Td>
                <Td>{formatEur(row.priceCents)}</Td>
                <Td muted>{free}</Td>
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <p className="text-sm text-ink/55">No SKUs yet. Add sizes and colours.</p>
      )}
    </Modal>
  );
}
