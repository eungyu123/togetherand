import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Database configuration
 *
 * PostgreSQL connection settings using TypeORM
 */
export const databaseConfig = () => ({
  database: {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'nestjs_user',
    password: process.env.DATABASE_PASSWORD || 'nestjs_password',
    database: process.env.DATABASE_NAME || 'nestjs_db_dev',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false, // process.env.NODE_ENV !== 'production', //자동 동기화 production 일때는 비활성화
    logging: false, // process.env.NODE_ENV !== 'production', // SQL 쿼리 로그  production 일때는 비활성화
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});
