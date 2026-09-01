export type SalesChannel = 'web' | 'whatsapp' | 'pos' | 'mobile';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PACKING'
  | 'SHIPPED'
  | 'READY_FOR_COLLECTION'
  | 'DELIVERED'
  | 'COLLECTED'
  | 'CANCELLED'
  | 'REFUNDED';

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type FulfillmentMethod = 'DELIVERY' | 'COLLECTION';

export interface Money {
  cents: number;
  currency: 'EUR';
}

export interface CatalogProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  occasion: string | null;
  coverage: string | null;
  variants: CatalogVariant[];
  images: { url: string; alt: string }[];
}

export interface CatalogVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  priceCents: number;
  compareAtCents: number | null;
  available: number;
}

export interface CartDto {
  id: string;
  channel: SalesChannel;
  items: CartItemDto[];
  subtotalCents: number;
  expiresAt: string | null;
}

export interface CartItemDto {
  id: string;
  variantId: string;
  sku: string;
  title: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderDto {
  id: string;
  status: OrderStatus;
  channel: SalesChannel;
  fulfillment: FulfillmentMethod;
  totalCents: number;
  trackingToken: string;
  createdAt: string;
}
