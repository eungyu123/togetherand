'use client';

import { useCallStore } from '@/domain/call/store/call';
import { Phone, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCallContext } from './CallProvider';

export default function OutgoingCallModal() {
  const callState = useCallStore(state => state.callState);
  const callerName = useCallStore(state => state.callerName);
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const { handleEndCall } = useCallContext();

  // pathname이 변경될 때마다 리렌더링 강제
  useEffect(() => {
    setIsVisible(callState === 'outGoing' && !pathname.endsWith('/friends/chat'));
  }, [pathname, callState]);

  if (!isVisible) {
    return null;
  }
  const clickEndCall = () => {
    const { roomId } = useCallStore.getState();
    if (!roomId) return;
    handleEndCall(roomId);
  };

  return (
    <div className="fixed lg:bottom-4 lg:right-4 lg:top-auto lg:left-auto top-0 left-1/2 lg:translate-x-0 -translate-x-1/2 z-50 p-4">
      <div className="w-xs mx-auto bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* 헤더 */}
        <div className="relative bg-gray-700/60 px-4 py-4">
          <div className="px-3 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">발신 중 ...</h3>
            </div>

            <button
              onClick={clickEndCall}
              className="p-1.5 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-red-500/25"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
