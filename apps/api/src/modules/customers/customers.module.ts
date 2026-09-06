import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CommerceModule } from '../commerce/commerce.module';

@Module({
  imports: [CommerceModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
