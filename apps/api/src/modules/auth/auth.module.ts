import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, RolesGuard, OptionalJwtGuard } from '../../common/auth';
import { resolveJwtSecret } from '../../common/security-config';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: resolveJwtSecret(),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, OptionalJwtGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, OptionalJwtGuard],
})
export class AuthModule {}
