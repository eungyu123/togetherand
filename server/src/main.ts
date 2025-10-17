import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ErrorResponseDto } from './common/dto/error.dto';
import { RedisService } from './redis/redis.service';
import { WinstonLogger } from './common/winston/winston.service';
const cookieParser = require('cookie-parser');
// import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
    // 프로덕션 환경에서 보안 강화
    ...(process.env.NODE_ENV === 'production' && {
      logger: ['error', 'warn', 'log'],
    }),
  });

  // 커스텀 로거 설정
  app.useLogger(app.get(WinstonLogger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Global prefix (AppController 제외)
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  // Cookie parser 미들웨어 추가 (보안 강화)
  // 시크릿을 사용하는 이유: 쿠키의 무결성을 검증하고 변조를 방지
  // 서명된 쿠키(signed cookies)를 생성하여 클라이언트가 쿠키 값을 임의로 변경할 수 없도록 함
  app.use(cookieParser()); // 이렇게 하면 req.cookies.refreshToken 이런식으로 접근 가능

  // Global validation pipe - 모든 요청에 대해 자동으로 데이터 검증
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO 클래스에 정의되지 않은 프로퍼티 제거 (보안상 중요)
      forbidNonWhitelisted: true, // 허용되지 않는 프로퍼티가 있으면 오류 발생
      transform: true, // 요청 데이터를 DTO 클래스 타입에 맞게 자동 변환 (string → number 등)
      disableErrorMessages: nodeEnv === 'production', // 프로덕션에서는 상세한 에러 메시지 숨김 (보안)
    })
  );

  // CORS 설정 - Cross-Origin Resource Sharing (다른 도메인에서의 요청 허용 여부)
  const corsOrigin = configService.get<string>('cors.origin', '*');
  const frontendUrl = configService.get<string>('frontend.url', 'http://localhost:3001');

  // 프로덕션에서 허용할 도메인 목록 (www, HTTP/HTTPS 모든 조합 포함)
  const getProductionOrigins = () => {
    // 환경 변수에서 CORS_ORIGIN이 설정되어 있으면 사용, 없으면 기본값 사용
    if (corsOrigin && corsOrigin !== '*') {
      return corsOrigin.split(',').map(origin => origin.trim());
    }

    // 기본 도메인 목록 (fallback)
    const baseDomain = 'togetherand.site';
    return [
      frontendUrl,
      `https://${baseDomain}`,
      `https://www.${baseDomain}`, // www 서브도메인
      `http://${baseDomain}`, // HTTP 버전 (리다이렉트용)
      `http://www.${baseDomain}`, // www + HTTP 버전
    ];
  };

  // 개발환경에서는 모든 origin 허용, 프로덕션에서는 특정 origin만 허용 (보안상 중요)
  const allowedOrigins = nodeEnv === 'production' ? getProductionOrigins() : true;

  app.enableCors({
    origin: allowedOrigins, // 허용할 도메인 목록
    credentials: configService.get('cors.credentials', true), // 쿠키/인증 정보 포함 요청 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 허용할 HTTP 메서드
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization', // JWT 토큰을 위한 헤더
      'Cache-Control',
      'x-device-id', // 커스텀 디바이스 ID 헤더
    ],
  });

  // 전역 예외 필터 설정 - 모든 컨트롤러에서 발생하는 예외를 일관되게 처리
  app.useGlobalFilters(new HttpExceptionFilter());

  // WebSocket 어댑터 설정 (현재 주석 처리됨)
  // Socket.IO를 사용한 실시간 통신을 위한 설정
  // app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger API 문서 설정
  const config = new DocumentBuilder()
    .setTitle('포트폴리오 백엔드')
    .setDescription('포트폴리오 백엔드')
    .setVersion('1.0')
    .addTag('app', '기본 관련 API')
    .addTag('auth', '인증 관련 API')
    .addTag('users', '사용자 관련 API')
    // JWT Bearer 토큰 인증 설정 (Authorization 헤더에 Bearer 토큰)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'accessToken',
        description: '엑세스토큰 인증 입력',
        in: 'header',
      },
      'accessToken'
    )
    // 쿠키 기반 리프레시 토큰 인증 설정
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: '리프레시 토큰 (쿠키에서 자동 설정됨)',
      },
      'refreshToken'
    )
    .build();

  // Swagger API 문서 생성 (에러 응답 DTO 포함)
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto], // 공통 에러 응답 모델 추가
  });

  // Swagger 문서 설정 - 프로덕션에서는 보안상 비활성화
  if (nodeEnv !== 'production') {
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // 브라우저 새로고침 시에도 인증 정보 유지
      },
    });
  }

  await app.listen(port);

  // 환경별 로그 출력
  if (nodeEnv === 'production') {
    console.log(`🚀 Application is running on port ${port}`);
    console.log(`🌐 Environment: ${nodeEnv}`);
  } else {
    console.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
    console.log(`💬 WebSocket chat server: ws://localhost:${port}/chat`);
    console.log(`🌐 Environment: ${nodeEnv}`);
  }
  // Redis 연결 상태 확인
  const redisService = app.get(RedisService);
  const redisStatus = await redisService.checkRedisConnection();
  console.log(`🔄 Redis Status: ${redisStatus}`);

  // 앱 시작 시 Redis 초기화 (개발 환경에서만)
  if (nodeEnv === 'development') {
    try {
      await redisService.clear();
      console.log(`🧹 Redis 초기화 완료 (개발 환경)`);
    } catch (error) {
      console.error(`❌ Redis 초기화 실패:`, error);
    }
  }

  // Graceful Shutdown 설정 (배포환경에서 중요)
  // SIGTERM: 운영체제나 컨테이너 오케스트레이션에서 보내는 종료 신호
  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await app.close(); // 활성 연결들을 정리하고 서버 종료
    process.exit(0);
  });

  // SIGINT: Ctrl+C로 보내는 중단 신호
  process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

// 앱 시작 및 에러 핸들링
bootstrap().catch(error => {
  console.error('❌ Application failed to start:', error);
  process.exit(1); // 비정상 종료 코드로 프로세스 종료
});
