import { BRAND, PALETTE, RETURN_POSTAGE_NOTICE } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import {
  addressLine,
  discountLabel,
  fulfilmentLabel,
  shippingAmount,
  shippingLabel,
  trackUrl,
  type ReceiptOrder,
} from './receipt';

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function orderPaidText(order: ReceiptOrder) {
  const address = addressLine(order);
  const support = process.env.EMAIL_REPLY_TO ?? 'info@motivefashion.com';
  const items = order.items
    .map(
      (item) =>
        `${item.title} × ${item.quantity} (${item.size} / ${item.color}) ${formatEur(item.unitPriceCents * item.quantity)}`,
    )
    .join('\n');
  const discount =
    order.discountCents > 0 ? `${discountLabel(order)} −${formatEur(order.discountCents)}\n` : '';
  return [
    `Assalamu alaikum ${order.name}.`,
    '',
    `We've confirmed your Motive Fashion order.`,
    `Order ${order.id}`,
    '',
    items,
    '',
    `Subtotal ${formatEur(order.subtotalCents)}`,
    discount.trimEnd(),
    `${shippingLabel(order)} ${shippingAmount(order)}`,
    `Total inc. VAT ${formatEur(order.totalCents)}`,
    '',
    fulfilmentLabel(order),
    address ?? '',
    order.giftNote ? `Gift note: ${order.giftNote}` : '',
    '',
    RETURN_POSTAGE_NOTICE,
    '',
    `Track your order: ${trackUrl(order)}`,
    '',
    `${BRAND.legalName} · ${BRAND.city}, ${BRAND.country}`,
    support,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function orderPaidHtml(order: ReceiptOrder, options?: { inlineLogo?: boolean }) {
  const track = trackUrl(order);
  const address = addressLine(order);
  const support = process.env.EMAIL_REPLY_TO ?? 'info@motivefashion.com';
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e7e0d6;font-size:14px;color:${PALETTE.ink};">
            ${esc(item.title)} × ${item.quantity}
            <div style="margin-top:4px;font-size:12px;color:#6b645e;">${esc(item.size)} / ${esc(item.color)} · ${formatEur(item.unitPriceCents)} each</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #e7e0d6;font-size:14px;color:${PALETTE.ink};text-align:right;white-space:nowrap;">
            ${formatEur(item.unitPriceCents * item.quantity)}
          </td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en-IE">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Order confirmed</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.cream};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.cream};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:8px 8px 20px;">
              ${
                options?.inlineLogo
                  ? `<img src="cid:brand-mark" width="32" height="32" alt="" style="vertical-align:middle;border-radius:7px;" />`
                  : ''
              }
              <span style="display:inline-block;${options?.inlineLogo ? 'margin-left:10px;' : ''}font-family:Arial,Helvetica,sans-serif;font-size:15px;letter-spacing:0.02em;color:${PALETTE.ink};vertical-align:middle;">${esc(BRAND.name)}</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e7e0d6;border-radius:16px;padding:28px 28px 8px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8178;">Order confirmed</p>
              <h1 style="margin:8px 0 0;font-size:32px;font-weight:500;color:${PALETTE.ink};">Thank you</h1>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#4a453f;">
                Assalamu alaikum ${esc(order.name)}. We've confirmed your order. A PDF receipt is attached.
              </p>
              <p style="margin:16px 0 0;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${PALETTE.ink};background:${PALETTE.cream};border-radius:999px;padding:6px 12px;">Paid</p>
            </td>
          </tr>
          <tr>
            <td style="height:12px;"></td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e7e0d6;border-radius:16px;padding:24px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8178;">Order</p>
              <p style="margin:8px 0 0;font-family:Consolas,Menlo,monospace;font-size:13px;color:${PALETTE.ink};word-break:break-all;">${esc(order.id)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;">
                ${itemRows}
                <tr>
                  <td style="padding:12px 0 4px;font-size:14px;color:#6b645e;">Subtotal</td>
                  <td style="padding:12px 0 4px;font-size:14px;color:${PALETTE.ink};text-align:right;">${formatEur(order.subtotalCents)}</td>
                </tr>
                ${
                  order.discountCents > 0
                    ? `<tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b645e;">${esc(discountLabel(order))}</td>
                  <td style="padding:4px 0;font-size:14px;color:${PALETTE.ink};text-align:right;">−${formatEur(order.discountCents)}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b645e;">${esc(shippingLabel(order))}</td>
                  <td style="padding:4px 0;font-size:14px;color:${PALETTE.ink};text-align:right;">${shippingAmount(order)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-size:16px;color:${PALETTE.ink};border-top:1px solid #e7e0d6;">Total inc. VAT</td>
                  <td style="padding:12px 0 0;font-size:16px;color:${PALETTE.ink};text-align:right;border-top:1px solid #e7e0d6;">${formatEur(order.totalCents)}</td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a8178;">Prices include VAT at ${(BRAND.vatRate * 100).toFixed(0)}%.</p>
            </td>
          </tr>
          <tr>
            <td style="height:12px;"></td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e7e0d6;border-radius:16px;padding:24px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8178;">Fulfilment</p>
              <p style="margin:8px 0 0;font-size:15px;color:${PALETTE.ink};">${esc(fulfilmentLabel(order))}</p>
              ${address ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#4a453f;">${esc(address)}</p>` : ''}
              ${order.giftNote ? `<p style="margin:12px 0 0;font-size:14px;color:#4a453f;">Gift note: ${esc(order.giftNote)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#4a453f;">
              ${esc(RETURN_POSTAGE_NOTICE)}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 8px 24px;">
              <a href="${esc(track)}" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${PALETTE.clay};">Track your order</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 8px 0;border-top:1px solid #e7e0d6;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8178;">
              ${esc(BRAND.legalName)} · ${esc(BRAND.city)}, ${esc(BRAND.country)}<br/>
              ${esc(support)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function orderStatusUpdateHtml(
  order: ReceiptOrder,
  copy: { kicker: string; heading: string; body: string; extra?: string },
) {
  const track = trackUrl(order);
  const support = process.env.EMAIL_REPLY_TO ?? 'info@motivefashion.com';
  return `<!DOCTYPE html>
<html lang="en-IE">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(copy.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.cream};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.cream};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:8px 8px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${PALETTE.ink};">${esc(BRAND.name)}</td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e7e0d6;border-radius:16px;padding:28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8178;">${esc(copy.kicker)}</p>
              <h1 style="margin:8px 0 0;font-size:32px;font-weight:500;color:${PALETTE.ink};">${esc(copy.heading)}</h1>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#4a453f;">
                Assalamu alaikum ${esc(order.name)}. ${esc(copy.body)}
              </p>
              ${copy.extra ? `<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#4a453f;">${esc(copy.extra)}</p>` : ''}
              <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8a8178;word-break:break-all;">Order ${esc(order.id)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 8px;">
              <a href="${esc(track)}" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${PALETTE.clay};">Track your order</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 8px 0;border-top:1px solid #e7e0d6;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8178;">
              ${esc(BRAND.legalName)} · ${esc(BRAND.city)}, ${esc(BRAND.country)}<br/>
              ${esc(support)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function orderStatusUpdateText(
  order: ReceiptOrder,
  copy: { heading: string; body: string; extra?: string },
) {
  return [
    `Assalamu alaikum ${order.name}.`,
    copy.body,
    copy.extra ?? '',
    `Order ${order.id}`,
    `Track your order: ${trackUrl(order)}`,
    `${BRAND.legalName} · ${BRAND.city}, ${BRAND.country}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
