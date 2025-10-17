'use client';

import { useCallStore } from '@/domain/call/store/call';
import { Loader2, Phone, PhoneOff } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCallControls } from '@/domain/mediasoup/hooks/useCallControls';

export default function MatchingModal() {
  const callState = useCallStore(state => state.callState);
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const { mediasoupEnd } = useCallControls();

  // pathname이 변경될 때마다 리렌더링 강제
  useEffect(() => {
    setIsVisible(callState === 'inMatch' && pathname !== '/');
  }, [pathname, callState]);

  const clickEndCall = async () => {
    await mediasoupEnd();
  };

  // 매칭 대기 중이 아니거나 특정 경로에서는 숨기기
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed lg:bottom-4 lg:right-4 lg:top-auto lg:left-auto top-0 left-1/2 lg:translate-x-0 -translate-x-1/2 z-50 p-4">
      <div className="w-xs mx-auto bg-gray-800/40 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* 헤더 */}
        <div className="relative bg-gray-700/60 px-4 py-4">
          <div className="px-3 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">매칭 중</h3>
              <p className="text-slate-300/80 text-xs">연결됨</p>
            </div>

            <button
              onClick={clickEndCall}
              className="p-1.5 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-red-500/25"
            >
              <PhoneOff size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
