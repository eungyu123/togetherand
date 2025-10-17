import React, { useState } from 'react';
import { authApi } from '@/shared/api/client/auth';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Modal } from '@/shared/components/modal/Modal';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      await authApi.withdraw();
    } catch (error) {
      console.error('❌ 회원탈퇴 에러:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-main-black-800 rounded-xl p-6 border border-main-black-700 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">회원탈퇴 확인</h3>
        </div>

        <div className="mb-6">
          <p className="text-neutral-300 mb-3">정말로 회원탈퇴를 하시겠습니까?</p>
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">
              ⚠️ 이 작업은 되돌릴 수 없습니다. 다음 데이터가 영구적으로 삭제됩니다:
            </p>
            <ul className="text-red-300 text-sm mt-2 space-y-1">
              <li>• 계정 정보 및 프로필</li>
              <li>• 친구 목록 및 채팅 기록</li>
              <li>• 업로드한 파일 및 이미지</li>
              <li>• 모든 활동 기록</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-main-black-700 hover:bg-main-black-600 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            <X className="w-4 h-4" />
            취소
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                처리 중...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                탈퇴하기
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
