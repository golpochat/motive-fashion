export type IconName =
  | 'overview'
  | 'roles'
  | 'users'
  | 'permissions'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'locations'
  | 'checkout'
  | 'building'
  | 'pos'
  | 'suppliers'
  | 'procurement'
  | 'marketing'
  | 'coupon'
  | 'whatsapp'
  | 'wishlist'
  | 'profile'
  | 'privacy'
  | 'logout'
  | 'menu'
  | 'search'
  | 'cart'
  | 'close'
  | 'chevronRight'
  | 'eye'
  | 'eyeOff'
  | 'share'
  | 'copy'
  | 'mail'
  | 'edit'
  | 'plus'
  | 'trash'
  | 'check'
  | 'x'
  | 'photo'
  | 'barcode'
  | 'pack'
  | 'truck'
  | 'print'
  | 'refund'
  | 'open';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      {paths[name]}
    </svg>
  );
}

const paths = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  roles: (
    <>
      <path d="M12 3 5 6.5v5.2c0 4.2 2.8 7.4 7 8.3 4.2-.9 7-4.1 7-8.3V6.5L12 3Z" />
      <path d="M9.5 12.2 11.2 14l3.4-3.6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.2a4.6 4.6 0 0 1 4.8 4.8" />
    </>
  ),
  permissions: (
    <>
      <circle cx="8.5" cy="12" r="3.2" />
      <path d="M11.4 12h8.2M16.4 12v3.2M19.6 12v2.2" />
    </>
  ),
  products: (
    <>
      <path d="M12 3 4.5 7v10L12 21l7.5-4V7L12 3Z" />
      <path d="M4.5 7 12 11l7.5-4M12 11v10" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 8h16v11H4z" />
      <path d="M4 8 7 4h10l3 4" />
      <path d="M10 12h4" />
    </>
  ),
  orders: (
    <>
      <path d="M6 7h15l-1.6 8.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L5.4 4H3" />
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </>
  ),
  customers: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </>
  ),
  locations: (
    <>
      <path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.2" />
    </>
  ),
  checkout: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  building: (
    <>
      <path d="M4 20V8l8-4 8 4v12" />
      <path d="M9 20v-6h6v6" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" />
    </>
  ),
  pos: (
    <>
      <rect x="4" y="3" width="16" height="12" rx="1.5" />
      <path d="M8 21h8M12 15v6M7 7h10M7 10h6" />
    </>
  ),
  suppliers: (
    <>
      <path d="M3 16V8h9l4 4h5v4" />
      <circle cx="7.5" cy="18.5" r="1.8" />
      <circle cx="17" cy="18.5" r="1.8" />
      <path d="M9.3 18.5h5.9" />
    </>
  ),
  procurement: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="1.5" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  marketing: (
    <>
      <path d="M4 10v4l11 5V5L4 10Z" />
      <path d="M15 8.2v7.6" />
      <path d="M6.6 14.2 8 19h2.2l-1.2-4.2" />
    </>
  ),
  coupon: (
    <>
      <path d="M4.5 8.2v7.6A1.5 1.5 0 0 0 6 17.3h12a1.5 1.5 0 0 0 1.5-1.5V8.2A1.5 1.5 0 0 0 18 6.7H6A1.5 1.5 0 0 0 4.5 8.2Z" />
      <path d="M4.5 12H6.2a1.4 1.4 0 0 1 0 2.8H4.5M19.5 12h-1.7a1.4 1.4 0 0 0 0 2.8h1.7" />
      <path d="m14.4 9.2-4.8 5.6" />
      <circle cx="10" cy="10.2" r="0.7" />
      <circle cx="14" cy="13.8" r="0.7" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M5 19.5 6.2 16A8 8 0 1 1 12 20a8 8 0 0 1-3.3-.7Z" />
      <path d="M9.2 9.6c.3 1.8 1.9 3.4 3.7 3.7.3 0 .8-.2 1-.6l.3-.7-1.3-.6-.4.5c-.8-.3-1.4-.9-1.7-1.7l.5-.4-.6-1.3-.7.3c-.4.2-.6.7-.6 1Z" />
    </>
  ),
  wishlist: (
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.2 19a6.8 6.8 0 0 1 13.6 0" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  privacy: (
    <>
      <rect x="6" y="11" width="12" height="9" rx="1.5" />
      <path d="M9 11V8.2a3 3 0 0 1 6 0V11" />
    </>
  ),
  logout: (
    <>
      <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
      <path d="M14 5H7.5A1.5 1.5 0 0 0 6 6.5v11A1.5 1.5 0 0 0 7.5 19H14" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16.5 20.5 21" />
    </>
  ),
  cart: (
    <>
      <path d="M6.5 3 3.5 7v12.5A1.5 1.5 0 0 0 5 21h14a1.5 1.5 0 0 0 1.5-1.5V7L17.5 3H6.5Z" />
      <path d="M3.5 7h17" />
      <path d="M15.5 11.5a3.5 3.5 0 0 1-7 0" />
    </>
  ),
  close: (
    <path d="M6 6l12 12M18 6 6 18" />
  ),
  chevronRight: <path d="M9 6l6 6-6 6" />,
  eye: (
    <>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 6C10.6 5.7 11.3 5.5 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.3 3.8" />
      <path d="M6.2 6.9C4.2 8.3 2.5 10.4 2.5 12S6 17.5 12 17.5c1.2 0 2.3-.2 3.3-.6" />
      <path d="M10.2 10.4a2.6 2.6 0 0 0 3.4 3.4" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5.2" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="18.8" r="2.2" />
      <path d="M8.1 10.9 15.9 6.4M8.1 13.1 15.9 17.6" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
      <path d="M15.5 8.5V6.5A1.5 1.5 0 0 0 14 5H6.5A1.5 1.5 0 0 0 5 6.5V14a1.5 1.5 0 0 0 1.5 1.5H8.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <path d="M4 7.2 12 13l8-5.8" />
    </>
  ),
  edit: (
    <>
      <path d="M4.5 16.7 16.2 5a1.6 1.6 0 0 1 2.3 2.3L6.8 19.2H4.5v-2.5Z" />
      <path d="M14.2 6.7 17.3 9.8" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9.5 7V5h5v2" />
      <path d="M7 7l.8 12h8.4L17 7" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5 10 17.5 19 7" />
    </>
  ),
  x: (
    <>
      <path d="M6 6 18 18M18 6 6 18" />
    </>
  ),
  photo: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m7.5 16.5 3.2-3.6 2.3 2.4 2.4-2.8 3.1 4" />
    </>
  ),
  barcode: (
    <>
      <path d="M5 6v12M8 6v12M10 6v12M13.5 6v12M16 6v12M19 6v12" />
    </>
  ),
  pack: (
    <>
      <path d="M4.5 8.5 12 4.5l7.5 4V16.5L12 20.5 4.5 16.5V8.5Z" />
      <path d="M12 12v8.5M4.5 8.5 12 12l7.5-3.5" />
    </>
  ),
  truck: (
    <>
      <path d="M3.5 8h10v9H3.5Z" />
      <path d="M13.5 11h4.2L20.5 14v3h-7" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="16.5" cy="17.5" r="1.6" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V4.5h10V9" />
      <path d="M6 13h12v6.5H6Z" />
      <path d="M5 9h14v6h-2v-2H7v2H5V9Z" />
    </>
  ),
  refund: (
    <>
      <path d="M8 7H4.5v3.5" />
      <path d="M4.8 8.8A8 8 0 1 1 4 12" />
      <path d="M9.5 12h5M12 9.5v5" />
    </>
  ),
  open: (
    <>
      <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V14" />
      <path d="M12 12 19 5M14 5h5v5" />
    </>
  ),
} satisfies Record<IconName, unknown>;
