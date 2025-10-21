import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from '@/shared/utils/debounce';
import friendsApi from '@/domain/friend/api/friends';

export function useUserNameSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 콜백 안쓰면 게속 새로운 디바운스 함수 생겨서 모든 검색을 디바운스 초 이후에 실행됨
  const debouncedSetQuery = useCallback(
    debounce((query: string) => {
      setDebouncedQuery(query);
    }, 400),
    []
  );

  useEffect(() => {
    debouncedSetQuery(searchQuery);
  }, [searchQuery, debouncedSetQuery]);

  const {
    data: searchResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['friendSearch', debouncedQuery],
    queryFn: () => friendsApi.searchUsers({ userName: debouncedQuery }),
    enabled: !!debouncedQuery.trim(),
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    gcTime: 10 * 60 * 1000, // 10분간 메모리 유지
  });

  return {
    searchQuery,
    setSearchQuery,
    searchResult,
    isLoading,
    error,
  };
}
