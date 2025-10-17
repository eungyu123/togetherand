export const appConfig = () => {
  // 필수 환경 변수 검증
  const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_PASSWORD', 'REDIS_PASSWORD'];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  return {
    app: {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      apiPrefix: process.env.API_PREFIX || 'api',
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:3001',
    },
    swagger: {
      title: process.env.SWAGGER_TITLE || 'NestJS Boilerplate API',
      description: process.env.SWAGGER_DESCRIPTION || 'NestJS Boilerplate API Documentation',
      version: process.env.SWAGGER_VERSION || '1.0',
    },
  };
};
