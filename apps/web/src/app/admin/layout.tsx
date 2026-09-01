import Link from 'next/link';

const links = [
  ['/admin', 'Analytics'],
  ['/admin/products', 'Products'],
  ['/admin/inventory', 'Inventory'],
  ['/admin/orders', 'Orders'],
  ['/admin/customers', 'Customers'],
  ['/admin/suppliers', 'Suppliers'],
  ['/admin/procurement', 'Procurement'],
  ['/admin/locations', 'Locations'],
  ['/admin/whatsapp', 'WhatsApp'],
  ['/admin/pos', 'POS till'],
  ['/admin/marketing', 'Marketing'],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <aside className="flex flex-col gap-2 text-sm">
        <p className="font-serif text-lg">Admin</p>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="no-underline hover:underline">
            {label}
          </Link>
        ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}
