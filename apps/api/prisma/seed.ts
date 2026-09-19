import {
  PrismaClient,
  CampaignSeason,
  LocationType,
  PurchaseOrderStatus,
} from '../generated/prisma';
import bcrypt from 'bcryptjs';
import {
  DEFAULT_COUNTY_RATE_CENTS,
  DEFAULT_FREE_SHIP_OVER_CENTS,
  IE_COUNTIES,
} from '@motive-fashion/config';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'hijabs', name: 'Hijabs', sortOrder: 1 },
  { slug: 'abayas', name: 'Abayas', sortOrder: 2 },
  { slug: 'dresses', name: 'Dresses', sortOrder: 3 },
  { slug: 'jilbabs', name: 'Jilbabs', sortOrder: 4 },
  { slug: 'niqabs', name: 'Niqabs', sortOrder: 5 },
  { slug: 'khimars', name: 'Khimars', sortOrder: 6 },
  { slug: 'prayer-sets', name: 'Prayer sets', sortOrder: 7 },
  { slug: 'undercaps', name: 'Undercaps', sortOrder: 8 },
  { slug: 'accessories', name: 'Accessories', sortOrder: 9 },
];

type ProductSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  occasion?: string;
  coverage?: string;
  origin?: string;
  prayerReady?: boolean;
  cost: number;
  price: number;
  sizes: string[];
  colors: string[];
  openingQty: number;
};

function fabricFor(p: ProductSeed) {
  if (p.slug.includes('satin')) return 'satin';
  if (p.slug.includes('jersey')) return 'jersey';
  if (p.slug.includes('chiffon')) return 'chiffon';
  if (p.slug.includes('linen')) return 'linen';
  if (p.slug.includes('wool')) return 'wool-blend';
  if (p.slug.includes('silk')) return 'silk-blend';
  if (p.slug.includes('bamboo')) return 'bamboo';
  if (p.slug.includes('cotton') || p.slug.includes('undercap')) return 'cotton';
  if (p.category === 'accessories') return 'metal';
  if (p.category === 'niqabs') return 'crepe';
  if (p.category === 'abayas' || p.category === 'jilbabs' || p.category === 'khimars')
    return 'nida crepe';
  return 'crepe';
}

