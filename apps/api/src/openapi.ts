export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Motive Fashion API',
    version: '0.1.0',
    description: 'REST `/api/v1` for the Motive Fashion storefront, admin, POS, and mobile app. Postgres is the inventory source of truth.',
  },
  servers: [{ url: '/api/v1', description: 'Same-origin BFF or Nest global prefix' }],
  tags: [
    { name: 'Health' },
    { name: 'Catalog' },
    { name: 'Cart' },
    { name: 'Checkout' },
    { name: 'Auth' },
    { name: 'Account' },
    { name: 'Stock' },
    { name: 'Admin' },
    { name: 'POS' },
    { name: 'Access' },
    { name: 'Contact' },
    { name: 'Webhooks' },
  ],
  components: {
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'mf_access' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { statusCode: { type: 'integer' }, message: { type: 'string' } },
      },
      CartAdd: {
        type: 'object',
        required: ['variantId', 'quantity'],
        properties: {
          variantId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1, maximum: 20 },
        },
      },
      CheckoutSession: {
        type: 'object',
        required: ['cartId', 'fulfillment', 'email', 'name'],
        properties: {
          cartId: { type: 'string', format: 'uuid' },
          fulfillment: { type: 'string', enum: ['DELIVERY', 'COLLECTION'] },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          phone: { type: 'string' },
          promoCode: { type: 'string' },
          paymentMethod: { type: 'string', enum: ['CARD', 'CASH'] },
          returnPolicyAck: { type: 'boolean' },
          addressId: { type: 'string', format: 'uuid' },
          county: { type: 'string' },
          sessionKey: { type: 'string' },
          giftNote: { type: 'string' },
          address: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Liveness', responses: { '200': { description: 'OK' } } },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Postgres + Redis',
        responses: { '200': { description: 'Ready' }, '503': { description: 'Dependency down' } },
      },
    },
    '/openapi.json': {
      get: { tags: ['Health'], summary: 'OpenAPI document', responses: { '200': { description: 'OK' } } },
    },
    '/contact': {
      post: {
        tags: ['Contact'],
        summary: 'Storefront contact form',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'message'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  message: { type: 'string' },
                  company: { type: 'string', description: 'Honeypot' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '400': { description: 'Validation failed' } },
      },
    },
    '/catalog/categories': {
      get: { tags: ['Catalog'], summary: 'List categories', responses: { '200': { description: 'OK' } } },
    },
    '/catalog/collections': {
      get: { tags: ['Catalog'], summary: 'List collections', responses: { '200': { description: 'OK' } } },
    },
    '/catalog/products': {
      get: {
        tags: ['Catalog'],
        summary: 'List products',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'collection', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'occasion', in: 'query', schema: { type: 'string' } },
          { name: 'sku', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/catalog/products/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Product by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get or create cart',
        parameters: [
          { name: 'cartId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'sessionKey', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: { tags: ['Cart'], summary: 'Create cart', responses: { '201': { description: 'Created' }, '200': { description: 'OK' } } },
    },
    '/cart/{id}/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add line (reserves stock)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CartAdd' } } } },
        responses: { '200': { description: 'OK' }, '400': { description: 'Insufficient stock' } },
      },
    },
    '/cart/{id}/items/{itemId}': {
      post: {
        tags: ['Cart'],
        summary: 'Set line quantity',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove line (releases stock)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/checkout/options': {
      get: {
        tags: ['Checkout'],
        summary: 'Published fulfilment, public payments, and county rates',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/checkout/quote': {
      post: {
        tags: ['Checkout'],
        summary: 'Live cart quote (shipping, promo, totals)',
        responses: { '200': { description: 'OK' }, '400': { description: 'Invalid promo or method' } },
      },
    },
    '/checkout/session': {
      post: {
        tags: ['Checkout'],
        summary: 'Create order from cart',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutSession' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/checkout/{orderId}/pay': {
      post: {
        tags: ['Checkout'],
        summary: 'Stripe Checkout Session or mock pay',
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'token', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/checkout/{orderId}/sync': {
      post: {
        tags: ['Checkout'],
        summary: 'Confirm paid from Stripe session (success page, before webhook)',
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'token', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/orders/{id}/track': {
      get: {
        tags: ['Checkout'],
        summary: 'Tokenised order tracking',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'token', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Missing owner or token' } },
      },
    },
    '/auth/register': { post: { tags: ['Auth'], summary: 'Register', responses: { '200': { description: 'Sets mf_access / mf_refresh cookies' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login', responses: { '200': { description: 'Sets cookies' } } } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate refresh token', responses: { '200': { description: 'OK' } } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Revoke refresh + clear cookies', responses: { '200': { description: 'OK' } } } },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        responses: { '200': { description: 'Always OK (does not reveal whether the email exists)' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set a new password from a reset token',
        responses: { '200': { description: 'Sets cookies' }, '400': { description: 'Invalid or expired token' } },
      },
    },
    '/account/me': {
      get: {
        tags: ['Account'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Current user',
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/account/orders': { get: { tags: ['Account'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'My orders', responses: { '200': { description: 'OK' } } } },
    '/account/wishlist': { get: { tags: ['Account'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Wishlist', responses: { '200': { description: 'OK' } } } },
    '/account/gdpr-export': { get: { tags: ['Account'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'DSR export', responses: { '200': { description: 'OK' } } } },
    '/account/gdpr-delete': { post: { tags: ['Account'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'DSR delete', responses: { '200': { description: 'OK' } } } },
    '/stock/suggestions': {
      get: {
        tags: ['Stock'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Restock suggestions',
        responses: { '200': { description: 'OK' }, '403': { description: 'Staff only' } },
      },
    },
    '/stock/adjust': { post: { tags: ['Stock'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Adjust on-hand', responses: { '200': { description: 'OK' } } } },
    '/stock/transfer': { post: { tags: ['Stock'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Transfer between locations', responses: { '200': { description: 'OK' } } } },
    '/channels/pos/sales': {
      post: {
        tags: ['POS'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Tablet POS sale (prices from SKU)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/pos/devices': { get: { tags: ['POS'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'POS devices', responses: { '200': { description: 'OK' } } } },
    '/admin/pos/print/{orderId}': {
      post: {
        tags: ['POS'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Print ESC/POS till ticket (Epson USB COM or TCP 9100)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/staff/orders': {
      get: {
        tags: ['POS'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Till sales placed by the signed-in staff member',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/staff/orders/{id}': {
      get: {
        tags: ['POS'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'One till sale placed by the signed-in staff member',
        responses: { '200': { description: 'OK' }, '403': { description: 'Not this cashier' } },
      },
    },
    '/staff/orders/{id}/print': {
      post: {
        tags: ['POS'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Reprint this cashier’s till ticket',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/staff/orders/{id}/email': {
      post: {
        tags: ['POS'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Email the PDF receipt for this cashier’s till sale',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/analytics': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Dashboard stats', responses: { '200': { description: 'OK' } } } },
    '/admin/products': {
      get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'List products', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Create product', responses: { '200': { description: 'OK' } } },
    },
    '/admin/orders': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'List orders', responses: { '200': { description: 'OK' } } } },
    '/admin/orders/{id}/status': {
      post: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Advance fulfilment (pack / ship / collect)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '400': { description: 'Not the next step' } },
      },
    },
    '/admin/whatsapp/broadcast': {
      post: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Opt-in WhatsApp broadcast (ADMIN). Only this route; marketing duplicate removed.',
        responses: { '200': { description: 'OK' }, '403': { description: 'Admin only' } },
      },
    },
    '/rbac/permissions': {
      get: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'List permissions (locked keys omitted)',
        responses: { '200': { description: 'OK' }, '403': { description: 'Forbidden' } },
      },
      post: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Create a custom permission key (labels extra keys; does not unlock routes until code checks them)',
        responses: { '200': { description: 'Created' }, '400': { description: 'Duplicate or locked key' } },
      },
    },
    '/rbac/permissions/{id}': {
      patch: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Rename or regroup a permission (built-in keys stay undeletable)',
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Delete a custom permission (built-in catalog keys refused)',
        responses: { '200': { description: 'OK' }, '400': { description: 'Built-in or in use' } },
      },
    },
    '/rbac/roles': {
      get: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'List roles (super-admin omitted)',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Create a custom role',
        responses: { '200': { description: 'Created' } },
      },
    },
    '/rbac/roles/{id}': {
      get: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Get a role',
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Rename a role or replace its permissions',
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Delete a custom role',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/rbac/users': {
      get: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'List users and role memberships (platform super-admin omitted)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/rbac/users/{id}/roles': {
      put: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Replace a user’s roles (cannot assign or edit super-admin)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/webhooks/stripe': { post: { tags: ['Webhooks'], summary: 'Stripe (raw body + signature)', responses: { '200': { description: 'OK' } } } },
    '/webhooks/whatsapp': {
      get: { tags: ['Webhooks'], summary: 'Meta verify', responses: { '200': { description: 'Challenge' } } },
      post: { tags: ['Webhooks'], summary: 'Inbound WhatsApp', responses: { '200': { description: 'OK' } } },
    },
    '/webhooks/square': { post: { tags: ['Webhooks'], summary: 'Optional Square terminal (unsigned refused in production)', responses: { '200': { description: 'OK' } } } },
  },
} as const;
