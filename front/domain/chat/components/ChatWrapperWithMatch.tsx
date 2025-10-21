'use client';

import { MessageInput } from '@/domain/chat/components/MessageInput';
import { useCallStore } from '@/domain/call/store/call';
import { MessageListWithMatch } from '@/domain/chat/components/MessageListWithMatch';

export default function ChatWrapperWithMatch() {
  const roomId = useCallStore(state => state.roomId);

  return (
    <div className="flex flex-col lg:p-4 w-full lg:w-1/4  h-full bg-[#131314] lg:rounded-xl overflow-hidden">
      <div className="flex flex-col w-full h-full bg-[#1a191a] rounded-xl">
        {/* 메시지 목록 */}
        <MessageListWithMatch roomId={roomId} />
        {/* 메시지 입력창 */}
        <MessageInput roomId={roomId} socketType="match" />
      </div>
    </div>
  );
}
