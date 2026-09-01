import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { SquarePosAdapter } from './square.adapter';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [InventoryModule, OrdersModule, AuthModule],
  controllers: [PosController],
  providers: [SquarePosAdapter],
  exports: [SquarePosAdapter],
})
export class PosModule {}
