import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { SquarePosAdapter } from './square.adapter';
import { ThermalPrinterService } from './thermal-printer';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';
import { CommerceModule } from '../commerce/commerce.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [InventoryModule, OrdersModule, AuthModule, CommerceModule, PaymentsModule],
  controllers: [PosController],
  providers: [SquarePosAdapter, ThermalPrinterService],
  exports: [SquarePosAdapter],
})
export class PosModule {}
