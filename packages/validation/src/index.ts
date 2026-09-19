import { z } from 'zod';
import { isValidEircode, normalizeEircode, PASSWORD_MIN_LENGTH, supplierCountryCode } from '@motive-fashion/config';

const ieEircode = z
  .string({ required_error: 'Enter an Eircode.' })
  .trim()
  .min(1, 'Enter an Eircode.')
  .transform(normalizeEircode)
  .refine(isValidEircode, 'Enter a valid Eircode, like D02 AF30.');

const addressLabel = z.enum(['HOME', 'WORK', 'FAMILY', 'OTHER']);

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(PASSWORD_MIN_LENGTH),
    confirmPassword: z.string().min(PASSWORD_MIN_LENGTH),
    name: z.string().min(2).max(80),
    phone: z.string().min(8).optional(),
    gdprConsent: z.literal(true),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  next: z.string().max(200).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(PASSWORD_MIN_LENGTH),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const mfaCodeSchema = z.object({
  code: z.string().trim().min(6).max(16),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(20),
  code: z.string().trim().min(6).max(16),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().trim().min(6).max(16),
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
  addressId: z.string().uuid().optional(),
  address: z
    .object({
      line1: z.string({ required_error: 'Enter the first line of the address.' }).min(3, 'Enter the first line of the address.'),
      line2: z.string().optional(),
      city: z.string({ required_error: 'Enter a town or city.' }).min(2, 'Enter a town or city.'),
      county: z.string({ required_error: 'Choose a county.' }).min(2, 'Choose a county.').max(40),
      eircode: ieEircode,
      country: z.string().default('IE'),
      label: addressLabel.optional(),
    })
    .optional(),
  county: z.string().min(2).max(40).optional(),
  giftNote: z.string().max(240).optional(),
  promoCode: z.string().max(40).optional(),
  paymentMethod: z.enum(['CARD', 'CASH']).optional(),
  returnPolicyAck: z.boolean().optional(),
  sessionKey: z.string().min(8).max(80).optional(),
});

export const checkoutQuoteSchema = z.object({
  cartId: z.string().uuid(),
  sessionKey: z.string().min(8).max(80).optional(),
  fulfillment: z.enum(['DELIVERY', 'COLLECTION']),
  county: z.string().min(2).max(40).optional(),
  promoCode: z.string().max(40).optional(),
});

const addressFields = z.object({
  label: addressLabel,
  line1: z.string({ required_error: 'Enter the first line of the address.' }).min(3, 'Enter the first line of the address.'),
  line2: z.string().optional(),
  city: z.string({ required_error: 'Enter a town or city.' }).min(2, 'Enter a town or city.'),
  county: z.string({ required_error: 'Choose a county.' }).min(2, 'Choose a county.').max(40),
  eircode: ieEircode,
  country: z.literal('IE').optional(),
  isDefault: z.boolean().optional(),
});

export const addressCreateSchema = addressFields.extend({
  label: addressLabel.default('HOME'),
});

export const addressPatchSchema = addressFields.partial().strict();

export const fulfilmentPatchSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    published: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    feeCents: z.number().int().min(0).optional(),
    freeOverCents: z.number().int().min(0).nullable().optional(),
  })
  .strict();

export const countyPatchSchema = z
  .object({
    published: z.boolean().optional(),
    rateCents: z.number().int().min(0).optional(),
  })
  .strict();

export const paymentPatchSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    published: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const inventoryAdjustSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().min(3).max(200),
});

export const inventoryBinSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  binCode: z.string().max(24).optional().nullable(),
});

