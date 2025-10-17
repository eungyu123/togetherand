'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCallManagement } from '@/domain/call/hooks/useCallManagement';

interface CallContextType {
  handleInitiateCall: (roomId: string) => Promise<void>;
  handleAcceptCall: (roomId: string) => Promise<void>;
  handleRejectCall: (roomId: string) => Promise<void>;
  handleEndCall: (roomId: string) => Promise<void>;
}

const CallContext = createContext<CallContextType | null>(null);

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  // console.log('🔍 CallProvider 렌더링');
  const { handleInitiateCall, handleAcceptCall, handleRejectCall, handleEndCall } =
    useCallManagement();

  return (
    <CallContext.Provider
      value={{
        handleInitiateCall,
        handleAcceptCall,
        handleRejectCall,
        handleEndCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return context;
}
