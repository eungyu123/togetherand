import { Module } from '@nestjs/common';
import { WinstonLogger } from './winston.service';

@Module({
  providers: [WinstonLogger],
  exports: [WinstonLogger],
})
export class WinstonLoggerModule {} 