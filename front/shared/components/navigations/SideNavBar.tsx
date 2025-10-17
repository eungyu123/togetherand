'use client';

import Link from 'next/link';
import { useAuthStore } from '@/shared/stores/auth';

export default function SideNavBar() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const handleFriendsClick = () => {
    if (!isAuthenticated) {
      alert('로그인 후 이용해주세요.');
    }
  };

  return (
    <nav
      className="flex flex-col items-center px-5 py-3 w-24 h-full bg-main-black-600 rounded-xl"
      aria-label="Main sidebar"
    >
      {/* 로고 영역 */}
      <Link
        href="/"
        className="w-16 h-16 bg-main-black-750 mb-20 rounded-xl"
        aria-label="Logo"
      ></Link>
      {/* 네비게이션 메뉴 */}
      <ul className="flex flex-col gap-8" role="menu">
        <li role="menuitem">
          <Link
            href="/"
            className="w-16 h-16 bg-main-black-750 rounded-xl flex items-center justify-center"
          >
            매칭
          </Link>
        </li>
        <li role="menuitem">
          {isAuthenticated ? (
            <Link
              href="/friends"
              className="w-16 h-16 bg-main-black-750 rounded-xl flex items-center justify-center"
            >
              친구
            </Link>
          ) : (
            <button
              className="w-16 h-16 bg-main-black-750 rounded-xl flex items-center justify-center opacity-50 cursor-not-allowed"
              onClick={handleFriendsClick}
            >
              친구
            </button>
          )}
        </li>
      </ul>
      {/* 하단 영역 */}
      {isAuthenticated ? (
        <Link
          href="/profile"
          className="w-16 h-10 bg-main-black-750 rounded-xl mt-auto flex items-center justify-center"
          aria-label="auth"
        >
          계정
        </Link>
      ) : (
        <Link
          href="/auth/signin"
          className="w-16 h-10 bg-main-black-750 rounded-xl mt-auto flex items-center justify-center"
          aria-label="auth"
        >
          로그인
        </Link>
      )}
    </nav>
  );
}
