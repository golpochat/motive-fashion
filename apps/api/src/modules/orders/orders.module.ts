import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MailModule } from '../../common/mail.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CommerceModule } from '../commerce/commerce.module';

@Module({
  imports: [InventoryModule, MailModule, CommerceModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
