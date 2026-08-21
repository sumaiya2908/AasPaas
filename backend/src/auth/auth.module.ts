import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

const jwtSecret =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? undefined
    : 'aaspaas-dev-secret-change-me');

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '7d';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: accessExpiresIn as `${number}d` | `${number}h` },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
