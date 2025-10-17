'use client';

import { authApi } from '@/shared/api/client/auth';
import { LogOut, Settings, Trash2 } from 'lucide-react';

export default function AccountManagement({ onDeleteClick }: { onDeleteClick: () => void }) {
  const handleLogout = async () => {
    try {
      await authApi.signout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <>
      <div className="bg-main-black-800 lg:rounded-xl p-6 border border-main-black-700 mb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="lg:w-8 lg:h-8 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Settings className="lg:w-4 lg:h-4 w-3 h-3 text-white" />
          </div>
          <h3 className="lg:text-lg text-base font-semibold text-white">계정 관리</h3>
        </div>

        <div className="space-y-4">
          {/* 로그아웃 버튼 */}
          <div className="flex items-center justify-between p-4 bg-main-black-700/50 rounded-lg border border-main-black-600">
            <div>
              <h4 className="text-white font-medium lg:text-base text-sm">로그아웃</h4>
              <p className="text-neutral-400 lg:text-sm text-xs">계정을 안전하게 로그아웃합니다.</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white lg:text-base text-sm rounded-lg transition-colors duration-200 font-medium"
            >
              <LogOut className="lg:w-4 lg:h-4 w-3 h-3" />
              로그아웃
            </button>
          </div>

          {/* 회원탈퇴 버튼 */}
          <div className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-700/30">
            <div className="flex-1 min-w-0 mr-2">
              <h4 className="text-white font-medium lg:text-base text-sm">회원탈퇴</h4>
              <p className="text-red-300 lg:text-sm text-xs break-words">
                계정과 모든 데이터를 영구적으로 삭제합니다.
              </p>
            </div>
            <button
              onClick={onDeleteClick}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white lg:text-base text-sm rounded-lg transition-colors duration-200 font-medium"
            >
              <Trash2 className="lg:w-4 lg:h-4 w-3 h-3" />
              탈퇴하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
