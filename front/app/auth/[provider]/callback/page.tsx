'use client';

import { Loader } from 'lucide-react';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authApi } from '@/shared/api/client/auth';
import { useAuthStore } from '@/shared/stores/auth';
import { UserType } from '@/shared/api/types/user';
import { ApiResponse } from '@/shared/api/types/common';
import { useCallStore } from '@/domain/call/store/call';

// prettier-ignore
export default function AuthCallbackPage() {
  const { provider } = useParams();
  const router = useRouter();
  const { setUser, setIsAuthenticated } = useAuthStore.getState();
  const { setCurrentUser } = useCallStore.getState();

  // 소셜 로그인 처리
  const handleSocialLogin = async (code: string) => {
    try {
      // 1. 소셜 로그인 수행
      const res = await authApi.socialSignin(provider as string, code);
      const { success, message, data }: ApiResponse<UserType> = res;

      if (!success) {
        throw new Error(`로그인 실패: ${message}`);
      }

      setUser(data);
      setCurrentUser({
        userId: data.id,
        userName: data.userName,
        userPhotoUrl: data.photoUrl || undefined,
      });
      setIsAuthenticated(true);
      
      if (!data.photoUrl) {
        router.replace('/auth/signup');
      } else {
        router.replace('/');
      }
    } catch (error) {
      alert(`로그인 에러: ${error}`);
      router.replace('/');
    }
  };

  // 페이지 로드 시 소셜 로그인 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      handleSocialLogin(code);
    } else {
      alert('로그인 에러');
      router.replace('/');
    }
  }, [provider, router, handleSocialLogin]);

    return (
      <div className="flex justify-center items-center bg-main-black-900 h-dvh w-screen">
        <Loader size={18} className="spin-slow" />
        <p className="text-white">로딩중...</p>
      </div>
    );
}
