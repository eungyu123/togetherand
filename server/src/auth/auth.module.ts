import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from 'src/users/users.module';
import { RedisModule } from 'src/redis/redis.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    UsersModule,
    RedisModule,
    MailModule,
    PassportModule.register({
      defaultStrategy: 'jwt', // 기본 인증 전략을 JWT로 설정
      session: false, // 세션 기반 인증 비활성화 (JWT 사용)
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET, // JWT 서명에 사용할 비밀키
      signOptions: {
        expiresIn: '15m', // 액세스 토큰 만료 시간 (15분)
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      },
    }),
  ],

  controllers: [
    AuthController, // 인증 관련 모든 엔드포인트 처리
  ],

  providers: [
    AuthService, // 인증 관련 비즈니스 로직 처리
    JwtStrategy, // JWT 토큰 검증 전략
    JwtRefreshStrategy, // 리프레시 토큰 검증 전략
  ],

  exports: [
    AuthService, // 다른 모듈에서 인증 서비스 사용 가능
    JwtModule, // 다른 모듈에서 JWT 서비스 사용 가능
  ],
})
export class AuthModule {}
