import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../../common/auth';
import { CustomersService } from './customers.service';
import { addressCreateSchema, addressPatchSchema } from '@motive-fashion/validation';

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

  @Get('addresses')
  addresses(@CurrentUser() user: { sub: string }) {
    return this.customers.addresses(user.sub);
  }

  @Post('addresses')
  addAddress(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    return this.customers.addAddress(user.sub, addressCreateSchema.parse(body));
  }

  @Patch('addresses/:id')
  patchAddress(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() body: unknown) {
    return this.customers.patchAddress(user.sub, id, addressPatchSchema.parse(body));
  }

  @Post('addresses/:id/default')
  setDefault(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.customers.setDefaultAddress(user.sub, id);
  }

  @Delete('addresses/:id')
  removeAddress(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.customers.removeAddress(user.sub, id);
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
