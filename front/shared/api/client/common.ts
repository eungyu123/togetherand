'use client';

import { useAuthStore } from '@/shared/stores/auth';
// 토큰 갱신 상태 관리
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * 액세스 토큰 갱신
 */
async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`토큰 갱신 실패: ${errorData.message || '알 수 없는 오류'}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(`토큰 갱신 실패: ${data.message || '알 수 없는 오류'}`);

  return true;
}

/**
 * 인증이 포함된 fetch 함수
 * - 액세스 토큰 자동 포함
 * - 401 에러 시 자동 토큰 갱신 및 재시도
 * - 갱신 실패 시 에러 처리
 */
export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
  options: { isFileUpload?: boolean } = {}
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (!options.isFileUpload) headers['Content-Type'] = 'application/json';
  if (init.headers) Object.assign(headers, init.headers);

  const authInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
  };

  let res = await fetch(input, authInit);

  // 액세스 토큰 만료 (401 Unauthorized)
  if (res.status === 401) {
    try {
      console.warn('⚠️ 액세스 토큰 만료, 갱신 시도 중...');

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
        await refreshPromise;
      } else {
        await refreshPromise;
      }

      // 토큰 새로 갱신 후 재요청
      const retryHeaders: Record<string, string> = {};
      if (!options.isFileUpload) retryHeaders['Content-Type'] = 'application/json';
      if (init.headers) Object.assign(retryHeaders, init.headers);

      const retryInit: RequestInit = {
        ...init,
        headers: retryHeaders,
        credentials: 'include',
      };

      // console.info('🔄 원래 요청 재시도');
      res = await fetch(input, retryInit);
    } catch (error) {
      useAuthStore.getState().clearUserWithOutSignout();
      console.error('❌ 토큰 갱신 실패:', error);
      // 원본 에러 응답 반환
      return res;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }

  return res;
}
