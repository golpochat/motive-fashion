import { Body, Controller, Delete, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { CurrentUser, OptionalJwtGuard } from '../../common/auth';
import { CartService } from './cart.service';
import { cartAddSchema, cartQtySchema } from '@motive-fashion/validation';

@Controller('cart')
@UseGuards(OptionalJwtGuard)
export class CartController {
  constructor(@Inject(CartService) private readonly carts: CartService) {}

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
  add(
    @Param('id') id: string,
    @Body() body: unknown,
    @Query('sessionKey') sessionKey?: string,
    @CurrentUser() user?: { sub: string },
  ) {
    const dto = cartAddSchema.parse(body);
    return this.carts.add(id, dto.variantId, dto.quantity, SalesChannel.WEB, {
      userId: user?.sub,
      sessionKey,
    });
  }

  @Post(':id/items/:itemId')
  setQty(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
    @Query('sessionKey') sessionKey?: string,
    @CurrentUser() user?: { sub: string },
  ) {
    const dto = cartQtySchema.parse(body);
    return this.carts.setQty(id, itemId, dto.quantity, SalesChannel.WEB, {
      userId: user?.sub,
      sessionKey,
    });
  }

  @Delete(':id/items/:itemId')
  remove(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Query('sessionKey') sessionKey?: string,
    @CurrentUser() user?: { sub: string },
  ) {
    return this.carts.remove(id, itemId, SalesChannel.WEB, { userId: user?.sub, sessionKey });
  }
}
