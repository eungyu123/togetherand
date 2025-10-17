import { Camera, Upload } from 'lucide-react';
import { UserFirstLoginType } from '@/shared/api/types/user';
import { useRef, useEffect, useState } from 'react';
import { dataURLtoBlob, generateAvatar, createImageUrl } from '@/shared/utils/avatarGenerator';

interface ProfilePhotoStepProps {
  formData: UserFirstLoginType;
  onInputChange: (field: keyof UserFirstLoginType, value: string | Blob) => void;
}

export function ProfilePhotoStep({ formData, onInputChange }: ProfilePhotoStepProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 업로드 처리 함수
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // 선택된 파일 가져오기 (첫 번째 파일만)
    const file = event.target.files?.[0];

    if (file) {
      try {
        // 1. 파일 크기 제한 (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          alert('파일 크기가 너무 큽니다. 5MB 이하의 파일을 선택해주세요.');
          return;
        }

        // 2. File을 Base64로 변환
        const base64 = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = e => {
            resolve(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        });

        // 3. Base64를 Blob으로 변환
        const blob = dataURLtoBlob(base64);

        // 4. Blob 저장
        onInputChange('blobPhoto', blob);

        // 5. 이미지 URL 생성
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

  useEffect(() => {
    if (!formData.blobPhoto && formData.userName) {
      const generatedPhotoUrl = generateAvatar(formData.userName, { size: 200, fontSize: 80 });
      const blob = dataURLtoBlob(generatedPhotoUrl);

      onInputChange('blobPhoto', blob);
      const url = createImageUrl(blob);
      setImageUrl(url);
    }

    if (formData.blobPhoto) {
      const url = createImageUrl(formData.blobPhoto);
      setImageUrl(url);
    }
  }, [formData.blobPhoto, formData.userName, onInputChange]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-purple-400" />
          프로필 사진
        </h3>
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-1">
              <div className="w-full h-full rounded-full overflow-hidden">
                {imageUrl && (
                  <img src={imageUrl} alt="프로필 이미지" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            {/* 업로드 버튼 */}
            <button
              type="button"
              onClick={handleUploadClick}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors duration-200 z-10"
            >
              <Upload className="w-4 h-4 text-white" />
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

          <p className="text-neutral-400 text-sm mt-2">
            사진을 업로드해서 프로필 사진을 설정해주세요
          </p>
        </div>
      </div>
    </div>
  );
}
