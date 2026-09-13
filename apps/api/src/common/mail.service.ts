import { Injectable, Logger } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { BRAND, carrierLabel, carrierTrackUrl } from '@motive-fashion/config';
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
    options?: { to?: string },
  ) {
    const to = options?.to?.trim() || order.email;
    if (!options?.to && order.channel === SalesChannel.POS && (!to || to === 'pos@motivefashion.ie')) {
      return { skipped: true };
    }
    const receipt = toReceiptOrder({ ...order, email: to });
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

    return this.send(to, 'Order confirmed · Motive Fashion', html, { text, attachments });
  }

  async sendOrderStatus(
    order: ReceiptOrder & {
      channel: SalesChannel;
      shipments?: { carrier?: string | null; trackingNo?: string | null }[];
    },
  ) {
    if (order.channel === SalesChannel.POS && (!order.email || order.email === 'pos@motivefashion.ie')) {
      return { skipped: true };
    }
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

  async sendPasswordReset(to: string, url: string) {
    const html = `<p>Assalamu alaikum.</p><p>Use this link to choose a new Motive Fashion password. It expires in one hour.</p><p><a href="${url.replace(/&/g, '&amp;')}">Choose a new password</a></p><p>If you did not ask for this, you can ignore the email.</p>`;
    const text = `Assalamu alaikum.\n\nChoose a new Motive Fashion password (expires in one hour):\n${url}\n\nIf you did not ask for this, ignore this email.`;
    const result = await this.send(to, 'Reset your password · Motive Fashion', html, { text });
    if (result && 'skipped' in result && result.skipped) {
      this.log.log(`Password reset link (email skipped): ${url}`);
    }
    return result;
  }

  async sendEmailVerification(to: string, url: string) {
    const html = `<p>Assalamu alaikum.</p><p>Confirm this email for your Motive Fashion account. The link expires in 24 hours.</p><p><a href="${url.replace(/&/g, '&amp;')}">Verify email</a></p><p>If you did not create an account, you can ignore this email.</p>`;
    const text = `Assalamu alaikum.\n\nConfirm this email for your Motive Fashion account (expires in 24 hours):\n${url}\n\nIf you did not create an account, ignore this email.`;
    const result = await this.send(to, 'Verify your email · Motive Fashion', html, { text });
    if (result && 'skipped' in result && result.skipped) {
      this.log.log(`Email verification link (email skipped): ${url}`);
    }
    return result;
  }

  async sendContactEnquiry(input: { name: string; email: string; phone?: string; message: string }) {
    const to = process.env.CONTACT_TO ?? process.env.EMAIL_REPLY_TO ?? BRAND.supportEmail;
    const phone = input.phone ? `<p>Phone: ${escapeHtml(input.phone)}</p>` : '';
    const html = `<p>Storefront message from ${escapeHtml(input.name)}.</p><p>Email: ${escapeHtml(input.email)}</p>${phone}<p>${escapeHtml(input.message).replace(/\n/g, '<br/>')}</p>`;
    const text = `Storefront message from ${input.name}.\nEmail: ${input.email}\n${input.phone ? `Phone: ${input.phone}\n` : ''}\n${input.message}`;
    const result = await this.send(to, `Contact · ${input.name} · Motive Fashion`, html, {
      text,
      replyTo: input.email,
    });
    if (result && 'skipped' in result && result.skipped) {
      this.log.log(`Contact enquiry (email skipped) from ${input.email}: ${input.message.slice(0, 200)}`);
    }
    return result;
  }

  async send(
    to: string,
    subject: string,
    html: string,
    extras?: {
      text?: string;
      replyTo?: string;
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
        reply_to: extras?.replyTo ?? process.env.EMAIL_REPLY_TO ?? 'info@motivefashion.com',
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
