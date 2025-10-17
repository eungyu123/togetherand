export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  memberIds: string[];
  createdAt?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

export interface CreateChatRoomResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: {
    id: string;
    name: string;
    type: 'direct' | 'group';
    imageUrl: string;
    memberCount: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface SubscribeRoomResponse {
  success: boolean;
  roomId: string;
  data: Message[];
  timestamp: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  photoUrl?: string;
  type?: 'text' | 'call_request' | 'call_response';
  content: string;
  createdAt: string;
  callStatus?: 'pending' | 'accepted' | 'declined' | 'ended';
}
