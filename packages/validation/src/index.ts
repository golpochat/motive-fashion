import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  name: z.string().min(2).max(80),
  phone: z.string().min(8).optional(),
  gdprConsent: z.literal(true),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const cartAddSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const cartQtySchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  fulfillment: z.enum(['DELIVERY', 'COLLECTION']),
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().min(8).optional(),
  address: z
    .object({
      line1: z.string().min(3),
      line2: z.string().optional(),
      city: z.string().min(2),
      county: z.string().optional(),
      eircode: z.string().optional(),
      country: z.string().default('IE'),
    })
    .optional(),
  giftNote: z.string().max(240).optional(),
  promoCode: z.string().max(40).optional(),
  sessionKey: z.string().min(8).max(80).optional(),
});

export const inventoryAdjustSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().min(3).max(200),
});

export const stockTransferSchema = z.object({
  variantId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const productCreateSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  categoryId: z.string().uuid(),
  occasion: z.string().optional(),
  coverage: z.string().optional(),
  opacity: z.string().optional(),
  hijabStyle: z.string().optional(),
  prayerReady: z.boolean().optional(),
});

export const productPatchSchema = z
  .object({
    title: z.string().min(2).optional(),
    slug: z.string().min(2).optional(),
    description: z.string().min(10).optional(),
    categoryId: z.string().uuid().optional(),
    occasion: z.string().nullable().optional(),
    coverage: z.string().nullable().optional(),
    opacity: z.string().nullable().optional(),
    hijabStyle: z.string().nullable().optional(),
    prayerReady: z.boolean().optional(),
    published: z.boolean().optional(),
    care: z.string().nullable().optional(),
    originCountry: z.string().nullable().optional(),
  })
  .strict();

export const returnRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(5).max(500),
  trackingToken: z.string().min(8).optional(),
  items: z.array(
    z.object({
      orderItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
    }),
  ),
});

export const variantCreateSchema = z.object({
  sku: z.string().min(2).max(40),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(40),
  fabric: z.string().max(40).optional(),
  costCents: z.number().int().min(0),
  priceCents: z.number().int().min(0),
  compareAtCents: z.number().int().min(0).optional(),
});

/** PERCENT `value` is basis points (1000 = 10%). FIXED `value` is EUR cents. */
export const promoCreateSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().min(1),
  active: z.boolean().optional(),
  maxUses: z.number().int().min(1).optional(),
});

export const campaignCreateSchema = z.object({
  name: z.string().min(2).max(80),
  season: z.enum(['RAMADAN', 'EID', 'WINTER', 'SUMMER', 'EVERYDAY']),
  audience: z.string().max(80).optional(),
  landingSlug: z.string().max(80).optional(),
});

export const calendarItemSchema = z.object({
  campaignId: z.string().uuid().optional(),
  channel: z.enum(['TIKTOK', 'INSTAGRAM', 'EMAIL', 'WHATSAPP']),
  caption: z.string().min(1).max(500),
  assetUrl: z.string().url().optional(),
  publishOn: z.string().min(8),
});

export const whatsappBroadcastSchema = z.object({
  message: z.string().min(1).max(1000),
  template: z.string().min(1).max(40).optional(),
});

export const posSaleSchema = z.object({
  externalId: z.string().min(1).max(80),
  deviceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(80).optional(),
  phone: z.string().min(8).optional(),
  lines: z
    .array(
      z.object({
        sku: z.string().min(2).max(40),
        quantity: z.number().int().min(1).max(50),
        unitPriceCents: z.number().int().min(0),
      }),
    )
    .min(1),
  totalCents: z.number().int().min(0),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PACKING',
    'SHIPPED',
    'READY_FOR_COLLECTION',
    'DELIVERED',
    'COLLECTED',
    'CANCELLED',
    'REFUNDED',
  ]),
});

export const refundSchema = z.object({
  amountCents: z.number().int().min(1),
  reason: z.string().min(3).max(200),
});

export const resolveReturnSchema = z.object({
  status: z.enum(['REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED']),
});

export const roleCreateSchema = z.object({
  slug: z.string().min(2).max(40),
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  permissionKeys: z.array(z.string().min(1)).default([]),
});

export const roleUpdateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(200).optional(),
  permissionKeys: z.array(z.string().min(1)).optional(),
});

export const userRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
