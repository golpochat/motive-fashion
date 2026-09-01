import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { PosModule } from './modules/pos/pos.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    CustomersModule,
    AdminModule,
    ProcurementModule,
    WhatsappModule,
    PosModule,
    MarketingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
