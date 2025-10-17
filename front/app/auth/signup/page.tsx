'use client';

import { Loader } from 'lucide-react';
import { useFirstLoginModal } from './hooks/useFirstLoginModal';
import { ModalHeader } from './components/ModalHeader';
import { StepIndicator } from './components/StepIndicator';
import { BasicInfoStep } from './components/BasicInfoStep';
import { ProfilePhotoStep } from './components/ProfilePhotoStep';
import { GameSelectionStep } from './components/GameSelectionStep';
import { SelfIntroductionStep } from './components/SelfIntroductionStep';
import { ModalFooter } from './components/ModalFooter';

// prettier-ignore
export default function SignupPage() {
  const {
    currentStep,
    isLoading,
    formData,
    handleInputChange,
    handleGameToggle,
    handleNext,
    handlePrev,
    handleComplete,
  } = useFirstLoginModal();

  if (!formData) {
    return (
      <div className="flex justify-center items-center bg-main-black-900 h-dvh w-screen">
        <Loader size={18} className="spin-slow" />
        <p className="text-white">로딩중...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center bg-main-black-900 h-dvh w-screen">
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-main-black-800 rounded-xl border border-main-black-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <ModalHeader />

          {/* 진행 단계 표시 */}
          <StepIndicator currentStep={currentStep} />

          {/* 컨텐츠 */}
          <div className="p-6">
            {currentStep === 1 && (
              <BasicInfoStep formData={formData} onInputChange={handleInputChange} />
            )}
            {currentStep === 2 && (
              <ProfilePhotoStep
                formData={formData}
                onInputChange={handleInputChange}
              />
            )}
            {currentStep === 3 && (
              <GameSelectionStep formData={formData} onGameToggle={handleGameToggle} />
            )}
            {currentStep === 4 && (
              <SelfIntroductionStep
                formData={formData}
                onInputChange={handleInputChange}
              />
            )}
          </div>

          {/* 하단 버튼 */}
          <ModalFooter
            currentStep={currentStep}
            isLoading={isLoading}
            onPrev={handlePrev}
            onNext={handleNext}
            onComplete={handleComplete}
          />
        </div>
      </div>
    </div>
  );
}
