import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { StockService } from './stock.service';
import { inventoryAdjustSchema, inventoryBinSchema, stockTransferSchema } from '@motive-fashion/validation';

@Controller('stock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(@Inject(StockService) private readonly stock: StockService) {}

  @Get('suggestions')
  @RequirePermissions('inventory.read')
  suggestions() {
    return this.stock.restockSuggestions();
  }

  @Post('adjust')
  @RequirePermissions('inventory.adjust')
  adjust(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = inventoryAdjustSchema.parse(body);
    return this.stock.adjust({ ...dto, actorId: user.sub });
  }

  @Post('transfer')
  @RequirePermissions('inventory.adjust')
  transfer(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = stockTransferSchema.parse(body);
    return this.stock.transfer({ ...dto, actorId: user.sub });
  }

  @Post('bin')
  @RequirePermissions('inventory.adjust')
  setBin(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = inventoryBinSchema.parse(body);
    return this.stock.setBin({ ...dto, actorId: user.sub });
  }
}
