'use client';
import { useEffect, useState } from 'react';

/**
 * useMedia 훅: CSS 미디어 쿼리 매칭으로 모바일/데스크탑 여부를 반환
 */
export function useMedia() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // CSS 미디어 쿼리 매칭 (Tailwind의 lg breakpoint: 1024px)
    const mediaQuery = window.matchMedia('(max-width: 1023px)');

    // 초기 상태 설정
    setIsMobile(mediaQuery.matches);

    // 미디어 쿼리 변경 리스너
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // 리스너 등록
    mediaQuery.addEventListener('change', handleChange);

    // 클린업
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return {
    isMobile,
    isDesktop: !isMobile,
  };
}
