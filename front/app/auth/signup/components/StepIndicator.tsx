import { Check } from 'lucide-react';

const TOTAL_STEPS = 4;

interface StepIndicatorProps {
  currentStep: number;
}
// flex-shrink-0 = 컴포넌트의 크기를 줄이지 않고 유지
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="px-6 py-4 bg-main-black-750">
      <div className="flex items-center">
        {Array.from({ length: TOTAL_STEPS }, (_, index) => {
          const step = index + 1;
          const isCompleted = step < currentStep;
          const isActive = step < currentStep + 1;
          const isLastStep = step === TOTAL_STEPS;

          return (
            <div key={step} className={`flex items-center ${!isLastStep ? 'flex-1' : ''}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isActive
                    ? 'bg-main-black-700 text-neutral-400'
                    : 'bg-main-black-600 text-neutral-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < TOTAL_STEPS && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-blue-600' : 'bg-main-black-600'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
