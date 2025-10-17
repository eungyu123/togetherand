export interface JwtPayload {
  userId: string; // 사용자 고유 식별자
  iat: number; // 토큰 발급 시간
  exp: number; // 토큰 만료 시간
  iss: string; // 토큰 발급자
  aud: string; // 토큰 대상자
  type: "access";
}
