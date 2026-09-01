import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [MarketingController],
})
export class MarketingModule {}
