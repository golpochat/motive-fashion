import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { PermissionsGuard, ShopperGuard } from '../../common/auth';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [RbacController],
  providers: [RbacService, PermissionsGuard, ShopperGuard],
  exports: [RbacService, PermissionsGuard, ShopperGuard],
})
export class RbacModule {}
