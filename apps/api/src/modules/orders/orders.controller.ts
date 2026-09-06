import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, OptionalJwtGuard } from '../../common/auth';
import { OrdersService } from './orders.service';
import { CommerceService } from '../commerce/commerce.service';
import { checkoutQuoteSchema, checkoutSchema, returnRequestSchema } from '@motive-fashion/validation';
import { SalesChannel } from '@prisma/client';

@Controller()
export class OrdersController {
  constructor(
    @Inject(OrdersService) private readonly orders: OrdersService,
    @Inject(CommerceService) private readonly commerce: CommerceService,
  ) {}

  @Get('checkout/options')
  options() {
    return this.commerce.publicOptions();
  }

  @Post('checkout/quote')
  @UseGuards(OptionalJwtGuard)
  quote(@Body() body: unknown, @CurrentUser() user?: { sub: string }) {
    const dto = checkoutQuoteSchema.parse(body);
    return this.commerce.quote(dto, user?.sub);
  }

  @Post('checkout/session')
  @UseGuards(OptionalJwtGuard)
  checkout(@Body() body: unknown, @CurrentUser() user?: { sub: string }) {
    const dto = checkoutSchema.parse(body);
    return this.orders.checkout(dto, user?.sub, SalesChannel.WEB);
  }

  @Get('orders/:id/track')
  track(@Param('id') id: string, @Query('token') token?: string) {
    return this.orders.track(id, token);
  }

  @Post('returns')
  @UseGuards(OptionalJwtGuard)
  returns(@Body() body: unknown, @CurrentUser() user?: { sub: string }) {
    const dto = returnRequestSchema.parse(body);
    return this.orders.requestReturn(user?.sub, dto);
  }
}
