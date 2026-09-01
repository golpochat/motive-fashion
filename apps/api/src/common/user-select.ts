export const customerPublicSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  marketingOptIn: true,
  whatsappOptIn: true,
} as const;

export const gdprUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  marketingOptIn: true,
  whatsappOptIn: true,
  gdprConsentAt: true,
  createdAt: true,
  addresses: true,
  orders: { include: { items: true } },
  wishlist: true,
} as const;
