import { fetchWithAuth } from './common';
import { ApiResponse } from '../types/common';
import { UserType } from '../types/user';

export const authApi = {
  /**
   * 소셜 로그인
   */
  socialSignin: async (provider: string, code: string): Promise<ApiResponse<UserType>> => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${provider}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    });

    return res.json();
  },

  /**
   * 로그아웃
   */
  signout: async () => {
    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signout`, {
      method: 'POST',
    });

    if (res.ok) {
      // 이렇게 쓰면 진짜 새로고침하면서 '/' 로 이동
      window.location.href = '/';
    }

    return res.json();
  },

  /**
   * 회원탈퇴
   */
  withdraw: async () => {
    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/withdraw`, {
      method: 'POST',
    });

    if (res.ok) {
      // 회원탈퇴 성공 시 홈페이지로 리다이렉트
      window.location.href = '/';
    }

    return res.json();
  },
};
