import { Sparkles } from 'lucide-react';

export function ModalHeader() {
  return (
    <div className="p-6 border-b border-main-black-700">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">프로필 설정</h2>
      </div>
      <p className="text-neutral-400 text-sm">친구들과 소통하기 위한 프로필을 설정해주세요!</p>
    </div>
  );
}
