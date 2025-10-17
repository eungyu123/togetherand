'use client';

import { FriendsDesktopTemplate } from './_template/desktop.template';
import { FriendsMobileTemplate } from './_template/mobiletemplate';
import { useMediaContext } from '@/shared/components/providers/MediaProvider';

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  const { isDesktop } = useMediaContext();
  return (
    <>
      {isDesktop ? (
        <FriendsDesktopTemplate>{children}</FriendsDesktopTemplate>
      ) : (
        <FriendsMobileTemplate>{children}</FriendsMobileTemplate>
      )}
    </>
  );
}
