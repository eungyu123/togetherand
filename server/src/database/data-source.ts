import { DataSource } from 'typeorm';
import { databaseConfig } from '../config/database.config';

// database.config.ts에서 설정 가져오기
const config = databaseConfig();

export const AppDataSource = new DataSource(config.database);
