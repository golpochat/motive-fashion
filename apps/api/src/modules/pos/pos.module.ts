import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { SquarePosAdapter } from './square.adapter';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [InventoryModule, OrdersModule],
  controllers: [PosController],
  providers: [SquarePosAdapter],
  exports: [SquarePosAdapter],
})
export class PosModule {}
