import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { CurrentUser, OptionalJwtGuard } from '../../common/auth';
import { CartService } from './cart.service';
import { cartAddSchema } from '@motive-fashion/validation';

@Controller('cart')
@UseGuards(OptionalJwtGuard)
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Get()
  get(
    @Query('cartId') cartId?: string,
    @Query('sessionKey') sessionKey?: string,
    @CurrentUser() user?: { sub: string },
  ) {
    return this.carts.getOrCreate({ cartId, sessionKey, userId: user?.sub, channel: SalesChannel.WEB });
  }

  @Post()
  create(@Query('sessionKey') sessionKey?: string, @CurrentUser() user?: { sub: string }) {
    return this.carts.getOrCreate({ sessionKey, userId: user?.sub, channel: SalesChannel.WEB });
  }

  @Post(':id/items')
  add(@Param('id') id: string, @Body() body: unknown) {
    const dto = cartAddSchema.parse(body);
    return this.carts.add(id, dto.variantId, dto.quantity);
  }

  @Post(':id/items/:itemId')
  setQty(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: { quantity: number }) {
    return this.carts.setQty(id, itemId, body.quantity);
  }

  @Delete(':id/items/:itemId')
  remove(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.carts.remove(id, itemId);
  }
}
