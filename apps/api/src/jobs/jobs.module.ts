import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CartModule } from '../modules/cart/cart.module';
import { InventoryModule } from '../modules/inventory/inventory.module';

@Module({
  imports: [CartModule, InventoryModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
