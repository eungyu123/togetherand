'use client';

import { useCallStore } from '@/domain/call/store/call';
import { PhoneIcon } from '@/shared/components/icons';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCallContext } from './CallProvider';

export default function IncomingCallModal() {
  const callState = useCallStore(state => state.callState);
  const callerName = useCallStore(state => state.callerName);
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const { handleAcceptCall, handleRejectCall } = useCallContext();

  // pathname이 변경될 때마다 리렌더링 강제
  useEffect(() => {
    setIsVisible(callState === 'inComing' && !pathname.endsWith('/friends/chat'));
  }, [pathname, callState]);

  if (!isVisible) {
    return null;
  }

  const clickAcceptCall = () => {
    const { roomId } = useCallStore.getState();
    if (!roomId) return;
    handleAcceptCall(roomId);
  };

  const clickRejectCall = () => {
    const { roomId } = useCallStore.getState();
    if (!roomId) return;
    handleRejectCall(roomId);
  };

  return (
    <div className="fixed lg:bottom-4 lg:right-4 lg:top-auto lg:left-auto top-0 left-1/2 lg:translate-x-0 -translate-x-1/2 z-50 p-4">
      <div className="w-xs mx-auto bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* 헤더 */}
        <div className="relative bg-gray-700/60 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">전화 수신</h3>
              <p className="text-slate-300/80 text-xs">
                {callerName || '상대방'}이 전화를 걸었습니다
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* 수락 버튼 */}
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                <button
                  onClick={clickAcceptCall}
                  className="relative p-1 bg-green-500 rounded-full group/button"
                >
                  <PhoneIcon className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* 거절 버튼 */}
              <button
                onClick={clickRejectCall}
                className="p-1 bg-red-500 rounded-full group/button"
              >
                <PhoneIcon className="w-4 h-4 text-white rotate-45" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
