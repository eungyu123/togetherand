'use client';

import { useState } from 'react';
import DesktopTemplate from '@/app/profile/templates/desktop.template';
import MobileTemplate from '@/app/profile/templates/mobile.template';
import { useMediaContext } from '@/shared/components/providers/MediaProvider';

export default function ProfilePage() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { isDesktop } = useMediaContext();
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleModalClose = () => {
    setShowDeleteModal(false);
  };

  return (
    <>
      {isDesktop ? (
        <DesktopTemplate
          showDeleteModal={showDeleteModal}
          onCloseModal={handleModalClose}
          onDeleteClick={handleDeleteClick}
        />
      ) : (
        <MobileTemplate
          showDeleteModal={showDeleteModal}
          onCloseModal={handleModalClose}
          onDeleteClick={handleDeleteClick}
        />
      )}
    </>
  );
}
