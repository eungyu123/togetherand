'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useMedia } from '@/shared/hooks/useMedia';

interface MediaContextType {
  isMobile: boolean;
  isDesktop: boolean;
}

const MediaContext = createContext<MediaContextType | null>(null);

interface MediaProviderProps {
  children: ReactNode;
}

export function MediaProvider({ children }: MediaProviderProps) {
  const { isMobile, isDesktop } = useMedia();

  return <MediaContext.Provider value={{ isMobile, isDesktop }}>{children}</MediaContext.Provider>;
}

export function useMediaContext() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMediaContext must be used within a MediaProvider');
  }
  return context;
}
