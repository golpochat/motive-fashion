import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, OptionalJwtGuard } from '../../common/auth';
import { OrdersService } from './orders.service';
import { checkoutSchema, returnRequestSchema } from '@motive-fashion/validation';
import { SalesChannel } from '@prisma/client';

@Controller()
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

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