function weightGramsFor(category: string) {
  const weights: Record<string, number> = {
    hijabs: 90,
    abayas: 520,
    dresses: 420,
    jilbabs: 580,
    niqabs: 45,
    khimars: 260,
    'prayer-sets': 320,
    undercaps: 35,
    accessories: 25,
  };
  return weights[category] ?? 200;
}

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'everyday-chiffon-hijab',
    title: 'Everyday chiffon hijab',
    description:
      'Light chiffon with a soft drape. Everyday coverage for Dublin weather, in four quiet colours.',
    category: 'hijabs',
    occasion: 'daily',
    coverage: 'full',
    origin: 'TR',
    cost: 350,
    price: 1800,
    sizes: ['OS'],
    colors: ['Black', 'Ivory', 'Sage', 'Navy'],
    openingQty: 40,
  },
  {
    slug: 'satin-square-hijab',
    title: 'Satin square hijab',
    description: 'A 90cm satin square with a quiet sheen. Pins cleanly for work and jummah.',
    category: 'hijabs',
    occasion: 'eid',
    coverage: 'full',
    origin: 'TR',
    cost: 520,
    price: 2800,
    sizes: ['OS'],
    colors: ['Navy', 'Champagne', 'Black'],
    openingQty: 24,
  },
  {
    slug: 'jersey-instant-hijab',
    title: 'Jersey instant hijab',
    description:
      'Stretch jersey pull-on hijab with a sewn undercap. For school runs and travel days.',
    category: 'hijabs',
    occasion: 'daily',
    coverage: 'full',
    origin: 'TR',
    cost: 400,
    price: 2200,
    sizes: ['OS'],
    colors: ['Sage', 'Black', 'Charcoal'],
    openingQty: 30,
  },
  {
    slug: 'premium-crepe-abaya',
    title: 'Premium crepe abaya',
    description: 'Nida crepe abaya with a clean front and modest sleeve. Photographed for drape.',
    category: 'abayas',
    occasion: 'eid',
    coverage: 'full',
    origin: 'SA',
    cost: 2800,
    price: 8900,
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Charcoal'],
    openingQty: 8,
  },
  {
    slug: 'luxury-silk-abaya',
    title: 'Luxury silk-blend abaya',
    description: 'Limited silk-blend abaya with a quiet sheen. Eid and occasion wear.',
    category: 'abayas',
    occasion: 'eid',
    coverage: 'full',
    origin: 'AE',
    cost: 5500,
    price: 18900,
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Deep emerald'],
    openingQty: 4,
  },
  {
    slug: 'everyday-nida-abaya',
    title: 'Everyday nida abaya',
    description:
      'A tailored black nida abaya for work and collection days. Lightweight, not see-through.',
    category: 'abayas',
    occasion: 'daily',
    coverage: 'full',
    origin: 'SA',
    cost: 2100,
    price: 7900,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black'],
    openingQty: 10,
  },
  {
    slug: 'summer-linen-dress',
    title: 'Summer linen modest dress',
    description: 'Breathable linen-mix dress, calf length, for Irish summers.',
    category: 'dresses',
    occasion: 'daily',
    coverage: 'full',
    origin: 'TR',
    cost: 1800,
    price: 6900,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Sand', 'Olive'],
    openingQty: 6,
  },
  {
    slug: 'winter-wool-modest-dress',
    title: 'Winter wool modest dress',
    description:
      'Wool-blend modest dress with long sleeves. Cut for Dublin winters over a base layer.',
    category: 'dresses',
    occasion: 'winter',
    coverage: 'full',
    origin: 'TR',
    cost: 2600,
    price: 9500,
    sizes: ['S', 'M', 'L'],
    colors: ['Olive', 'Charcoal'],
    openingQty: 6,
  },
  {
    slug: 'french-jilbab',
    title: 'French jilbab',
    description: 'One-piece jilbab with integrated khimar. Prayer-ready and easy to travel in.',
    category: 'jilbabs',
    occasion: 'prayer',
    coverage: 'full',
    origin: 'PK',
    prayerReady: true,
    cost: 2200,
    price: 7500,
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Taupe'],
    openingQty: 8,
  },
  {
    slug: 'two-piece-jilbab',
    title: 'Two-piece jilbab',
    description: 'Khimar and skirt overlay in matte nida. Wear together or as separates.',
    category: 'jilbabs',
    occasion: 'daily',
    coverage: 'full',
    origin: 'PK',
    prayerReady: true,
    cost: 2400,
    price: 8900,
    sizes: ['S', 'M', 'L'],
    colors: ['Taupe', 'Black'],
    openingQty: 6,
  },
  {
    slug: 'everyday-niqab',
    title: 'Everyday niqab',
    description: 'Two-layer niqab in breathable fabric with a soft nose bridge.',
    category: 'niqabs',
    occasion: 'daily',
    coverage: 'face',
    origin: 'SA',
    cost: 400,
    price: 1900,
    sizes: ['OS'],
    colors: ['Black'],
    openingQty: 25,
  },
  {
    slug: 'half-niqab',
    title: 'Half niqab',
    description: 'Single-layer half niqab that sits under the eyes. Ties at the crown.',
    category: 'niqabs',
    occasion: 'daily',
    coverage: 'face',
    origin: 'SA',
    cost: 280,
    price: 1400,
    sizes: ['OS'],
    colors: ['Black'],
    openingQty: 20,
  },
  {
    slug: 'khimar-shoulder',
    title: 'Shoulder khimar',
    description: 'Shoulder-length khimar with a snug cap. Easy over an abaya.',
    category: 'khimars',
    occasion: 'prayer',
    coverage: 'full',
    origin: 'ID',
    prayerReady: true,
    cost: 900,
    price: 3900,
    sizes: ['OS'],
    colors: ['Black', 'Grey'],
    openingQty: 10,
  },
  {
    slug: 'long-khimar',
    title: 'Long khimar',
    description: 'Knee-length khimar in opaque crepe. Prayer-ready coverage without extra pins.',
    category: 'khimars',
    occasion: 'prayer',
    coverage: 'full',
    origin: 'ID',
    prayerReady: true,
    cost: 1200,
    price: 5500,
    sizes: ['OS'],
    colors: ['Black', 'Charcoal'],
    openingQty: 8,
  },
  {
    slug: 'prayer-set',
    title: 'Travel prayer set',
    description: 'Lightweight prayer dress with a matching mat pouch. Packs into a tote.',
    category: 'prayer-sets',
    occasion: 'prayer',
    coverage: 'full',
    origin: 'ID',
    prayerReady: true,
    cost: 1100,
    price: 4500,
    sizes: ['OS'],
    colors: ['White', 'Blush'],
    openingQty: 10,
  },
  {
    slug: 'ramadan-prayer-dress',
    title: 'Ramadan prayer dress',
    description: 'Soft prayer dress cut for sujood. A Ramadan staple in blush and white.',
    category: 'prayer-sets',
    occasion: 'prayer',
    coverage: 'full',
    origin: 'ID',
    prayerReady: true,
    cost: 1300,
    price: 5900,
    sizes: ['OS'],
    colors: ['Blush', 'White'],
    openingQty: 8,
  },
  {
    slug: 'cotton-undercap',
    title: 'Cotton undercap',
    description: 'Stay-put cotton undercap for hijab days. Three everyday shades.',
    category: 'undercaps',
    occasion: 'daily',
    origin: 'CN',
    cost: 80,
    price: 600,
    sizes: ['OS'],
    colors: ['Black', 'Nude', 'White'],
    openingQty: 50,
  },
  {
    slug: 'bamboo-undercap',
    title: 'Bamboo undercap',
    description: 'Breathable bamboo-blend undercap that sits smooth under chiffon.',
    category: 'undercaps',
    occasion: 'daily',
    origin: 'CN',
    cost: 120,
    price: 900,
    sizes: ['OS'],
    colors: ['Ivory', 'Charcoal'],
    openingQty: 30,
  },
  {
    slug: 'hijab-magnets',
    title: 'Hijab magnets (pair)',
    description: 'Strong coated magnets. No pin holes in silk or chiffon.',
    category: 'accessories',
    occasion: 'daily',
    origin: 'CN',
    cost: 40,
    price: 500,
    sizes: ['OS'],
    colors: ['Gold', 'Silver'],
    openingQty: 40,
  },
  {
    slug: 'pearl-hijab-pins',
    title: 'Pearl hijab pins',
    description: 'A set of six small pearl pins with gold findings. For square hijabs.',
    category: 'accessories',
    occasion: 'eid',
    origin: 'CN',
    cost: 90,
    price: 1200,
    sizes: ['OS'],
    colors: ['Pearl'],
    openingQty: 20,
  },
];

