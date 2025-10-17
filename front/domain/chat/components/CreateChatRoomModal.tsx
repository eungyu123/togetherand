import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/shared/components/modal/Modal';
import { useFriendActions } from '@/domain/friend/hooks/useFriendActions';
import { useChatActions } from '@/domain/chat/hooks/useChatActions';
import { useAuthStore } from '@/shared/stores/auth';
import { useRouter } from 'next/navigation';
import { Camera, Upload } from 'lucide-react';
import { dataURLtoBlob, createImageUrl } from '@/shared/utils/avatarGenerator';

interface CreateChatRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateChatRoomModal({ isOpen, onClose }: CreateChatRoomModalProps) {
  const user = useAuthStore(state => state.user);
  const { useGetFriends } = useFriendActions();
  const { handleCreateChatRoom } = useChatActions();
  const router = useRouter();
  const { data: friends } = useGetFriends();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 친구 선택 처리
  const handleFriendSelect = (friendId: string) => {
    // 그룹 채팅방은 여러 명 선택 가능
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  // 채팅방 생성 처리
  const handleSubmit = async () => {
    if (!user?.id || selectedFriends.length === 0 || !roomName) return;

    setIsLoading(true);
    try {
      const memberIds = [user.id, ...selectedFriends];
      const result = await handleCreateChatRoom({
        name: roomName,
        type: selectedFriends.length > 1 ? 'group' : 'direct',
        memberIds,
      });

      if (result?.success) {
        onClose();
        setSelectedFriends([]);
        setRoomName('');
        router.push(`/friends/chat/${result.data.id}`);
      }
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 업로드 처리 함수
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      try {
        // 파일 크기 제한 (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          alert('파일 크기가 너무 큽니다. 5MB 이하의 파일을 선택해주세요.');
          return;
        }

        // File을 Base64로 변환
        const base64 = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = e => {
            resolve(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        });

        // Base64를 Blob으로 변환
        const blob = dataURLtoBlob(base64);

        // 이미지 URL 생성
        const url = createImageUrl(blob);
        setImageUrl(url);
      } catch (error) {
        console.error('이미지 업로드 에러:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSelectedFriends([]);
      setRoomName('');
      setImageUrl(null);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-main-black-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">채팅방 생성</h2>

        {/* 채팅방 이름 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-300 mb-2">채팅방 이름</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            placeholder="채팅방 이름을 입력하세요"
            className="w-full px-3 py-2 bg-main-black-700 border border-main-black-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-500"
          />
        </div>

        {/* 채팅방 이미지 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-300 mb-2 items-center gap-2">
            <Camera className="w-4 h-4 text-purple-400" />
            채팅방 이미지
          </label>
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-1">
                <div className="w-full h-full rounded-lg overflow-hidden">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="채팅방 이미지"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* 업로드 버튼 */}
              <button
                type="button"
                onClick={handleUploadClick}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors duration-200 z-10"
              >
                <Upload className="w-3 h-3 text-white" />
              </button>
            </div>

            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />

            <p className="text-neutral-400 text-xs">
              사진을 업로드하거나 채팅방 이름으로 기본 이미지가 생성됩니다
            </p>
          </div>
        </div>

        {/* 친구 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-300 mb-2">친구들 선택</label>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {friends?.map(friend => (
              <button
                key={friend.id}
                className={`flex items-center px-4 py-2 w-full border-2 border-solid rounded-lg transition-all duration-300 cursor-pointer
                  ${
                    selectedFriends.includes(friend.id)
                      ? 'border-neutral-400 text-neutral-100 bg-neutral-900/65 border '
                      : 'border-neutral-600 text-neutral-400 bg-neutral-900/45 hover:bg-neutral-900/55 hover:border-neutral-500 hover:text-neutral-300'
                  }`}
                onClick={() => handleFriendSelect(friend.id)}
              >
                <div className="flex items-center">
                  {friend.photoUrl && (
                    <img
                      src={friend.photoUrl}
                      alt={friend.userName}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                  )}
                  <span>{friend.userName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={selectedFriends.length === 0 || isLoading}
            className="flex-1 px-4 py-2 bg-neutral-600 hover:bg-neutral-700 disabled:bg-main-black-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? '생성 중...' : '생성'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-main-black-600 hover:bg-main-black-700 text-white rounded-lg font-medium transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </Modal>
  );
}