export const stockTransferSchema = z.object({
  variantId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const variantCreateSchema = z.object({
  sku: z.string().min(2).max(40),
  barcode: z.string().min(2).max(64).optional(),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(40),
  fabric: z.string().max(40).optional(),
  costCents: z.number().int().min(0),
  priceCents: z.number().int().min(0),
  compareAtCents: z.number().int().min(0).optional(),
});

export const variantPatchSchema = z
  .object({
    sku: z.string().min(2).max(40).optional(),
    barcode: z.string().min(2).max(64).nullable().optional(),
    size: z.string().min(1).max(20).optional(),
    color: z.string().min(1).max(40).optional(),
    fabric: z.string().max(40).nullable().optional(),
    costCents: z.number().int().min(0).optional(),
    priceCents: z.number().int().min(0).optional(),
    compareAtCents: z.number().int().min(0).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

function uniqueStyleVariants(
  variants: { sku: string; size: string; color: string }[],
  ctx: z.RefinementCtx,
) {
  const skus = new Set<string>();
  const combos = new Set<string>();
  variants.forEach((row, index) => {
    const sku = row.sku.trim().toUpperCase();
    const combo = `${row.size.trim().toLowerCase()}|${row.color.trim().toLowerCase()}`;
    if (skus.has(sku)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each SKU must be unique.', path: ['variants', index, 'sku'] });
    }
    if (combos.has(combo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each size and colour pair must be unique.',
        path: ['variants', index, 'color'],
      });
    }
    skus.add(sku);
    combos.add(combo);
  });
}

export const productCreateSchema = z
  .object({
    title: z.string().min(2),
    slug: z.string().min(2).optional(),
    description: z.string().min(10),
    categoryId: z.string().uuid(),
    occasion: z.string().optional(),
    coverage: z.string().optional(),
    opacity: z.string().optional(),
    hijabStyle: z.string().optional(),
    prayerReady: z.boolean().optional(),
    published: z.boolean().optional(),
    variants: z.array(variantCreateSchema).max(48).optional(),
  })
  .superRefine((dto, ctx) => {
    if (dto.variants?.length) uniqueStyleVariants(dto.variants, ctx);
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
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const reviewCreateSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(2000),
});

export const reviewModerateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const pushTokenSchema = z.object({
  token: z.string().trim().min(8).max(400),
  platform: z.enum(['ios', 'android', 'web']).default('ios'),
});

export const cookieConsentSchema = z.object({
  choice: z.enum(['all', 'essential', 'rejected']),
  version: z.string().min(4).max(40),
  sessionKey: z.string().min(8).max(80).optional(),
});

export const variantBulkCreateSchema = z
  .object({
    variants: z.array(variantCreateSchema).min(1).max(48),
  })
  .superRefine((dto, ctx) => uniqueStyleVariants(dto.variants, ctx));

/** PERCENT `value` is basis points (1000 = 10%). FIXED `value` is EUR cents. */
export const promoCreateSchema = z
  .object({
    code: z.string().min(2).max(40),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.number().int().min(1),
    active: z.boolean().optional(),
    maxUses: z.number().int().min(1).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
  })
  .strict()
  .refine((d) => d.type !== 'PERCENT' || d.value <= 10000, {
    message: 'Percent cannot exceed 100%.',
    path: ['value'],
  })
  .refine((d) => !d.startsAt || !d.endsAt || new Date(d.startsAt) < new Date(d.endsAt), {
    message: 'End must be after the start.',
    path: ['endsAt'],
  });

export const promoPatchSchema = z
  .object({
    active: z.boolean().optional(),
    maxUses: z.number().int().min(1).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    type: z.enum(['PERCENT', 'FIXED']).optional(),
    value: z.number().int().min(1).optional(),
  })
  .strict()
  .refine((d) => d.type !== 'PERCENT' || d.value == null || d.value <= 10000, {
    message: 'Percent cannot exceed 100%.',
    path: ['value'],
  })
  .refine((d) => !d.startsAt || !d.endsAt || new Date(d.startsAt) < new Date(d.endsAt), {
    message: 'End must be after the start.',
    path: ['endsAt'],
  });

export const locationCreateSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, hyphen, or underscore'),
  name: z.string().min(2).max(80),
  type: z.enum(['WAREHOUSE', 'SHOP', 'POPUP']),
  address: z.string().max(200).optional(),
});

export const locationPatchSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    type: z.enum(['WAREHOUSE', 'SHOP', 'POPUP']).optional(),
    address: z.string().max(200).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

const campaignSeason = z.enum(['EVERYDAY', 'SPRING', 'SUMMER', 'WINTER', 'RAMADAN', 'EID']);

const bannerPath = z
  .string()
  .trim()
  .max(200)
  .refine((value) => !value || value.startsWith('/') || value.startsWith('https://'), 'Use a site path or https URL.');

export const collectionCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  season: campaignSeason.optional(),
  published: z.boolean().optional(),
  inNav: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  bannerPath: bannerPath.optional().nullable(),
});

export const collectionPatchSchema = collectionCreateSchema.partial().strict();

const supplierCountry = z
  .string()
  .min(2)
  .max(80)
  .transform((raw) => supplierCountryCode(raw) ?? raw.trim().toUpperCase())
  .refine((code) => Boolean(supplierCountryCode(code)), 'Pick a country from the list.');

export const supplierCreateSchema = z.object({
  name: z.string().min(2).max(80),
  country: supplierCountry,
  email: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
});

export const supplierPatchSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    country: supplierCountry.optional(),
    email: z.string().max(120).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    example: z.boolean().optional(),
  })
  .strict();

export const supplierProductLinkSchema = z.object({
  productId: z.string().uuid(),
  moq: z.number().int().min(1).max(100_000).optional(),
  unitCostCents: z.number().int().min(0).max(10_000_000),
  leadDays: z.number().int().min(1).max(365).optional(),
});

