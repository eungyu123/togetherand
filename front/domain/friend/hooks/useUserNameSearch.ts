import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from '@/shared/utils/debounce';
import friendsApi from '@/domain/friend/api/friends';

export function useUserNameSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const debouncedSetQuery = debounce((query: string) => {
      setDebouncedQuery(query);
    }, 300);

    debouncedSetQuery(searchQuery);
  }, [searchQuery]);

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
