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
    '/health/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Uptime, memory, in-process HTTP counts and p95 (JSON)',
        responses: { '200': { description: 'OK' } },
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
      get: { tags: ['Catalog'], summary: 'Published collections', responses: { '200': { description: 'OK' } } },
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
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
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
    '/auth/register': { post: { tags: ['Auth'], summary: 'Register', responses: { '200': { description: 'Needs email verification; no cookies until verified' } } } },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        responses: {
          '200': { description: 'Sets cookies, or returns mfaRequired + mfaToken' },
          '403': { description: 'Email not verified' },
          '429': { description: 'Locked after failed attempts' },
        },
      },
    },
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
        responses: { '200': { description: 'Sets cookies, or needs verification / MFA' }, '400': { description: 'Invalid or expired token' } },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Confirm email from a verification token',
        responses: { '200': { description: 'Sets cookies' }, '400': { description: 'Invalid or expired token' } },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the verification email',
        responses: { '200': { description: 'Always OK (does not reveal whether the email exists)' } },
      },
    },
    '/auth/mfa/setup': {
      post: {
        tags: ['Auth'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Start TOTP setup; returns secret, otpauth URI, and backup codes once',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/mfa/enable': {
      post: {
        tags: ['Auth'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Confirm TOTP and turn MFA on',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/mfa/disable': {
      post: {
        tags: ['Auth'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Turn MFA off with password and authenticator or backup code',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/mfa/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Finish login with TOTP or a backup code',
        responses: { '200': { description: 'Sets cookies' } },
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
    '/account/orders/{id}': {
      get: {
        tags: ['Account'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'One of my orders',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/account/wishlist': { get: { tags: ['Account'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Wishlist', responses: { '200': { description: 'OK' } } } },
    '/account/gdpr-export': { get: { tags: ['Account'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'DSR export', responses: { '200': { description: 'OK' } } } },
    '/account/gdpr-delete': { post: { tags: ['Account'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'DSR delete', responses: { '200': { description: 'OK' } } } },
    '/account/reviews/eligibility': {
      get: {
        tags: ['Account'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Whether this account can review a product after delivery or collection',
        parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '400': { description: 'Invalid product' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/account/reviews': {
      post: {
        tags: ['Account'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Submit a product review after delivery or collection',
        responses: { '200': { description: 'Pending moderation' }, '400': { description: 'Not eligible' } },
      },
    },
    '/account/push-tokens': {
      post: {
        tags: ['Account'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Register an Expo push token',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/consent': {
      post: {
        tags: ['Account'],
        summary: 'Record cookie consent choice and policy version',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/returns': {
      post: {
        tags: ['Checkout'],
        summary: 'Request a return with tracking token or owner JWT',
        responses: { '200': { description: 'OK' }, '400': { description: 'Not eligible' } },
      },
    },
    '/admin/returns': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'List returns', responses: { '200': { description: 'OK' } } } },
    '/admin/reviews': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Moderate reviews', responses: { '200': { description: 'OK' } } } },
    '/admin/promo-codes': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'List coupon codes with schedule and use cap',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Create a coupon (PERCENT is basis points; FIXED is EUR cents)',
        responses: { '200': { description: 'Created' }, '400': { description: 'Invalid or duplicate code' } },
      },
    },
    '/admin/promo-codes/{id}': {
      patch: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Update coupon schedule, cap, type, or on/off',
        responses: { '200': { description: 'OK' }, '400': { description: 'Invalid' } },
      },
    },
    '/admin/audit': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Commerce audit log', responses: { '200': { description: 'OK' } } } },
    '/admin/audit/export': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Commerce audit CSV', responses: { '200': { description: 'CSV' } } } },
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
    '/stock/bin': { post: { tags: ['Stock'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Set warehouse bin code on an inventory level', responses: { '200': { description: 'OK' } } } },
    '/admin/procurement/suppliers': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Suppliers with open buy, inbound, and 30-day sell-through',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/procurement/suppliers/{id}': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'One supplier: purchase orders, on-hand, sold, and selling pace',
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/admin/procurement/catalog': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Products that can be linked to a mill',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/procurement/suppliers/{id}/products': {
      post: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Link a product to a supplier (MOQ, factory cost, lead days)',
        responses: { '201': { description: 'Created' }, '400': { description: 'Already linked' } },
      },
    },
    '/admin/procurement/suppliers/{id}/products/{productId}': {
      patch: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        summary: 'Update MOQ, factory cost, or lead days',
        responses: { '200': { description: 'OK' }, '404': { description: 'Not linked' } },
      },
      delete: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        summary: 'Unlink a product from a supplier',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/procurement/purchase-orders': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Purchase orders',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Create a draft purchase order (supplier, SKUs, quantities)',
        responses: { '201': { description: 'Created' }, '400': { description: 'Invalid lines or below MOQ' } },
      },
    },
    '/admin/procurement/purchase-orders/export': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Purchase orders as CSV',
        responses: { '200': { description: 'CSV' } },
      },
    },
    '/admin/procurement/purchase-orders/{id}': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'One purchase order',
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Update a draft purchase order (qty, factory cost, notes)',
        responses: { '200': { description: 'OK' }, '400': { description: 'Not a draft' } },
      },
    },
    '/admin/procurement/purchase-orders/{id}/cancel': {
      post: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Cancel a draft purchase order',
        responses: { '200': { description: 'OK' }, '400': { description: 'Not a draft' } },
      },
    },
    '/admin/procurement/suggestions': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Warehouse restock suggestions grouped for raising a PO',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/procurement/calendar': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Purchase orders grouped by month and status',
        responses: { '200': { description: 'OK' } },
      },
    },
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
    '/staff/orders/{id}/refund': {
      post: {
        tags: ['POS'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Refund a till sale — cash drawer or Stripe card',
        responses: { '200': { description: 'OK' }, '400': { description: 'Not refundable' } },
      },
    },
    '/admin/analytics': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Dashboard stats, daily series, fulfilment split, AOV', responses: { '200': { description: 'OK' } } } },
    '/admin/analytics/export': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Analytics CSV for the selected date range', responses: { '200': { description: 'CSV' } } } },
    '/admin/marketing/calendar/export': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Marketing calendar CSV', responses: { '200': { description: 'CSV' } } } },
    '/admin/products': {
      get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'List products', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Create product', responses: { '200': { description: 'OK' } } },
    },
    '/admin/collections': {
      get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'List merchandising collections', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Create a collection', responses: { '200': { description: 'OK' }, '400': { description: 'Invalid' } } },
    },
    '/admin/collections/{id}': {
      patch: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Update or publish a collection', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'Delete a collection', responses: { '200': { description: 'OK' } } },
    },
    '/admin/orders': { get: { tags: ['Admin'], security: [{ bearer: [] }, { cookieAuth: [] }], summary: 'List all-channel orders including till sales', responses: { '200': { description: 'OK' } } } },
    '/admin/orders/{id}/pack': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Pick list for pack station (SKU, barcode, warehouse bin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/admin/refunds': {
      get: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'List cash drawer and Stripe card refunds',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/orders/{id}/refund': {
      post: {
        tags: ['Admin'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Refund cash in-store or card via Stripe',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '400': { description: 'Not refundable' } },
      },
    },
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
    '/rbac/audit': {
      get: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Access-control audit log for Super admin',
        responses: { '200': { description: 'OK' }, '403': { description: 'Forbidden' } },
      },
    },
    '/rbac/audit/export': {
      get: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'Access-control audit CSV for Super admin',
        responses: { '200': { description: 'CSV' }, '403': { description: 'Forbidden' } },
      },
    },
    '/rbac/export': {
      get: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        summary: 'CSV of roles, people, and permission grants',
        responses: { '200': { description: 'CSV' } },
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
    '/rbac/roles/{id}/clone': {
      post: {
        tags: ['Access'],
        security: [{ bearer: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        summary: 'Clone a visible role (new non-system copy)',
        responses: { '200': { description: 'Created' } },
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
        summary: 'Replace a user’s roles (cannot assign super-admin or strip the last commerce admin)',
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
