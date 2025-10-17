import { User } from 'lucide-react';
import { UserFirstLoginType } from '@/shared/api/types/user';

interface SelfIntroductionStepProps {
  formData: UserFirstLoginType;
  onInputChange: (field: keyof UserFirstLoginType, value: string) => void;
}

export function SelfIntroductionStep({ formData, onInputChange }: SelfIntroductionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-orange-400" />
          자기소개
        </h3>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">자기소개</label>
          <textarea
            value={formData.selfIntroduction || ''}
            onChange={e => onInputChange('selfIntroduction', e.target.value)}
            placeholder="자신을 소개해주세요..."
            rows={4}
            className="w-full bg-main-black-700 border border-main-black-600 rounded-lg p-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* 요약 */}
      <div className="bg-main-black-700/50 rounded-lg p-4 border border-main-black-600">
        <h4 className="text-white font-medium mb-3">설정 요약</h4>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-neutral-400">닉네임:</span>{' '}
            <span className="text-white">{formData.userName}</span>
          </p>
          <p>
            <span className="text-neutral-400">나이:</span>{' '}
            <span className="text-white">
              {typeof formData.age === 'number' && formData.age >= 0 ? `${formData.age}세` : ''}
            </span>
          </p>
          <p>
            <span className="text-neutral-400">위치:</span>{' '}
            <span className="text-white">{formData.location}</span>
          </p>
          <p>
            <span className="text-neutral-400">관심 게임:</span>{' '}
            <span className="text-white">{formData.playGames?.join(', ') || '없음'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
