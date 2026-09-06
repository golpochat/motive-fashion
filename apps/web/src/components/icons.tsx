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
  | 'pos'
  | 'suppliers'
  | 'procurement'
  | 'marketing'
  | 'whatsapp'
  | 'wishlist'
  | 'profile'
  | 'privacy'
  | 'logout'
  | 'menu'
  | 'cart'
  | 'close'
  | 'eye'
  | 'eyeOff';

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
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M8 3v4M16 3v4M4 10h16" />
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
  cart: (
    <>
      <path d="M6 8h12l-1 13H7L6 8Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </>
  ),
  close: (
    <path d="M6 6l12 12M18 6 6 18" />
  ),
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
} satisfies Record<IconName, unknown>;
