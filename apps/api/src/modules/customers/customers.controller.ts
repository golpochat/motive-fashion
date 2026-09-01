import { Controller, Delete, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../../common/auth';
import { CustomersService } from './customers.service';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customers: CustomersService) {}

  @Get('me')
  me(@CurrentUser() user: { sub: string }) {
    return this.customers.me(user.sub);
  }

  @Get('orders')
  orders(@CurrentUser() user: { sub: string }) {
    return this.customers.orders(user.sub);
  }

  @Get('wishlist')
  wishlist(@CurrentUser() user: { sub: string }) {
    return this.customers.wishlist(user.sub);
  }

  @Post('wishlist/:productId')
  addWish(@CurrentUser() user: { sub: string }, @Param('productId') productId: string) {
    return this.customers.addWish(user.sub, productId);
  }

  @Delete('wishlist/:productId')
  removeWish(@CurrentUser() user: { sub: string }, @Param('productId') productId: string) {
    return this.customers.removeWish(user.sub, productId);
  }

  @Get('gdpr-export')
  export(@CurrentUser() user: { sub: string }) {
    return this.customers.gdprExport(user.sub);
  }

  @Post('gdpr-delete')
  erase(@CurrentUser() user: { sub: string }) {
    return this.customers.gdprDelete(user.sub);
  }
}
