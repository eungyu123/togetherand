import { Injectable, Logger } from '@nestjs/common';

/**
 * AppService - NestJS 서비스 클래스
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    this.logger.log('getHello method called');
    this.logger.error('Test error log');
    this.logger.warn('Test warning log');
    this.logger.debug('Test debug log');
    return 'Hello World!';
  }
}