/** Example contacts only — not verified. */
const SUPPLIERS = [
  { name: 'Moda Eşarp', country: 'TR', phone: '+90 532 612 44 89' },
  { name: 'Sena Hijab', country: 'TR', phone: '+90 535 410 22 17' },
  { name: 'Mira Moda', country: 'TR', phone: '+90 531 987 44 10' },
  { name: 'Bursa Tekstil', country: 'TR', phone: '+90 541 220 11 98' },
  { name: 'Ottoman Textile', country: 'TR', email: 'ottomantex@gmail.com' },
  { name: 'Konya Eşarp', country: 'TR', phone: '+90 555 210 77 44' },
  { name: 'Hijab Konya', country: 'TR', phone: '+90 552 330 11 22' },
  { name: 'Izmir Fashion', country: 'TR', phone: '+90 531 440 88 22' },
  { name: 'Al Muraqqabat', country: 'AE', phone: '+971 52 880 4411' },
  { name: 'Dubai Abaya Centre', country: 'AE', phone: '+971 50 667 9910' },
  { name: 'Sharjah Souq', country: 'AE', phone: '+971 55 330 2211' },
  { name: 'Ajman Factory', country: 'AE', phone: '+971 56 990 4411' },
  { name: 'Riyadh Niqab Zone', country: 'SA', phone: '+966 53 220 9911' },
  { name: 'Al Olaya Workshops', country: 'SA', phone: '+966 55 440 8822' },
  { name: 'Jeddah Ladies Souq', country: 'SA', phone: '+966 50 330 7711' },
  { name: 'Medina Islamic Market', country: 'SA', phone: '+966 54 220 6611' },
  { name: 'Karachi Jilbab Exporters', country: 'PK', phone: '+92 331 220 9911' },
  { name: 'Karachi Niqab Manufacturers', country: 'PK', phone: '+92 345 550 7711' },
  { name: 'Lahore French Jilbab Factory', country: 'PK', phone: '+92 300 440 8822' },
  { name: 'Dhaka Modest Wear Factory', country: 'BD', phone: '+880 171 220 6611' },
  { name: 'Bandung Prayer Set Factory', country: 'ID', phone: '+62 812 220 9911' },
  { name: 'Jakarta Khimar House', country: 'ID', phone: '+62 813 440 7711' },
  { name: 'Yiwu Hijab Market', country: 'CN', phone: '+86 138 2200 9911' },
  { name: 'Guangzhou Modest Wear Factory', country: 'CN', phone: '+86 139 4400 7711' },
];

