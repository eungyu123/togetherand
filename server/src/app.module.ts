import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { s3Config } from './config/s3.config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonLoggerModule } from './common/winston/winston.module';
import { S3Module } from './s3/s3.module';
import { MatchModule } from './match/match.module';
import { FriendsModule } from './friends/friends.module';
import { ChatModule } from './chat/chat.module';
import { CustomCacheInterceptor } from './common/interceptors/cache.interceptor';
import { MediasoupModule } from './mediasoup/mediasoup.module';

/**
 * AppModule - NestJS 루트 모듈
 *
 * NestJS에서 모듈(Module)은 애플리케이션의 구조적 단위입니다.
 *
 * 주요 특징:
 * 1. @Module() 데코레이터: 이 클래스가 모듈임을 명시
 * 2. 의존성 관리: 컨트롤러, 서비스, 프로바이더들을 관리
 * 3. 캡슐화: 모듈 내부의 컴포넌트들을 외부로부터 격리
 * 4. 재사용성: 다른 모듈에서 import하여 사용 가능
 *
 * 모듈의 구성 요소:
 * - imports: 다른 모듈들을 가져옴
 * - controllers: HTTP 요청을 처리하는 컨트롤러들
 * - providers: 서비스, 팩토리, 값 등을 제공하는 프로바이더들
 * - exports: 다른 모듈에서 사용할 수 있도록 내보내는 프로바이더들
 */
@Module({
  imports: [
    // 등록순서 중요
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, s3Config],
    }), // 1. 설정
    ScheduleModule.forRoot(), // 2. 스케줄링 모듈
    WinstonLoggerModule, // 3. 로깅
    DatabaseModule, // 4. 데이터베이스 모듈
    RedisModule, // 5. 레디스 모듈
    S3Module, // 6. S3 모듈
    UsersModule, // 7. 유저 모듈
    AuthModule, // 8. 인증 모듈
    MailModule, // 9. 메일 모듈
    MatchModule, // 10. 매칭 모듈
    FriendsModule, // 11. 친구 모듈
    ChatModule, // 12. 채팅 모듈
    MediasoupModule, // 13. 미디어 소스 모듈
  ],

  /**
   * controllers: HTTP 요청을 처리하는 컨트롤러들
   *
   * 이 모듈에서 사용할 컨트롤러들을 배열로 등록합니다.
   * NestJS가 자동으로 이 컨트롤러들을 인스턴스화하고 라우팅을 설정합니다.
   */
  controllers: [AppController],
  /**
   * providers: 서비스, 팩토리, 값 등을 제공하는 프로바이더들
   *
   * 이 모듈에서 사용할 서비스들을 배열로 등록합니다.
   * NestJS가 자동으로 의존성 주입을 처리합니다.
   *
   * 프로바이더의 종류:
   * - Service: 비즈니스 로직 처리
   * - Factory: 동적으로 객체 생성
   * - Value: 상수 값 제공
   * - Class: 클래스 인스턴스 제공
   */
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CustomCacheInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
