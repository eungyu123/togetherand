export const REDIS_KEYS = {
  EMAIL_VERIFICATION: (email: string) => `emailVerification:${email}`,
  REFRESH_TOKEN: (userId: string, sessionId: string) => `refreshToken:${userId}${sessionId}`,
  REFRESH_BLACKLIST: (userId: string, sessionId: string) => `refreshBlacklist:${userId}${sessionId}`,
  ACCESS_TOKEN: (userId: string) => `accessToken:${userId}`,
};
