import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/domain/chat/api/chat';

export function useChatActions() {
  const queryClient = useQueryClient();

  // 채팅방 생성
  const createChatRoomMutation = useMutation({
    mutationFn: (data: { name: string; type: 'direct' | 'group'; memberIds: string[] }) =>
      chatApi.createChatRoom(data),
    onSuccess: (data, variables) => {
      // 채팅방 목록 캐시 무효화
      console.log('응답 데이터 ', data, '전달한 데이터 ', variables);
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    },
    onError: error => {
      console.error('채팅방 생성 실패:', error);
    },
  });

  // 채팅방 멤버 추가
  const addMemberToRoomMutation = useMutation({
    mutationFn: ({ roomId, userId, role }: { roomId: string; userId: string; role?: string }) =>
      chatApi.addMemberToRoom(roomId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roomMembers', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    },
    onError: error => {
      console.error('채팅방 멤버 추가 실패:', error);
    },
  });

  // 채팅방 나가기
  const leaveChatRoomMutation = useMutation({
    mutationFn: (roomId: string) => chatApi.leaveChatRoom(roomId),
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomMessages', roomId] });
    },
    onError: error => {
      console.error('채팅방 나가기 실패:', error);
    },
  });

  // 채팅방 삭제
  const deleteChatRoomMutation = useMutation({
    mutationFn: (roomId: string) => chatApi.deleteChatRoom(roomId),
    onSuccess: (_, roomId) => {
      // 채팅방 관련 모든 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomMessages', roomId] });
    },
    onError: error => {
      console.error('채팅방 삭제 실패:', error);
    },
  });

  // 채팅방 수정
  const updateChatRoomMutation = useMutation({
    mutationFn: ({
      roomId,
      data,
    }: {
      roomId: string;
      data: { name?: string; imageUrl?: string };
    }) => chatApi.updateChatRoom(roomId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['roomMembers', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomMessages', variables.roomId] });
    },
    onError: error => {
      console.error('채팅방 수정 실패:', error);
    },
  });

  // 채팅방 생성
  const handleCreateChatRoom = async (data: {
    name: string;
    type: 'direct' | 'group';
    memberIds: string[];
  }) => {
    // mutateAsync 사용해서 리턴 받아서 사용하기
    return createChatRoomMutation.mutateAsync(data);
  };

  // 채팅방 멤버 추가
  const handleAddMemberToRoom = async (roomId: string, userId: string, role?: string) => {
    addMemberToRoomMutation.mutate({ roomId, userId, role });
  };

  // 채팅방 나가기
  const handleLeaveChatRoom = async (roomId: string) => {
    return leaveChatRoomMutation.mutateAsync(roomId);
  };

  // 채팅방 삭제
  const handleDeleteChatRoom = async (roomId: string) => {
    return deleteChatRoomMutation.mutateAsync(roomId);
  };

  // 채팅방 수정
  const handleUpdateChatRoom = async (
    roomId: string,
    data: { name?: string; imageUrl?: string }
  ) => {
    return updateChatRoomMutation.mutateAsync({ roomId, data });
  };

  // 채팅방 목록 조회
  const useGetChatRooms = () => {
    return useQuery({
      queryKey: ['chatRooms'],
      queryFn: async () => {
        const res = await chatApi.getChatRooms();
        return res.data || [];
      },
      refetchInterval: 30000, // 30초마다 자동 새로고침
      staleTime: 10 * 1000, // 10초간 캐시
    });
  };

  // 채팅방 멤버 목록 조회
  const useGetRoomMembers = (roomId: string) => {
    return useQuery({
      queryKey: ['roomMembers', roomId],
      queryFn: async () => {
        const res = await chatApi.getRoomMembers(roomId);
        return res.data || [];
      },
      enabled: !!roomId, // roomId가 있을 때만 실행
      refetchInterval: 30000, // 30초마다 자동 새로고침
      staleTime: 10 * 1000, // 10초간 캐시
    });
  };

  // 채팅방 메시지 목록 조회
  const useGetRoomMessages = (roomId: string, page: number = 1, limit: number = 50) => {
    return useQuery({
      queryKey: ['roomMessages', roomId, page, limit],
      queryFn: async () => {
        const res = await chatApi.getRoomMessages(roomId, page, limit);
        return res.data || [];
      },
      enabled: !!roomId, // roomId가 있을 때만 실행
      staleTime: 30 * 1000, // 30초간 캐시 (이전 메시지는 자주 변경되지 않음)
    });
  };

  // 채팅방 안 읽은 메시지 수 조회
  const useGetRoomUnreadCount = () => {
    return useQuery({
      queryKey: ['unreadCount'],
      queryFn: async () => {
        const res = await chatApi.getRoomUnreadCount();

        // undefined 방지를 위해 기본값 설정
        return res.data || {};
      },
      staleTime: 0, // 캐싱 하지 않음, 매번 새로 요청  그냥 다시 고민해 봐야됨 전부
    });
  };

  return {
    handleCreateChatRoom,
    handleAddMemberToRoom,
    handleLeaveChatRoom,
    handleDeleteChatRoom,
    handleUpdateChatRoom,
    isCreatingRoom: createChatRoomMutation.isPending,
    isAddingMember: addMemberToRoomMutation.isPending,
    useGetChatRooms,
    useGetRoomMembers,
    useGetRoomMessages,
    useGetRoomUnreadCount,
  };
}