const YEAR1_POS: { bucket: string; country: string; lines: { slug: string; qty: number }[] }[] = [
  {
    bucket: 'Y1-M01-02',
    country: 'TR',
    lines: [
      { slug: 'everyday-chiffon-hijab', qty: 300 },
      { slug: 'summer-linen-dress', qty: 40 },
      { slug: 'premium-crepe-abaya', qty: 30 },
    ],
  },
  { bucket: 'Y1-M01-02', country: 'PK', lines: [{ slug: 'french-jilbab', qty: 40 }] },
  {
    bucket: 'Y1-M01-02',
    country: 'SA',
    lines: [
      { slug: 'everyday-niqab', qty: 100 },
      { slug: 'premium-crepe-abaya', qty: 20 },
    ],
  },
  { bucket: 'Y1-M01-02', country: 'AE', lines: [{ slug: 'luxury-silk-abaya', qty: 20 }] },
  {
    bucket: 'Y1-M01-02',
    country: 'ID',
    lines: [
      { slug: 'prayer-set', qty: 20 },
      { slug: 'khimar-shoulder', qty: 20 },
    ],
  },
  { bucket: 'Y1-M01-02', country: 'CN', lines: [{ slug: 'cotton-undercap', qty: 200 }] },
  {
    bucket: 'Y1-M03-04',
    country: 'TR',
    lines: [
      { slug: 'everyday-chiffon-hijab', qty: 300 },
      { slug: 'premium-crepe-abaya', qty: 40 },
      { slug: 'summer-linen-dress', qty: 20 },
    ],
  },
  { bucket: 'Y1-M03-04', country: 'PK', lines: [{ slug: 'french-jilbab', qty: 60 }] },
  { bucket: 'Y1-M03-04', country: 'SA', lines: [{ slug: 'everyday-niqab', qty: 100 }] },
  { bucket: 'Y1-M03-04', country: 'ID', lines: [{ slug: 'khimar-shoulder', qty: 30 }] },
  {
    bucket: 'Y1-M05-06',
    country: 'AE',
    lines: [{ slug: 'luxury-silk-abaya', qty: 30 }],
  },
  {
    bucket: 'Y1-M05-06',
    country: 'SA',
    lines: [{ slug: 'premium-crepe-abaya', qty: 20 }],
  },
  { bucket: 'Y1-M05-06', country: 'PK', lines: [{ slug: 'french-jilbab', qty: 20 }] },
  { bucket: 'Y1-M05-06', country: 'TR', lines: [{ slug: 'summer-linen-dress', qty: 50 }] },
  {
    bucket: 'Y1-M07-08',
    country: 'TR',
    lines: [
      { slug: 'everyday-chiffon-hijab', qty: 300 },
      { slug: 'premium-crepe-abaya', qty: 40 },
    ],
  },
  {
    bucket: 'Y1-M07-08',
    country: 'ID',
    lines: [
      { slug: 'prayer-set', qty: 20 },
      { slug: 'khimar-shoulder', qty: 20 },
    ],
  },
  {
    bucket: 'Y1-M07-08',
    country: 'CN',
    lines: [
      { slug: 'cotton-undercap', qty: 200 },
      { slug: 'hijab-magnets', qty: 100 },
    ],
  },
  { bucket: 'Y1-M09-10', country: 'ID', lines: [{ slug: 'prayer-set', qty: 60 }] },
  {
    bucket: 'Y1-M09-10',
    country: 'SA',
    lines: [
      { slug: 'premium-crepe-abaya', qty: 30 },
      { slug: 'everyday-niqab', qty: 100 },
    ],
  },
  { bucket: 'Y1-M09-10', country: 'AE', lines: [{ slug: 'luxury-silk-abaya', qty: 30 }] },
  {
    bucket: 'Y1-M11-12',
    country: 'TR',
    lines: [
      { slug: 'summer-linen-dress', qty: 60 },
      { slug: 'everyday-chiffon-hijab', qty: 300 },
    ],
  },
  { bucket: 'Y1-M11-12', country: 'PK', lines: [{ slug: 'french-jilbab', qty: 60 }] },
  { bucket: 'Y1-M11-12', country: 'SA', lines: [{ slug: 'premium-crepe-abaya', qty: 30 }] },
];

