'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { usersApi } from '@/shared/api/client/users';
import { useRouter, usePathname } from 'next/navigation';
import { useCallStore } from '@/domain/call/store/call';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // console.log('🔍 AuthProvider 렌더링');

  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { setUser, setIsAuthenticated } = useAuthStore.getState();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // 현재 사용자 설정 (매칭 페이지에서만)
  const { setCurrentUser } = useCallStore.getState();

  useEffect(() => {
    const initializeAuth = async () => {
      // 자동 로그인을 하지 않을 URL들
      const skipAutoLoginPaths = [
        '/auth/signup',
        '/auth/signin',
        '/auth/google/callback',
        '/auth/naver/callback',
        '/auth/kakao/callback',
      ];

      // 현재 경로가 자동 로그인을 건너뛸 경로인지 확인
      if (skipAutoLoginPaths.includes(pathname)) {
        setIsLoading(false);
        return;
      }

      // 이거 바꿔야할거같음 좀 잘못함
      // 로그인 했고 프로필 사진이 없으면 회원정보 입력 페이지로 이동
      if (isAuthenticated && !user?.photoUrl) {
        router.replace('/auth/signup');
        setIsLoading(false);
        return;
      }

      // 로그인 했고 유저 정보가 있으면 페이지 이동 없이 로딩 종료
      if (isAuthenticated && user) {
        setIsLoading(false);
        return;
      }

      // 로그인 안했으면 쿠키 이용해서 로그인
      try {
        const res = await usersApi.getProfile();
        if (!res.success) {
          setCurrentUser({
            userId: 'anonymous-user',
            userName: '나',
            userPhotoUrl: undefined,
          });

          setIsAuthenticated(false);
          return;
        }

        setUser({
          id: res.data.id,
          userName: res.data.userName,
          email: res.data.email,
          photoUrl: res.data.photoUrl || null,
          selfIntroduction: res.data.selfIntroduction || null,
          age: res.data.age || null,
          location: res.data.location || null,
          playGames: res.data.playGames || null,
        });
        setCurrentUser({
          userId: res.data.id,
          userName: res.data.userName,
          userPhotoUrl: res.data.photoUrl || undefined,
        });

        setIsAuthenticated(true);
      } catch (error) {
        setCurrentUser({
          userId: 'anonymous-user',
          userName: '나',
          userPhotoUrl: undefined,
        });
        setIsAuthenticated(false);
        // 로그인 실패시 메인페이지로 리다이렉트
        if (pathname !== '/') {
          router.replace('/');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  if (isLoading) return;

  return <>{children}</>;
}
