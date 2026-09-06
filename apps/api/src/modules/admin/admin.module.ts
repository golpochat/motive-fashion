import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { OrdersModule } from '../orders/orders.module';
import { CommerceModule } from '../commerce/commerce.module';

@Module({
  imports: [OrdersModule, CommerceModule],
  controllers: [AdminController],
})
export class AdminModule {}
