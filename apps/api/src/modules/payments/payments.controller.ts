import { Controller, Headers, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CurrentUser, OptionalJwtGuard, ShopperGuard } from '../../common/auth';

@Controller()
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post('checkout/:orderId/pay')
  @UseGuards(OptionalJwtGuard, ShopperGuard)
  pay(
    @Param('orderId') orderId: string,
    @Query('token') token?: string,
    @CurrentUser() user?: { sub: string },
  ) {
    return this.payments.createCheckoutSession(orderId, { token, userId: user?.sub });
  }

  @Post('checkout/:orderId/sync')
  @UseGuards(OptionalJwtGuard, ShopperGuard)
  sync(
    @Param('orderId') orderId: string,
    @Query('token') token?: string,
    @CurrentUser() user?: { sub: string },
  ) {
    return this.payments.syncPaid(orderId, { token, userId: user?.sub });
  }

  @Post('webhooks/stripe')
  stripe(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody ?? (req.body as Buffer);
    return this.payments.handleStripeWebhook(raw, signature);
  }
}
