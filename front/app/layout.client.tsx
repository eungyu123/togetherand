'use client';

import { ReactNode } from 'react';
import SocketProvider from '@/shared/components/providers/SocketProvider';
import AuthProvider from '@/shared/components/providers/AuthProvider';
import QueryProvider from '@/shared/components/providers/QueryProvider';
import { Toaster } from 'react-hot-toast';
import { MediasoupProvider } from '@/domain/mediasoup/components/MediasoupProvider';
import { CallProvider } from '@/domain/call/components/CallProvider';
import { MediaProvider } from '@/shared/components/providers/MediaProvider';
import { MatchProvider } from '@/domain/match/components/MatchProvider';
import PermissionDeniedModal from '@/shared/components/modal/PermissionDeniedModal';
import MatchingWaitModal from '@/domain/match/components/MatchingWaitModal';
import CallingModal from '@/domain/call/components/CallingModal';
import { ChatProvider } from '@/domain/chat/components/ChatProvider';
import MatchingModal from '@/domain/match/components/MatchingModal';

interface ClientLayoutProps {
  children: ReactNode;
  auth: ReactNode;
}

export default function ClientLayout({ children, auth }: ClientLayoutProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <MediaProvider>
          <SocketProvider>
            <CallProvider>
              <MediasoupProvider>
                <MatchProvider>
                  <ChatProvider>
                    {children}
                    {auth} {/* @auth 모달 슬롯 */}
                    <Toaster
                      position="top-center"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: '#1f2937',
                          color: '#f9fafb',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        },
                        success: {
                          iconTheme: {
                            primary: '#10b981',
                            secondary: '#f9fafb',
                          },
                        },
                        error: {
                          iconTheme: {
                            primary: '#ef4444',
                            secondary: '#f9fafb',
                          },
                        },
                      }}
                    />
                    {/* 모달 */}
                    <PermissionDeniedModal />
                    <MatchingWaitModal />
                    <MatchingModal />
                    <CallingModal />
                  </ChatProvider>
                </MatchProvider>
              </MediasoupProvider>
            </CallProvider>
          </SocketProvider>
        </MediaProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
