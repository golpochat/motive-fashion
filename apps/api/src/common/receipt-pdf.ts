import PDFDocument from 'pdfkit';
import { BRAND, PALETTE, RETURN_POSTAGE_NOTICE, legalDisplayName, pricesIncludeVatCopy, totalIncLabel, vatNumberDisplay } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import { brandMarkPng } from './brand-assets';
import {
  addressLine,
  discountLabel,
  fulfilmentLabel,
  shippingAmount,
  shippingLabel,
  trackUrl,
  type ReceiptOrder,
} from './receipt';

export function buildReceiptPdf(order: ReceiptOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: `Receipt ${order.id}`, Author: legalDisplayName() } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const mark = brandMarkPng();
    if (mark) {
      doc.image(mark, 56, 48, { width: 28, height: 28 });
      doc.font('Helvetica').fontSize(12).fillColor(PALETTE.ink).text(BRAND.name, 92, 55);
    } else {
      doc.font('Helvetica-Bold').fontSize(14).fillColor(PALETTE.ink).text(BRAND.name, 56, 52);
    }

    doc.moveTo(56, 92).lineTo(539, 92).strokeColor(PALETTE.clay).lineWidth(1.5).stroke();

    doc.font('Helvetica').fontSize(9).fillColor('#8a8178').text('ORDER CONFIRMED', 56, 108);
    doc.font('Times-Bold').fontSize(26).fillColor(PALETTE.ink).text('Thank you', 56, 122);
    doc.font('Helvetica').fontSize(11).fillColor('#4a453f')
      .text(`Assalamu alaikum ${order.name}. This is your receipt.`, 56, 156, { width: 480 });

    doc.roundedRect(56, 186, 90, 18, 9).fill(PALETTE.cream);
    doc.fillColor(PALETTE.ink).fontSize(8).text('PAID', 56, 191, { width: 90, align: 'center' });

    doc.fillColor('#8a8178').fontSize(8).text('ORDER', 56, 220);
    doc.font('Courier').fontSize(9).fillColor(PALETTE.ink).text(order.id, 56, 234, { width: 480 });

    let y = 262;
    doc.font('Helvetica');
    for (const item of order.items) {
      doc.fontSize(11).fillColor(PALETTE.ink).text(`${item.title}  × ${item.quantity}`, 56, y, { width: 360 });
      doc.text(formatEur(item.unitPriceCents * item.quantity), 420, y, { width: 119, align: 'right' });
      y += 16;
      doc.fontSize(9).fillColor('#6b645e').text(`${item.size} / ${item.color}  ·  ${formatEur(item.unitPriceCents)} each`, 56, y);
      y += 22;
    }

    doc.moveTo(56, y).lineTo(539, y).strokeColor('#e7e0d6').lineWidth(1).stroke();
    y += 12;

    const totals: [string, string][] = [
      ['Subtotal', formatEur(order.subtotalCents)],
      ...(order.discountCents > 0 ? [[discountLabel(order), `−${formatEur(order.discountCents)}`] as [string, string]] : []),
      [shippingLabel(order), shippingAmount(order)],
      [totalIncLabel(), formatEur(order.totalCents)],
    ];
    for (const row of totals) {
      const label = row[0];
      const value = row[1];
      if (!label || !value) continue;
      const last = label.startsWith('Total');
      doc.font(last ? 'Helvetica-Bold' : 'Helvetica').fontSize(last ? 12 : 10).fillColor(PALETTE.ink)
        .text(label, 56, y, { width: 280 });
      doc.text(value, 340, y, { width: 199, align: 'right' });
      y += last ? 22 : 16;
    }
    const vatLine = vatNumberDisplay() ? ` ${vatNumberDisplay()}` : '';
    doc.font('Helvetica').fontSize(9).fillColor('#8a8178').text(`${pricesIncludeVatCopy()}${vatLine}`, 56, y);
    y += 28;

    doc.fontSize(8).fillColor('#8a8178').text('FULFILMENT', 56, y);
    y += 14;
    doc.fontSize(11).fillColor(PALETTE.ink).text(fulfilmentLabel(order), 56, y);
    y += 16;
    const address = addressLine(order);
    if (address) {
      doc.fontSize(10).fillColor('#4a453f').text(address, 56, y, { width: 480 });
      y += doc.heightOfString(address, { width: 480 }) + 8;
    }
    if (order.giftNote) {
      doc.fontSize(10).fillColor('#4a453f').text(`Gift note: ${order.giftNote}`, 56, y, { width: 480 });
      y += 18;
    }

    y += 12;
    doc.fontSize(9).fillColor('#4a453f').text(RETURN_POSTAGE_NOTICE, 56, y, { width: 480 });
    y += doc.heightOfString(RETURN_POSTAGE_NOTICE, { width: 480 }) + 16;
    doc.fontSize(10).fillColor(PALETTE.clay).text('Track your order', 56, y, { link: trackUrl(order), underline: true });

    const support = BRAND.supportEmail;
    const footer = `${legalDisplayName()}  ·  ${BRAND.city}, ${BRAND.country}  ·  ${support}`;
    const footerY = doc.page.height - doc.page.margins.bottom - 10;
    doc.fontSize(8).fillColor('#8a8178').text(footer, 56, footerY, {
      width: 480,
      lineBreak: false,
      height: 10,
    });

    doc.end();
  });
}
