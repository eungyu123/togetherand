import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

const TOTAL_STEPS = 4;

interface ModalFooterProps {
  currentStep: number;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
}

export function ModalFooter({
  currentStep,
  isLoading,
  onPrev,
  onNext,
  onComplete,
}: ModalFooterProps) {
  return (
    <div className="p-6 border-t border-main-black-700 flex justify-between">
      <button
        onClick={onPrev}
        className={`flex items-center gap-2 px-4 py-2 hover:bg-main-black-600  rounded-lg transition-colors duration-200
          ${
            currentStep === 1
              ? 'bg-main-black-800 text-neutral-500'
              : 'bg-main-black-700 text-white '
          }
          `}
      >
        <ArrowLeft className="w-4 h-4" />
        {currentStep === 1 ? '취소' : '이전'}
      </button>

      {currentStep < TOTAL_STEPS ? (
        <button
          onClick={onNext}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-neutral-500 text-white rounded-lg transition-colors duration-200"
        >
          다음
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onComplete}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              설정 중...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              완료
            </>
          )}
        </button>
      )}
    </div>
  );
}
