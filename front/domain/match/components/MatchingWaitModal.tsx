'use client';

import { useCallStore } from '@/domain/call/store/call';
import { Loader2, X } from 'lucide-react';
import { useMatchContext } from '@/domain/match/components/MatchProvider';
import { useMatchStore } from '@/domain/match/store/match';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MatchingWaitModal() {
  const callState = useCallStore(state => state.callState);
  const { cancelMatchRequest } = useMatchContext();
  const gameType = useMatchStore(state => state.gameType);
  const { setGameType } = useMatchStore.getState();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  // pathname이 변경될 때마다 리렌더링 강제
  useEffect(() => {
    setIsVisible(callState === 'inMatchWait' && pathname !== '/');
  }, [pathname, callState]);

  // 매칭 대기 중이 아니거나 특정 경로에서는 숨기기
  if (!isVisible) {
    return null;
  }

  const handleCancelMatch = async () => {
    await cancelMatchRequest(gameType);
    setGameType('any_option');
  };

  return (
    <div className="fixed lg:bottom-4 lg:right-4 lg:top-auto lg:left-auto top-0 left-1/2 lg:translate-x-0 -translate-x-1/2 z-50 p-4">
      <div className="w-xs mx-auto bg-gray-800/40 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* 헤더 */}
        <div className="relative bg-gray-700/60 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 매칭 아이콘 */}
              <div className="relative">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <Loader2 size={16} className="text-gray-200 animate-spin" />
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm">매칭 대기</h3>
                <p className="text-white/80 text-xs">상대방을 찾는 중입니다...</p>
              </div>
            </div>

            <button
              onClick={handleCancelMatch}
              className="p-1.5 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors"
            >
              <X size={16} className="text-gray-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
