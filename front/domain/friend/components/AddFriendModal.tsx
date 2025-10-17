'use client';

import { useRef, useEffect } from 'react';
import { useUserNameSearch } from '@/domain/friend/hooks/useUserNameSearch';
import { useFriendActions } from '@/domain/friend/hooks/useFriendActions';
import { Search, UserPlus, Loader2, Check, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { SearchedUserDto } from '@/domain/friend/api/friends.type';

export function AddFriendModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { searchQuery, setSearchQuery, searchResult, isLoading, error } = useUserNameSearch();
  const modalRef = useRef<HTMLDivElement>(null);

  // prettier-ignore
  const {
    handleAddFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
  } = useFriendActions();

  // 모달 바깥쪽 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-main-black-800 rounded-xl p-6 border border-main-black-700 max-w-md w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">친구 추가</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="사용자 이름으로 검색..."
            className="w-full bg-main-black-700 border border-main-black-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 검색 결과 */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="ml-2 text-neutral-400">검색 중...</span>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm text-center py-4">
              검색 중 오류가 발생했습니다.
            </div>
          )}

          {searchResult?.data?.map((user: SearchedUserDto) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-main-black-700 rounded-lg border border-main-black-600"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={user.photoUrl || ''}
                  alt={user.userName}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-xs"
                />
                <div>
                  <p className="text-white font-medium">{user.userName}</p>
                  {/* <p className="text-neutral-400 text-sm">{user.email}</p> */}
                </div>
              </div>

              {user.receivedFriendRequest && user.receivedFriendRequestId && (
                // 받은 친구 요청이 있는 경우 - 수락/거절 버튼
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptFriendRequest(user.receivedFriendRequestId!)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRejectFriendRequest(user.receivedFriendRequestId!)}
                    className="flex items-center gap-2 px-3 py-2 bg-main-black-300 hover:bg-main-black-600 text-white rounded-lg transition-colors duration-200 text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {user.sentFriendRequest && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors duration-200 text-sm">
                  <Check className="w-4 h-4" />
                  <span>요청 중...</span>
                </div>
              )}

              {!user.receivedFriendRequest && !user.sentFriendRequest && (
                <button
                  onClick={() => handleAddFriendRequest(user.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors duration-200 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>친구 추가</span>
                </button>
              )}
            </div>
          ))}

          {searchQuery && !isLoading && searchResult?.data?.length === 0 && (
            <div className="text-neutral-400 text-center py-4">검색 결과가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
