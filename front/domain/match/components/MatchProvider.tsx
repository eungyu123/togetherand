'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useMatch } from '@/domain/match/hooks/useMatch';

interface MatchContextType {
  handleSendMessage: (newMessage: string) => void;
  createMatchRequest: (gameType: string) => Promise<void>;
  cancelMatchRequest: (gameType: string) => Promise<void>;
}

const MatchContext = createContext<MatchContextType | null>(null);

interface MatchProviderProps {
  children: ReactNode;
}

export function MatchProvider({ children }: MatchProviderProps) {
  const { handleSendMessage, createMatchRequest, cancelMatchRequest } = useMatch();

  return (
    <MatchContext.Provider
      value={{
        handleSendMessage,
        createMatchRequest,
        cancelMatchRequest,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
}

export function useMatchContext() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatchContext must be used within a MatchProvider');
  }
  return context;
}
