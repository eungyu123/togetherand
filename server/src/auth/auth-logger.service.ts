import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class AuthLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      transports: [
        // 콘솔 출력
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `[Auth] ${timestamp} ${level}: ${message} ${context ? `(${context})` : ''}`;
            }),
          ),
        }),
        // Auth 전용 파일
        new winston.transports.File({
          filename: 'logs/auth.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // 보안 관련 로그 (별도 파일)
        new winston.transports.File({
          filename: 'logs/security.log',
          level: 'warn',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // 에러 로그
        new winston.transports.File({
          filename: 'logs/auth-error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
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

  // Auth 모듈 전용 메서드
  loginAttempt(email: string, success: boolean, context?: string) {
    const status = success ? 'SUCCESS' : 'FAILED';
    this.logger.info(`Login Attempt: ${email} - ${status}`, { context });
    
    if (!success) {
      this.logger.warn(`Failed login attempt: ${email}`, { context });
    }
  }

  tokenRefresh(userId: string, context?: string) {
    this.logger.info(`Token Refresh: ${userId}`, { context });
  }

  logout(userId: string, context?: string) {
    this.logger.info(`Logout: ${userId}`, { context });
  }

  securityEvent(event: string, details: any, context?: string) {
    this.logger.warn(`Security Event: ${event}`, { details, context });
  }
} 