export const supplierProductPatchSchema = z
  .object({
    moq: z.number().int().min(1).max(100_000).optional(),
    unitCostCents: z.number().int().min(0).max(10_000_000).optional(),
    leadDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid(),
  notes: z.string().max(500).optional(),
  monthBucket: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM')
    .optional(),
  lines: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100_000),
        unitCostCents: z.number().int().min(0).max(10_000_000).optional(),
      }),
    )
    .min(1, 'Add at least one SKU')
    .max(200),
});

export const purchaseOrderPatchSchema = purchaseOrderCreateSchema.omit({ supplierId: true, monthBucket: true });

export const receiveShipmentSchema = z
  .object({
    lines: z
      .array(
        z.object({
          lineId: z.string().uuid(),
          quantity: z.number().int().min(1).max(100_000),
        }),
      )
      .min(1)
      .max(200)
      .optional(),
  })
  .strict();

export const campaignCreateSchema = z.object({
  name: z.string().min(2).max(80),
  season: z.enum(['RAMADAN', 'EID', 'WINTER', 'SUMMER', 'SPRING', 'EVERYDAY']),
  audience: z.string().max(80).optional(),
  landingSlug: z.string().max(80).optional(),
  promoCodeId: z.string().uuid().optional().nullable(),
  startsAt: z.string().min(8).optional().nullable(),
  endsAt: z.string().min(8).optional().nullable(),
});

export const campaignPatchSchema = campaignCreateSchema.partial().strict();

export const calendarItemSchema = z.object({
  campaignId: z.string().uuid().optional(),
  channel: z.enum(['TIKTOK', 'INSTAGRAM', 'EMAIL', 'WHATSAPP']),
  caption: z.string().min(1).max(500),
  assetUrl: z.string().url().optional(),
  publishOn: z.string().min(8),
  published: z.boolean().optional(),
});

export const calendarItemPatchSchema = calendarItemSchema.partial().strict();

export const accountPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(40).optional().nullable(),
    marketingOptIn: z.boolean().optional(),
    whatsappOptIn: z.boolean().optional(),
  })
  .strict();

export const orderLookupSchema = z.object({
  email: z.string().email(),
  ticket: z.string().trim().min(4).max(40),
});

export const whatsappBroadcastSchema = z.object({
  message: z.string().min(1).max(1000),
  template: z.string().min(1).max(40).optional(),
});

export const posSaleSchema = z.object({
  externalId: z.string().min(1).max(80),
  deviceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  name: z.string().min(1).max(80).optional(),
  phone: z.string().min(8).optional(),
  fulfillment: z.enum(['DELIVERY', 'COLLECTION']).default('COLLECTION'),
  paymentMethod: z.enum(['CARD', 'CASH']).default('CASH'),
  promoCode: z.string().max(40).optional(),
  county: z.string().min(2).max(40).optional(),
  address: z
    .object({
      line1: z.string().min(3),
      line2: z.string().optional(),
      city: z.string().min(2),
      county: z.string().min(2).max(40),
      eircode: ieEircode,
      country: z.string().default('IE'),
      label: addressLabel.optional(),
    })
    .optional(),
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

export const posQuoteSchema = z.object({
  lines: posSaleSchema.shape.lines,
  fulfillment: z.enum(['DELIVERY', 'COLLECTION']),
  county: z.string().min(2).max(40).optional(),
  promoCode: z.string().max(40).optional(),
});

export const posPrintSchema = z.object({
  tenderedCents: z.number().int().min(0).optional(),
  changeCents: z.number().int().min(0).optional(),
});

export const posEmailSchema = z.object({
  email: z.string().email().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['PACKING', 'SHIPPED', 'READY_FOR_COLLECTION', 'DELIVERED', 'COLLECTED']),
  carrier: z.string().min(1).max(40).optional(),
  trackingNo: z.string().min(4).max(80).optional(),
});

export const refundSchema = z.object({
  amountCents: z.number().int().min(1),
  reason: z.string().min(3).max(200),
});

export const resolveReturnSchema = z.object({
  status: z.enum(['REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED']),
});

export const roleCreateSchema = z.object({
  slug: z.string().min(2).max(40).optional(),
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  permissionKeys: z.array(z.string().min(1)).default([]),
});

export const roleUpdateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(200).optional(),
  permissionKeys: z.array(z.string().min(1)).optional(),
});

export const permissionCreateSchema = z.object({
  key: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/, 'Use a key like catalog.write'),
  name: z.string().trim().min(2).max(80),
  group: z.string().trim().min(2).max(40),
});

export const permissionUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  group: z.string().trim().min(2).max(40).optional(),
});

export const userRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: z.string().email('Enter a valid email.'),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, 'Write a little more so we can help.').max(2000),
  company: z.string().max(120).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;
export type AddressCreateInput = z.infer<typeof addressCreateSchema>;
export type AddressPatchInput = z.infer<typeof addressPatchSchema>;
export type AccountPatchInput = z.infer<typeof accountPatchSchema>;
export type OrderLookupInput = z.infer<typeof orderLookupSchema>;
