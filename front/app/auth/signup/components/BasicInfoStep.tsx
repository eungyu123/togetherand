import { User } from 'lucide-react';
import { UserFirstLoginType } from '@/shared/api/types/user';

interface BasicInfoStepProps {
  formData: UserFirstLoginType;
  onInputChange: (field: keyof UserFirstLoginType, value: string) => void;
}

export function BasicInfoStep({ formData, onInputChange }: BasicInfoStepProps) {
  return (
    <div className="space-y-6" role="main" aria-labelledby="basic-info-title">
      <div>
        <h3
          id="basic-info-title"
          className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
        >
          <User className="w-5 h-5 text-blue-400" aria-hidden="true" />
          기본 정보
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">닉네임</label>
            <input
              type="text"
              value={formData.userName}
              onChange={e => onInputChange('userName', e.target.value)}
              placeholder="닉네임을 입력하세요"
              className="w-full bg-main-black-700 border border-main-black-600 rounded-lg p-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">나이</label>
              <input
                type="text"
                value={typeof formData.age === 'number' && formData.age >= 0 ? formData.age : ''}
                onChange={e => onInputChange('age', e.target.value)}
                className="w-full bg-main-black-700 border border-main-black-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">위치</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={e => onInputChange('location', e.target.value)}
                placeholder="도시명"
                className="w-full bg-main-black-700 border border-main-black-600 rounded-lg p-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
