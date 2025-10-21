import { cookies } from 'next/headers';

// 토큰 갱신 상태 관리 (서버에서는 요청별로 독립적)
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * 서버에서 쿠키에서 액세스 토큰 가져오기
 */
const getAccessTokenFromServer = async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken');
    return accessToken?.value || null;
  } catch (error) {
    console.error('서버에서 액세스 토큰 가져오기 실패:', error);
    // 서버 컴포넌트가 아닌 환경에서는 null 반환
    return null;
  }
};

/**
 * 서버에서 쿠키에서 리프레시 토큰 가져오기
 */
const getRefreshTokenFromServer = async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken');
    return refreshToken?.value || null;
  } catch (error) {
    console.error('서버에서 리프레시 토큰 가져오기 실패:', error);
    return null;
  }
};

/**
 * 서버에서 액세스 토큰을 쿠키에 저장
 */
const saveAccessTokenToServer = async (token: string): Promise<void> => {
  try {
    // 서버에서는 쿠키를 직접 설정할 수 없으므로
    // 클라이언트에서 설정하도록 응답에 포함
    // 실제로는 서버 액션에서 쿠키를 설정해야 함
    console.log('서버에서 토큰 갱신됨:', token.substring(0, 20) + '...');
  } catch (error) {
    console.error('서버에서 토큰 저장 실패:', error);
  }
};

/**
 * 액세스 토큰 갱신 (서버용)
 */
async function refreshAccessTokenServer(): Promise<string> {
  const refreshToken = await getRefreshTokenFromServer();

  if (!refreshToken) {
    throw new Error('Refresh token not found');
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await res.json();

  if (data.success && data.data?.accessToken) {
    // 새로운 액세스 토큰 저장 (실제로는 서버 액션에서 처리)
    await saveAccessTokenToServer(data.data.accessToken);
    return data.data.accessToken;
  }

  throw new Error('Invalid refresh response');
}

/**
 * 인증이 포함된 fetch 함수 (서버용)
 * - 액세스 토큰 자동 포함
 * - 401 에러 시 자동 토큰 갱신 및 재시도
 * - 갱신 실패 시 에러 처리
 */
export async function fetchWithAuthServer(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessTokenFromServer();

  // 기본 헤더 설정
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  // 액세스 토큰이 있으면 Authorization 헤더 추가
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const authInit: RequestInit = {
    ...init,
    headers,
  };

  const res = await fetch(input, authInit);

  // 액세스 토큰 만료 (401 Unauthorized)
  if (res.status === 401) {
    try {
      console.warn('⚠️ 서버: 액세스 토큰 만료, 갱신 시도 중...');

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessTokenServer();
        await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;
        console.info('✅ 서버: 액세스 토큰 갱신 성공');
      } else {
        // 이미 갱신 중이면 기다림
        console.info('⏳ 서버: 다른 요청에서 토큰 갱신 중, 대기...');
        await refreshPromise;
      }

      // 토큰 새로 갱신 후 재요청
      const newAccessToken = await getAccessTokenFromServer();
      const retryHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string>),
      };

      if (newAccessToken) {
        retryHeaders['Authorization'] = `Bearer ${newAccessToken}`;
      }

      const retryInit: RequestInit = {
        ...init,
        headers: retryHeaders,
      };

      console.info('🔄 서버: 원래 요청 재시도');
      return fetch(input, retryInit);
    } catch (error) {
      isRefreshing = false;
      refreshPromise = null;
      console.error('❌ 서버: 토큰 갱신 실패:', error);
      throw new Error('Unauthorized and refresh failed');
    }
  }

  return res;
}
