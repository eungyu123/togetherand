import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { databaseConfig } from '../config/database.config';

/**
 * Database module
 *
 * Provides TypeORM configuration and database connection
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const config = databaseConfig();
        return config.database;
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
