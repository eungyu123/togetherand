'use client';

import { ReactNode } from 'react';
import { useChatSocketEvents } from '@/domain/chat/hooks/useChatSocketEvents';
export function ChatProvider({ children }: { children: ReactNode }) {
  useChatSocketEvents();

  return children;
}
