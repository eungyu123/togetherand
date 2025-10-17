export interface JwtRefreshPayload {
  userId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  type: "refresh";
  sessionId: string;
}
