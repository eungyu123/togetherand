'use client';

import OutgoingCallModal from './OutgoingCallModal';
import IncomingCallModal from './IncomingCallModal';
import InCallModal from './InCallModal';

export default function CallingModal() {
  return (
    <>
      <OutgoingCallModal />
      <IncomingCallModal />
      <InCallModal />
    </>
  );
}
