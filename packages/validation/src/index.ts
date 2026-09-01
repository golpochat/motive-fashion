import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  name: z.string().min(2).max(80),
  phone: z.string().min(8).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const cartAddSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
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

export const returnRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(5).max(500),
  items: z.array(
    z.object({
      orderItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
    }),
  ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
