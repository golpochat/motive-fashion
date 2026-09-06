import { Module } from '@nestjs/common';
import { CommerceService } from './commerce.service';

@Module({
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}
