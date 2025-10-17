'use client';

// oauth 인증 후 콜백은 /app/(public)/auth/[provider]/callback/page.tsx 에서 처리

/**
 * 구글 로그인
 */
export const handleGoogleLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  const scope = 'openid email profile';
  const responseType = 'code';
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri ?? '')}` +
    `&response_type=${responseType}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;
  window.location.href = url;
};

/**
 * 카카오 로그인
 */
export const handleKakaoLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI;
  const url =
    'https://kauth.kakao.com/oauth/authorize?' +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri ?? '')}` +
    `&response_type=code`;
  window.location.href = url;
};

/**
 * 네이버 로그인
 */
export const handleNaverLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_NAVER_REDIRECT_URI;
  const url =
    'https://nid.naver.com/oauth2.0/authorize?' +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri ?? '')}` +
    `&response_type=code`;
  window.location.href = url;
};
