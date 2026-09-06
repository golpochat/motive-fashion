import { Injectable, Logger } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { carrierLabel, carrierTrackUrl } from '@motive-fashion/config';
import { brandMarkPng } from './brand-assets';
import { orderPaidHtml, orderPaidText, orderStatusUpdateHtml, orderStatusUpdateText } from './receipt-html';
import { buildReceiptPdf } from './receipt-pdf';
import { receiptFilename, toReceiptOrder, type ReceiptOrder } from './receipt';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  async sendOrderPaid(
    order: ReceiptOrder & {
      channel: SalesChannel;
    },
  ) {
    if (order.channel === SalesChannel.POS) return { skipped: true };
    const receipt = toReceiptOrder(order);
    const mark = brandMarkPng();
    const html = orderPaidHtml(receipt, { inlineLogo: Boolean(mark) });
    const text = orderPaidText(receipt);

    const attachments: Array<{
      filename: string;
      content: string;
      content_type: string;
      content_id?: string;
      content_disposition?: 'inline' | 'attachment';
    }> = [];

    try {
      const pdf = await buildReceiptPdf(receipt);
      attachments.push({
        filename: receiptFilename(receipt),
        content: pdf.toString('base64'),
        content_type: 'application/pdf',
        content_disposition: 'attachment',
      });
    } catch (err) {
      this.log.error(`Receipt PDF failed for ${receipt.id}: ${err instanceof Error ? err.message : err}`);
    }

    if (mark) {
      attachments.push({
        filename: 'motive-fashion-mark.png',
        content: mark.toString('base64'),
        content_type: 'image/png',
        content_id: 'brand-mark',
        content_disposition: 'inline',
      });
    }

    return this.send(receipt.email, 'Order confirmed · Motive Fashion', html, { text, attachments });
  }

  async sendOrderStatus(
    order: ReceiptOrder & {
      channel: SalesChannel;
      shipments?: { carrier?: string | null; trackingNo?: string | null }[];
    },
  ) {
    if (order.channel === SalesChannel.POS) return { skipped: true };
    const receipt = toReceiptOrder(order);
    const ready = receipt.status === 'READY_FOR_COLLECTION';
    const courier = carrierTrackUrl(receipt.carrier, receipt.trackingNo);
    const extra = ready
      ? undefined
      : receipt.trackingNo
        ? `${carrierLabel(receipt.carrier) || 'Courier'} ${receipt.trackingNo}${courier ? ` · ${courier}` : ''}`
        : undefined;
    const copy = ready
      ? {
          kicker: 'Ready to collect',
          heading: 'Ready in Dublin',
          body: "Your order is ready to collect. Bring this email or your order number.",
        }
      : {
          kicker: 'Shipped',
          heading: 'On its way',
          body: "We've dispatched your Motive Fashion order.",
          extra,
        };
    const html = orderStatusUpdateHtml(receipt, copy);
    const text = orderStatusUpdateText(receipt, copy);
    const subject = ready ? 'Ready to collect · Motive Fashion' : 'Your order is on its way · Motive Fashion';
    return this.send(receipt.email, subject, html, { text });
  }

  async send(
    to: string,
    subject: string,
    html: string,
    extras?: {
      text?: string;
      attachments?: Array<{
        filename: string;
        content: string;
        content_type: string;
        content_id?: string;
        content_disposition?: 'inline' | 'attachment';
      }>;
    },
  ) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      this.log.log(`Email skipped (RESEND_API_KEY unset): ${subject} → ${to}`);
      return { skipped: true };
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Motive Fashion <info@motivefashion.com>',
        to: [to],
        reply_to: process.env.EMAIL_REPLY_TO ?? 'info@motivefashion.com',
        subject,
        html,
        text: extras?.text,
        attachments: extras?.attachments?.length ? extras.attachments : undefined,
      }),
    });
    if (!res.ok) {
      this.log.error(`Resend ${res.status} ${await res.text()}`);
      return { ok: false };
    }
    return { ok: true };
  }
}
