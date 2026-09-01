import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { StockService } from './stock.service';
import { inventoryAdjustSchema, stockTransferSchema } from '@motive-fashion/validation';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('suggestions')
  suggestions() {
    return this.stock.restockSuggestions();
  }

  @Post('adjust')
  adjust(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = inventoryAdjustSchema.parse(body);
    return this.stock.adjust({ ...dto, actorId: user.sub });
  }

  @Post('transfer')
  transfer(@Body() body: unknown) {
    const dto = stockTransferSchema.parse(body);
    return this.stock.transfer(dto);
  }
}
