'use client';

import { GoogleIcon, KakaoIcon, NaverIcon } from '@/shared/components/icons';
import { handleGoogleLogin, handleKakaoLogin, handleNaverLogin } from '../actions/actions';
import { CenterModal } from '@/shared/components/modal/CenterModal';
import { useRouter } from 'next/navigation';

export default function SignInTemplate() {
  const router = useRouter();

  return (
    <CenterModal isOpen={true} onClose={() => router.push('/')}>
      <div className="flex flex-col gap-4 px-6 py-10 bg-[#19191b] lg:w-[420px] w-[340px] rounded-2xl mb-10">
        <h2 className="text-2xl font-bold text-white text-center mb-4">환영합니다</h2>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="relative flex items-center justify-center px-6 py-3 font-medium text-base text-gray-200 bg-[#252525] rounded-lg shadow-sm hover:bg-gray-800 transition-colors duration-200"
        >
          <GoogleIcon className="w-5 h-5 absolute left-6" />
          <span className="">구글 로그인</span>
        </button>

        <button
          type="button"
          onClick={handleKakaoLogin}
          className="relative flex items-center justify-center px-6 py-3 font-medium text-base text-gray-200 bg-[#252525] rounded-lg shadow-sm hover:bg-gray-800 transition-colors duration-200"
        >
          <KakaoIcon className="w-5 h-5 absolute left-6" />
          <span className="">카카오 로그인</span>
        </button>

        <button
          type="button"
          onClick={handleNaverLogin}
          className="relative flex items-center justify-center px-6 py-3 font-medium text-base text-gray-200 bg-[#252525] rounded-lg shadow-sm hover:bg-gray-800 transition-colors duration-200"
        >
          <NaverIcon className="w-5 h-5 absolute left-6" />
          <span className="">네이버 로그인</span>
        </button>
      </div>
    </CenterModal>
  );
}
