import { Injectable, Logger } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  async sendOrderPaid(order: {
    id: string;
    email: string;
    name: string;
    totalCents: number;
    channel: SalesChannel;
    trackingToken: string;
    items: { title: string; quantity: number }[];
  }) {
    if (order.channel === SalesChannel.POS) return { skipped: true };
    const site = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const lines = order.items.map((i) => `${i.title} × ${i.quantity}`).join('<br/>');
    const html = `
      <p>Assalamu alaikum ${order.name},</p>
      <p>We have your Motive Fashion order <strong>${order.id.slice(0, 8)}</strong>.</p>
      <p>${lines}</p>
      <p>Total €${(order.totalCents / 100).toFixed(2)} inc. VAT.</p>
      <p><a href="${site}/order/${order.id}?token=${order.trackingToken}">Track your order</a></p>
      <p>Motive Fashion, Dublin</p>
    `;
    return this.send(order.email, 'Your Motive Fashion order', html);
  }

  async send(to: string, subject: string, html: string) {
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
        from: process.env.EMAIL_FROM ?? 'Motive Fashion <hello@motivefashion.ie>',
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      this.log.error(`Resend ${res.status} ${await res.text()}`);
      return { ok: false };
    }
    return { ok: true };
  }
}