async function main() {
  await prisma.webhookEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.deliveryCounty.deleteMany();
  await prisma.fulfilmentMethodConfig.deleteMany();
  await prisma.paymentMethodConfig.deleteMany();
  await prisma.contentCalendarItem.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.posSale.deleteMany();
  await prisma.posDevice.deleteMany();
  await prisma.outboundMessage.deleteMany();
  await prisma.whatsappSession.deleteMany();
  await prisma.inboundShipment.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.returnItem.deleteMany();
  await prisma.return.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryLevel.deleteMany();
  await prisma.productCollection.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.userMembership.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();

  const [superHash, adminHash, staffHash, guestHash] = await Promise.all([
    bcrypt.hash('MotiveSuper!2026', 12),
    bcrypt.hash('MotiveAdmin!2026', 12),
    bcrypt.hash('MotiveStaff!2026', 12),
    bcrypt.hash('MotiveUser!2026', 12),
  ]);
  const superAdminUser = await prisma.user.create({
    data: {
      email: 'superadmin@motivefashion.com',
      name: 'Motive Super Admin',
      role: 'ADMIN',
      passwordHash: superHash,
      emailVerified: true,
      gdprConsentAt: new Date(),
    },
  });

  for (const row of [
    { key: '*', name: 'Access-control wildcard', group: 'System' },
    { key: 'dashboard.super', name: 'Open super-admin console', group: 'Dashboards' },
    { key: 'dashboard.admin', name: 'Open admin console', group: 'Dashboards' },
    { key: 'dashboard.staff', name: 'Open staff console', group: 'Dashboards' },
    { key: 'dashboard.customer', name: 'Open customer account', group: 'Dashboards' },
    { key: 'rbac.roles.write', name: 'Create and edit roles', group: 'Access' },
    { key: 'rbac.users.assign', name: 'Assign roles to users', group: 'Access' },
    { key: 'analytics.read', name: 'View analytics', group: 'Commerce' },
    { key: 'catalog.read', name: 'View products', group: 'Commerce' },
    { key: 'catalog.write', name: 'Create and edit products', group: 'Commerce' },
    { key: 'inventory.read', name: 'View inventory', group: 'Shop floor' },
    { key: 'inventory.adjust', name: 'Adjust and transfer stock', group: 'Shop floor' },
    { key: 'orders.read', name: 'View orders', group: 'Shop floor' },
    { key: 'orders.pack', name: 'Change order status', group: 'Shop floor' },
    { key: 'orders.refund', name: 'Issue refunds', group: 'Commerce' },
    { key: 'customers.read', name: 'View customers', group: 'Commerce' },
    { key: 'procurement.write', name: 'Suppliers and purchase orders', group: 'Commerce' },
    { key: 'locations.read', name: 'View locations', group: 'Shop floor' },
    { key: 'pos.sale', name: 'Take POS sales', group: 'Shop floor' },
    { key: 'commerce.settings', name: 'Edit checkout methods and county rates', group: 'Commerce' },
    { key: 'marketing.write', name: 'Marketing calendar and coupons', group: 'Commerce' },
    { key: 'whatsapp.broadcast', name: 'WhatsApp broadcast', group: 'Commerce' },
    { key: 'reviews.moderate', name: 'Moderate product reviews', group: 'Commerce' },
    { key: 'audit.read', name: 'View audit log', group: 'Access' },
  ]) {
    await prisma.permission.upsert({
      where: { key: row.key },
      create: row,
      update: { name: row.name, group: row.group },
    });
  }
  const perms = await prisma.permission.findMany();
  const byKey = Object.fromEntries(perms.map((p) => [p.key, p.id]));
  const roleMap: Record<string, string[]> = {
    'super-admin': ['dashboard.super', 'rbac.roles.write', 'rbac.users.assign', 'audit.read'],
    admin: [
      'dashboard.admin',
      'analytics.read',
      'catalog.read',
      'catalog.write',
      'inventory.read',
      'inventory.adjust',
      'orders.read',
      'orders.pack',
      'orders.refund',
      'customers.read',
      'procurement.write',
      'locations.read',
      'pos.sale',
      'commerce.settings',
      'marketing.write',
      'whatsapp.broadcast',
      'reviews.moderate',
      'audit.read',
    ],
    staff: [
      'dashboard.staff',
      'inventory.read',
      'inventory.adjust',
      'orders.read',
      'orders.pack',
      'locations.read',
      'pos.sale',
    ],
    customer: ['dashboard.customer'],
  };
  const roleIds: Record<string, string> = {};
  for (const [slug, keys] of Object.entries(roleMap)) {
    const name =
      slug === 'super-admin'
        ? 'Super admin'
        : slug
            .split('-')
            .map((p) => p[0]!.toUpperCase() + p.slice(1))
            .join(' ');
    const role = await prisma.role.upsert({
      where: { slug },
      create: { slug, name, system: true, description: `System ${name} role` },
      update: { system: true, name },
    });
    roleIds[slug] = role.id;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: keys.filter((k) => byKey[k]).map((k) => ({ roleId: role.id, permissionId: byKey[k]! })),
    });
  }
  await prisma.userMembership.create({
    data: { userId: superAdminUser.id, roleId: roleIds['super-admin']! },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@motivefashion.com',
      name: 'Motive Admin',
      role: 'ADMIN',
      passwordHash: adminHash,
      emailVerified: true,
      gdprConsentAt: new Date(),
    },
  });
  await prisma.userMembership.create({ data: { userId: adminUser.id, roleId: roleIds.admin! } });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@motivefashion.com',
      name: 'Shop Floor',
      role: 'STAFF',
      passwordHash: staffHash,
      emailVerified: true,
      gdprConsentAt: new Date(),
    },
  });
  await prisma.userMembership.create({ data: { userId: staffUser.id, roleId: roleIds.staff! } });

  const customerUser = await prisma.user.create({
    data: {
      email: 'guest@motivefashion.com',
      name: 'Guest Customer',
      role: 'CUSTOMER',
      passwordHash: guestHash,
      emailVerified: true,
      gdprConsentAt: new Date(),
    },
  });
  await prisma.userMembership.create({
    data: { userId: customerUser.id, roleId: roleIds.customer! },
  });

  await prisma.address.create({
    data: {
      userId: customerUser.id,
      label: 'HOME',
      line1: '1 Grafton Street',
      city: 'Dublin',
      county: 'DUBLIN',
      eircode: 'D02 AF30',
      country: 'IE',
      isDefault: true,
    },
  });

  await prisma.fulfilmentMethodConfig.createMany({
    data: [
      {
        code: 'DELIVERY',
        name: 'Ireland delivery',
        published: true,
        isDefault: true,
        sortOrder: 0,
        feeCents: 0,
        freeOverCents: DEFAULT_FREE_SHIP_OVER_CENTS,
      },
      {
        code: 'COLLECTION',
        name: 'Collect in Dublin',
        published: true,
        isDefault: false,
        sortOrder: 1,
        feeCents: 0,
      },
    ],
  });
  await prisma.deliveryCounty.createMany({
    data: IE_COUNTIES.map((row, index) => ({
      code: row.code,
      name: row.name,
      published: true,
      rateCents: DEFAULT_COUNTY_RATE_CENTS,
      sortOrder: index,
    })),
  });
  await prisma.paymentMethodConfig.createMany({
    data: [
      {
        code: 'CARD',
        name: 'Card',
        published: true,
        isDefault: true,
        publicChannel: true,
        sortOrder: 0,
      },
      {
        code: 'CASH',
        name: 'Cash',
        published: true,
        isDefault: false,
        publicChannel: false,
        sortOrder: 1,
      },
    ],
  });

  const warehouse = await prisma.location.create({
    data: {
      code: 'warehouse',
      name: 'Dublin warehouse',
      type: LocationType.WAREHOUSE,
      address: 'Dublin',
    },
  });
  const shop = await prisma.location.create({
    data: {
      code: 'dublin_shop',
      name: 'Dublin shop / collection',
      type: LocationType.SHOP,
      address: 'Dublin city',
    },
  });
  await prisma.location.create({
    data: { code: 'popup', name: 'Pop-up', type: LocationType.POPUP },
  });
  await prisma.posDevice.create({
    data: { locationId: shop.id, name: 'Till 1', externalId: 'tablet-pwa-1' },
  });

  const cats = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.create({ data: c });
    cats.set(c.slug, row.id);
  }

  const ramadan = await prisma.collection.create({
    data: {
      slug: 'ramadan',
      name: 'Ramadan',
      season: CampaignSeason.RAMADAN,
      description: 'Quiet luxury for the month.',
      published: false,
      inNav: true,
      sortOrder: 1,
      bannerPath: '/brand/hero-editorial.jpg',
    },
  });
  const eid = await prisma.collection.create({
    data: {
      slug: 'eid',
      name: 'Eid',
      season: CampaignSeason.EID,
      description: 'Occasion abayas and sets.',
      published: false,
      inNav: true,
      sortOrder: 2,
      bannerPath: '/brand/banner-eid.jpg',
    },
  });
  const winter = await prisma.collection.create({
    data: {
      slug: 'winter',
      name: 'Winter',
      season: CampaignSeason.WINTER,
      published: true,
      inNav: false,
      sortOrder: 0,
      bannerPath: '/brand/hero-editorial.jpg',
    },
  });

  const variantByProduct = new Map<string, string[]>();
  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        categoryId: cats.get(p.category)!,
        occasion: p.occasion,
        coverage: p.coverage,
        originCountry: p.origin,
        prayerReady: p.prayerReady ?? false,
        care: 'Gentle cold wash. Hang dry.',
        images: {
          create: {
            url: `/products/${p.slug}.jpg`,
            alt: p.title,
          },
        },
      },
    });
    if (p.occasion === 'eid' || p.category === 'abayas') {
      await prisma.productCollection.create({
        data: { productId: product.id, collectionId: eid.id },
      });
    }
    if (p.prayerReady || p.occasion === 'prayer') {
      await prisma.productCollection.create({
        data: { productId: product.id, collectionId: ramadan.id },
      });
    }
    if (p.occasion === 'winter') {
      await prisma.productCollection.create({
        data: { productId: product.id, collectionId: winter.id },
      });
    }
    const ids: string[] = [];
    for (const size of p.sizes) {
      for (const color of p.colors) {
        const sku = `MF-${p.slug}-${size}-${color}`
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
            barcode: sku,
            size,
            color,
            costCents: p.cost,
            priceCents: p.price,
            fabric: fabricFor(p),
            weightGrams: weightGramsFor(p.category),
          },
        });
        await prisma.inventoryLevel.create({
          data: {
            variantId: variant.id,
            locationId: warehouse.id,
            onHand: p.openingQty,
            reorderPoint: Math.max(4, Math.round(p.openingQty / 5)),
          },
        });
        ids.push(variant.id);
      }
    }
    variantByProduct.set(p.slug, ids);
  }

  const suppliersByCountry = new Map<string, string>();
  for (const s of SUPPLIERS) {
    const row = await prisma.supplier.create({
      data: { ...s, example: true, notes: 'Seed example contact — verify before outreach.' },
    });
    if (!suppliersByCountry.has(s.country)) suppliersByCountry.set(s.country, row.id);
  }

  for (const p of PRODUCTS) {
    const supplierId = suppliersByCountry.get(p.origin ?? 'TR');
    const product = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!supplierId || !product) continue;
    await prisma.supplierProduct.create({
      data: {
        supplierId,
        productId: product.id,
        unitCostCents: p.cost,
        moq:
          p.category === 'hijabs' || p.category === 'undercaps'
            ? 50
            : p.category === 'accessories'
              ? 100
              : 10,
        leadDays: p.origin === 'CN' ? 35 : p.origin === 'TR' ? 18 : 21,
      },
    });
  }

  for (const po of YEAR1_POS) {
    const supplierId = suppliersByCountry.get(po.country);
    if (!supplierId) continue;
    const created = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        monthBucket: po.bucket,
        status: PurchaseOrderStatus.DRAFT,
        notes: `Year 1 plan ${po.bucket} / ${po.country}`,
      },
    });
    for (const line of po.lines) {
      const variantId = variantByProduct.get(line.slug)?.[0];
      const product = await prisma.product.findUnique({ where: { slug: line.slug } });
      if (!variantId || !product) continue;
      const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
      await prisma.purchaseOrderLine.create({
        data: {
          purchaseOrderId: created.id,
          variantId,
          quantity: line.qty,
          unitCostCents: variant?.costCents ?? 0,
        },
      });
    }
  }

  await prisma.promoCode.create({
    data: { code: 'EID10', type: 'PERCENT', value: 1000, active: true },
  });

  const campaign = await prisma.campaign.create({
    data: {
      name: 'Ramadan / Eid Year 1',
      season: CampaignSeason.RAMADAN,
      audience: 'Dublin opted-in customers',
      landingSlug: 'ramadan',
    },
  });
  await prisma.contentCalendarItem.create({
    data: {
      campaignId: campaign.id,
      channel: 'INSTAGRAM',
      caption: 'Ramadan edit is live. Modest, photographed, Dublin collection available.',
      publishOn: new Date(),
    },
  });

  const totalLines = await prisma.purchaseOrderLine.aggregate({ _sum: { quantity: true } });
  console.log(`Seeded. Planned PO units: ${totalLines._sum.quantity ?? 0}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
