// Redis 설정 타입
export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  ttl: number;
  tls: boolean;
  max: number;
  isGlobal: boolean;
}

export interface RedisConfigFactory {
  redis: RedisConfig;
}

export const redisConfig = (): RedisConfigFactory => ({
  redis: {
    host: process.env.REDIS_HOST || "redis",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "redis_password",
    db: parseInt(process.env.REDIS_DB || "0", 10),
    ttl: parseInt(process.env.REDIS_TTL || "86400000", 10), // 24 hours default
    tls: process.env.REDIS_TLS === "true",
    max: parseInt(process.env.REDIS_MAX || "100", 10), // Maximum number of items in cache
    isGlobal: true,
  },
});
