'use client';

import { useCallStore } from '@/domain/call/store/call';
import { PhoneIcon } from '@/shared/components/icons';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCallControls } from '@/domain/mediasoup/hooks/useCallControls';

export default function InCallModal() {
  const callState = useCallStore(state => state.callState);
  const callerName = useCallStore(state => state.callerName);
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const { mediasoupEnd } = useCallControls();

  // pathname이 변경될 때마다 리렌더링 강제
  useEffect(() => {
    setIsVisible(callState === 'inCall' && !pathname.endsWith('/friends/chat'));
  }, [pathname, callState]);

  const clickEndCall = () => {
    mediasoupEnd();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed lg:bottom-4 lg:right-4 lg:top-auto lg:left-auto top-0 left-1/2 lg:translate-x-0 -translate-x-1/2 z-50 p-4">
      <div className="w-xs mx-auto bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* 헤더 */}
        <div className="relative bg-gray-700/60 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 전화 아이콘 */}
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-lg">
                  <PhoneIcon className="w-4 h-4 text-white" />
                </div>
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-pulse"></div>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm">전화 중</h3>
                <p className="text-slate-300/80 text-xs">{callerName || '상대방'}과 통화 중</p>
              </div>
            </div>

            <button
              onClick={clickEndCall}
              className="p-1.5 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-red-500/25"
            >
              <PhoneIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
