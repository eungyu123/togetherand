'use client';
import React, { useEffect } from 'react';

interface CenterModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function CenterModal({ isOpen, onClose, children }: CenterModalProps) {
  useEffect(() => {
    // ESC 키 누르면 모달 닫기
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 모달이 열렸을 때 body 스크롤 막기
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    window.addEventListener('keydown', handleKeyDown);

    // 클린업
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 모달이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
