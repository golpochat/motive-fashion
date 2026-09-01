import { Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout/:orderId/pay')
  pay(@Param('orderId') orderId: string) {
    return this.payments.createCheckoutSession(orderId);
  }

  @Post('webhooks/stripe')
  stripe(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody ?? (req.body as Buffer);
    return this.payments.handleStripeWebhook(raw, signature);
  }
}
