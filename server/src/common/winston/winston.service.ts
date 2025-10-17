import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

@Injectable()
export class WinstonLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      transports: [
        // 콘솔에 로그를 출력하는 transport
        new winston.transports.Console({
          level: 'info', // info 레벨 이상 출력
          // 로그 형식 설정
          format: winston.format.combine(
            winston.format.timestamp(), // 로그에 타임스탬프 추가
            winston.format.ms(), // 로그에 ms 단위 시간 추가
            nestWinstonModuleUtilities.format.nestLike('NestJS', {
              // NestJS 형식으로 로그 출력
              prettyPrint: true, // 로그를 보기 좋게 출력
              colors: true, // 로그에 색상 추가
            })
          ),
        }),
        // 2. error 레벨 이상의 로그를 파일로 저장하는 transport
        new winston.transports.File({
          filename: 'logs/error.log', // 저장 파일 이름
          level: 'error', // 저장할 로그 레벨
          format: winston.format.combine(
            // 로그 형식 설정
            winston.format.timestamp(), // 로그에 타임스탬프 추가
            winston.format.errors({ stack: true }), // 에러 스택 추가
            winston.format.json() // 로그를 JSON 형식으로 저장
          ),
        }),
        // 3. 모든 레벨의 로그를 파일로 저장하는 transport
        new winston.transports.File({
          filename: 'logs/combined.log', // 저장 파일 이름
          level: 'info', // info 레벨 이상만 저장
          format: winston.format.combine(
            // 로그 형식 설정
            winston.format.timestamp(), // 로그에 타임스탬프 추가
            winston.format.json() // 로그를 JSON 형식으로 저장
          ),
        }),
      ],
    });
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // 커스텀 로깅 메서드 추가
  customLog(message: string, context?: string) {
    this.logger.info(`[CUSTOM] ${message}`, { context });
  }

  // 성능 측정 로깅
  performanceLog(operation: string, duration: number, context?: string) {
    this.logger.info(`Performance: ${operation} took ${duration}ms`, { context });
  }

  // API 요청 로깅
  apiLog(method: string, path: string, statusCode: number, context?: string) {
    this.logger.info(`API: ${method} ${path} - ${statusCode}`, { context });
  }
}
