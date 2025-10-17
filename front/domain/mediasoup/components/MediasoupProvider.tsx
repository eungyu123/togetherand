'use client';

import { ReactNode } from 'react';
import { useMediasoup } from '@/domain/mediasoup/hooks/useMediasoup';

interface MediasoupProviderProps {
  children: ReactNode;
}

export function MediasoupProvider({ children }: MediasoupProviderProps) {
  useMediasoup();

  return children;
}
