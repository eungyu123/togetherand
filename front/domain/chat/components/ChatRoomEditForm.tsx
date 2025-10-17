import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Check } from 'lucide-react';
import { dataURLtoBlob, createImageUrl } from '@/shared/utils/avatarGenerator';

interface ChatRoomEditModalProps {
  onClose: () => void;
  roomId: string;
  currentRoomName: string;
  currentRoomImage?: string;
  onSave: (roomName: string, roomImage: Blob | null) => Promise<void>;
}

export function ChatRoomEditForm({
  onClose,
  roomId,
  currentRoomName,
  currentRoomImage,
  onSave,
}: ChatRoomEditModalProps) {
  const [roomName, setRoomName] = useState(currentRoomName);
  const [roomImage, setRoomImage] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(currentRoomImage || null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때마다 현재 값으로 초기화
  useEffect(() => {
    setRoomName(currentRoomName);
    setRoomImage(null);
    setImageUrl(currentRoomImage || null);
  }, [currentRoomName, currentRoomImage]);

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
        setRoomImage(blob);

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

  // 저장 처리
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(roomName.trim(), roomImage);
      onClose();
    } catch (error) {
      console.error('채팅방 정보 수정 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className=" rounded-lg lg:px-6 px-2 py-4 w-full">
      {/* 채팅방 이름 입력 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-300 mb-2">채팅방 이름</label>
        <input
          type="text"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          placeholder="채팅방 이름을 입력하세요"
          className="w-full px-3 py-2 bg-main-black-800 border border-main-black-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-500"
        />
      </div>

      {/* 채팅방 이미지 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-300 mb-2  items-center gap-2">
          채팅방 이미지
        </label>
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-2">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-1">
              <div className="w-full h-full rounded-lg overflow-hidden">
                {imageUrl && (
                  <img src={imageUrl} alt="채팅방 이미지" className="w-full h-full object-cover" />
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

          <p className="text-neutral-400 text-xs">사진을 업로드해서 채팅방 이미지를 수정하세요</p>
        </div>
      </div>

      {/* 버튼들 */}
      <div className="flex gap-3  text-sm ">
        <button
          onClick={handleSave}
          disabled={isLoading || !roomName.trim()}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white lg:text-base text-sm rounded-lg transition-colors"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline mr-2"></div>
              저장 중...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 inline mr-2" />
              저장
            </>
          )}
        </button>
        <button
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-main-black-800 hover:bg-neutral-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4 inline mr-2" />
          취소
        </button>
      </div>
    </div>
  );
}
