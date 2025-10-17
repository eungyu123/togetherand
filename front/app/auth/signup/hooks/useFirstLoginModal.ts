import { useState, useEffect } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { usersApi } from '@/shared/api/client/users';
import { UserFirstLoginType } from '@/shared/api/types/user';
import { useRouter } from 'next/navigation';
import { s3 } from '@/shared/api/client/s3';
import { useCallStore } from '@/domain/call/store/call';

// 상수 정의
const TOTAL_STEPS = 4;

export function useFirstLoginModal() {
  const router = useRouter();

  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { setUser, setIsAuthenticated, clearUser } = useAuthStore.getState();
  const { setCurrentUser } = useCallStore.getState();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UserFirstLoginType | null>(user);

  // 이벤트 핸들러들
  const handleInputChange = (field: keyof UserFirstLoginType, value: string | number | Blob) => {
    if (!formData) return;

    // age 필드는 숫자로 변환
    if (field === 'age') {
      value = parseInt(value as string);
    }

    setFormData({ ...formData, [field]: value });
  };

  const handleGameToggle = (game: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      playGames: formData.playGames?.includes(game)
        ? formData.playGames?.filter(g => g !== game)
        : [...(formData.playGames || []), game],
    });
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = async () => {
    if (currentStep === 1) {
      clearUser();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!formData) return;
    setIsLoading(true);

    try {
      let photoUrl = formData.photoUrl;

      // blobPhoto이 있으면 S3에 업로드 (Blob 객체)
      if (formData.blobPhoto && formData.blobPhoto instanceof Blob) {
        // S3에 업로드
        const uploadRes = await s3.uploadFileToS3(formData.blobPhoto, `profile_${Date.now()}.jpg`);

        if (!uploadRes.success) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }

        photoUrl = uploadRes.data.fileUrl;
      }

      const updateRes = await usersApi.updateProfile({
        userName: formData.userName,
        email: formData.email,
        photoUrl: photoUrl,
        selfIntroduction: formData.selfIntroduction,
        age: formData.age,
        location: formData.location,
        playGames: formData.playGames,
      });

      if (!updateRes.success) {
        throw new Error(updateRes.message);
      }

      setUser(updateRes.data);
      setCurrentUser({
        userId: updateRes.data.id,
        userName: updateRes.data.userName,
        userPhotoUrl: updateRes.data.photoUrl || undefined,
      });
      setIsAuthenticated(true);
      alert('프로필 설정 완료');
    } catch (error) {
      if (error instanceof Error) {
        alert(`프로필 설정 에러: ${error.message}`);
      } else {
        alert('프로필 설정 에러: 알 수 없는 에러');
        clearUser();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.photoUrl && isAuthenticated) {
      router.replace('/');
    }

    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [user?.photoUrl, isAuthenticated, router]);

  return {
    // 상태
    currentStep,
    isLoading,
    formData,
    setFormData,
    // 핸들러
    handleInputChange,
    handleGameToggle,
    handleNext,
    handlePrev,
    handleComplete,
  };
}
