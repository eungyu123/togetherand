import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FriendRequestStatus } from '@/domain/friend/api/friends.type';
import friendsApi from '@/domain/friend/api/friends';

export function useFriendActions() {
  const queryClient = useQueryClient();

  // 친구 요청 보내기
  const addFriendRequestMutation = useMutation({
    mutationFn: (recipientId: string) => friendsApi.createFriendRequest({ recipientId }),
    onSuccess: () => {
      // 보낸 친구 요청, 받은 친구 요청 조회 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      // 친구 검색 조회 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['friendSearch'] });
    },
    onError: error => {
      console.error('친구 요청 실패:', error);
    },
  });

  // 친구 요청 수락
  const acceptFriendRequestMutation = useMutation({
    mutationFn: ({ requestId }: { requestId: string }) =>
      friendsApi.updateFriendRequest(requestId, { status: FriendRequestStatus.ACCEPTED }),
    onSuccess: () => {
      // 친구 요청 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendSearch'] });
      // TODO: 친구 목록 캐시도 무효화 필요
    },
    onError: error => {
      console.error('친구 요청 수락 실패:', error);
    },
  });

  // 친구 요청 거절
  const rejectFriendRequestMutation = useMutation({
    mutationFn: ({ requestId }: { requestId: string }) =>
      friendsApi.updateFriendRequest(requestId, { status: FriendRequestStatus.REJECTED }),
    onSuccess: () => {
      // 친구 요청 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendSearch'] });
    },
    onError: error => {
      console.error('친구 요청 거절 실패:', error);
    },
  });

  // 친구 요청 취소
  const cancelFriendRequestMutation = useMutation({
    mutationFn: ({ requestId }: { requestId: string }) =>
      friendsApi.updateFriendRequest(requestId, { status: FriendRequestStatus.CANCELLED }),
    onSuccess: () => {
      // 친구 요청 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendSearch'] });
    },
    onError: error => {
      console.error('친구 요청 취소 실패:', error);
    },
  });

  // 친구 삭제
  const deleteFriendMutation = useMutation({
    mutationFn: (friendId: string) => friendsApi.deleteFriend(friendId),
    onSuccess: () => {
      // 친구 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      // 친구 요청 관련 캐시도 무효화 (혹시 모를 상황 대비)
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: error => {
      console.error('친구 삭제 실패:', error);
    },
  });

  // 친구 요청 보내기
  const handleAddFriendRequest = async (recipientId: string) => {
    addFriendRequestMutation.mutate(recipientId);
  };

  // 친구 요청 수락
  const handleAcceptFriendRequest = async (requestId: string) => {
    acceptFriendRequestMutation.mutate({ requestId });
  };

  // 친구 요청 거절
  const handleRejectFriendRequest = async (requestId: string) => {
    rejectFriendRequestMutation.mutate({ requestId });
  };

  // 친구 요청 취소
  const handleCancelFriendRequest = async (recipientId: string) => {
    cancelFriendRequestMutation.mutate({ requestId: recipientId });
  };

  // 친구 삭제
  const handleDeleteFriend = async (friendId: string) => {
    deleteFriendMutation.mutate(friendId);
  };

  // 받은 친구 요청 조회
  const useGetFriendRequests = () => {
    return useQuery({
      queryKey: ['friendRequests'],
      queryFn: async () => {
        const [resReceived, resSent] = await Promise.all([
          friendsApi.getFriendRequests('received', FriendRequestStatus.PENDING),
          friendsApi.getFriendRequests('sent', FriendRequestStatus.PENDING),
        ]);
        return {
          received: resReceived.data?.requests || [],
          sent: resSent.data?.requests || [],
        };
      },
      refetchInterval: 30000, // 30초마다 자동 새로고침
      staleTime: 10 * 1000, // 10초간 캐시
    });
  };

  // 친구 목록 조회
  const useGetFriends = () => {
    return useQuery({
      queryKey: ['friends'],
      queryFn: async () => {
        const res = await friendsApi.getFriends();
        return res.data?.friends || [];
      },
      refetchInterval: 30000, // 30초마다 자동 새로고침
      staleTime: 10 * 1000, // 10초간 캐시
    });
  };

  return {
    handleAddFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    handleCancelFriendRequest,
    handleDeleteFriend,
    isAddingFriend: addFriendRequestMutation.isPending,
    isAcceptingRequest: acceptFriendRequestMutation.isPending,
    isRejectingRequest: rejectFriendRequestMutation.isPending,
    isCancellingRequest: cancelFriendRequestMutation.isPending,
    isDeletingFriend: deleteFriendMutation.isPending,
    useGetFriendRequests,
    useGetFriends,
  };
}
