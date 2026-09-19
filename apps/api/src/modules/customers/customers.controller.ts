import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequireWorkspace } from '../../common/auth';
import { CustomersService } from './customers.service';
import { accountPatchSchema, addressCreateSchema, addressPatchSchema, pushTokenSchema, reviewCreateSchema } from '@motive-fashion/validation';

@Controller('account')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customers: CustomersService) {}

  @Get('me')
  me(@CurrentUser() user: { sub: string }) {
    return this.customers.me(user.sub);
  }

  @Patch('me')
  patchMe(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    return this.customers.patchMe(user.sub, accountPatchSchema.parse(body));
  }

  @Get('orders')
  @RequireWorkspace('customer')
  orders(@CurrentUser() user: { sub: string }) {
    return this.customers.orders(user.sub);
  }

  @Get('orders/:id')
  @RequireWorkspace('customer')
  order(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.customers.order(user.sub, id);
  }

  @Get('wishlist')
  @RequireWorkspace('customer')
  wishlist(@CurrentUser() user: { sub: string }) {
    return this.customers.wishlist(user.sub);
  }

  @Get('addresses')
  @RequireWorkspace('customer')
  addresses(@CurrentUser() user: { sub: string }) {
    return this.customers.addresses(user.sub);
  }

  @Post('addresses')
  @RequireWorkspace('customer')
  addAddress(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    return this.customers.addAddress(user.sub, addressCreateSchema.parse(body));
  }

  @Patch('addresses/:id')
  @RequireWorkspace('customer')
  patchAddress(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() body: unknown) {
    return this.customers.patchAddress(user.sub, id, addressPatchSchema.parse(body));
  }

  @Post('addresses/:id/default')
  @RequireWorkspace('customer')
  setDefault(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.customers.setDefaultAddress(user.sub, id);
  }

  @Delete('addresses/:id')
  @RequireWorkspace('customer')
  removeAddress(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.customers.removeAddress(user.sub, id);
  }

  @Post('wishlist/:productId')
  @RequireWorkspace('customer')
  addWish(@CurrentUser() user: { sub: string }, @Param('productId') productId: string) {
    return this.customers.addWish(user.sub, productId);
  }

  @Delete('wishlist/:productId')
  @RequireWorkspace('customer')
  removeWish(@CurrentUser() user: { sub: string }, @Param('productId') productId: string) {
    return this.customers.removeWish(user.sub, productId);
  }

  @Get('reviews/eligibility')
  @RequireWorkspace('customer')
  reviewEligibility(@CurrentUser() user: { sub: string }, @Query('productId') productId: string) {
    const dto = reviewCreateSchema.pick({ productId: true }).parse({ productId });
    return this.customers.reviewEligibility(user.sub, dto.productId);
  }

  @Post('reviews')
  @RequireWorkspace('customer')
  addReview(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    return this.customers.addReview(user.sub, reviewCreateSchema.parse(body));
  }

  @Post('push-tokens')
  @RequireWorkspace('customer')
  registerPush(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    return this.customers.registerPush(user.sub, pushTokenSchema.parse(body));
  }

  @Get('gdpr-export')
  @RequireWorkspace('customer')
  export(@CurrentUser() user: { sub: string }) {
    return this.customers.gdprExport(user.sub);
  }

  @Post('gdpr-delete')
  @RequireWorkspace('customer')
  erase(@CurrentUser() user: { sub: string }) {
    return this.customers.gdprDelete(user.sub);
  }
}
