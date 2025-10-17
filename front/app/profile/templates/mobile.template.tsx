'use client';

import ProfileCard from '@/app/profile/components/ProfileCard';
import AccountManagement from '@/app/profile/components/AccountManagement';
import DeleteAccountModal from '@/app/profile/components/DeleteAccountModal';
import MobileBottomNav from '@/shared/components/navigations/mobile.BottomNav';

export default function DesktopTemplate({
  showDeleteModal,
  onCloseModal,
  onDeleteClick,
}: {
  showDeleteModal: boolean;
  onCloseModal: () => void;
  onDeleteClick: () => void;
}) {
  return (
    <div className="bg-main-black-900 h-dvh w-screen text-neutral-200 flex flex-col">
      <div className="flex-1 overflow-y-auto ">
        <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto ">
          {/* 프로필 카드 */}
          <ProfileCard />
          {/* 계정 관리 */}
          <AccountManagement onDeleteClick={onDeleteClick} />
        </div>
      </div>

      <MobileBottomNav />

      {/* 회원탈퇴 모달 */}
      <DeleteAccountModal isOpen={showDeleteModal} onClose={onCloseModal} />
    </div>
  );
}
