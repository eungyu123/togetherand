// SEO 유틸리티 함수들

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  noIndex?: boolean;
}

// 기본 메타데이터
const defaultMetadata: PageMetadata = {
  title: 'Make Friend - 게임 친구 매칭 플랫폼',
  description:
    '게임 친구를 찾고 함께 플레이할 수 있는 매칭 플랫폼입니다. 다양한 게임에서 새로운 친구들을 만나보세요.',
  keywords: ['게임', '친구', '매칭', '플랫폼', '게임친구', '온라인게임'],
};

// 페이지별 메타데이터 맵
const pageMetadataMap: Record<string, PageMetadata> = {
  '/': {
    title: 'Make Friend - 게임 친구 매칭 플랫폼',
    description:
      '게임 친구를 찾고 함께 플레이할 수 있는 매칭 플랫폼입니다. 다양한 게임에서 새로운 친구들을 만나보세요.',
    keywords: ['게임', '친구', '매칭', '플랫폼', '게임친구', '온라인게임'],
  },

  '/friends': {
    title: '친구 목록 - Make Friend',
    description: '내 게임 친구들을 확인하고 새로운 친구를 추가해보세요.',
    keywords: ['친구목록', '게임친구', '친구추가', '친구관리'],
  },

  '/friends/chat': {
    title: '채팅 - Make Friend',
    description: '게임 친구들과 실시간으로 채팅하고 소통하세요.',
    keywords: ['채팅', '실시간채팅', '게임채팅', '친구채팅'],
  },

  '/profile': {
    title: '프로필 - Make Friend',
    description: '내 프로필을 관리하고 게임 정보를 설정하세요.',
    keywords: ['프로필', '게임정보', '프로필관리', '계정설정'],
  },

  '/auth/signin': {
    title: '로그인 - Make Friend',
    description: 'Make Friend에 로그인하여 게임 친구를 만나보세요.',
    keywords: ['로그인', '회원가입', '게임친구', '로그인'],
  },

  '/auth/signup': {
    title: '회원가입 - Make Friend',
    description: 'Make Friend에 가입하여 게임 친구를 만나보세요.',
    keywords: ['회원가입', '가입', '게임친구', '신규가입'],
  },
};

// 동적 경로 패턴 매칭
const dynamicRoutePatterns = [
  {
    pattern: /^\/friends\/chat\/[^\/]+$/,
    metadata: {
      title: '채팅방 - Make Friend',
      description: '게임 친구들과 실시간으로 채팅하고 소통하세요.',
      keywords: ['채팅방', '실시간채팅', '게임채팅', '친구채팅'],
    },
  },
  {
    pattern: /^\/friends\/receive$/,
    metadata: {
      title: '친구 요청 받기 - Make Friend',
      description: '받은 친구 요청을 확인하고 수락하세요.',
      keywords: ['친구요청', '친구받기', '친구수락', '친구관리'],
    },
  },
  {
    pattern: /^\/friends\/send$/,
    metadata: {
      title: '친구 요청 보내기 - Make Friend',
      description: '새로운 친구에게 요청을 보내보세요.',
      keywords: ['친구요청', '친구보내기', '친구추가', '친구관리'],
    },
  },
];

/**
 * 경로에 따른 메타데이터를 반환합니다.
 */
export function getPageMetadata(pathname: string): PageMetadata {
  // 정확한 경로 매칭
  if (pageMetadataMap[pathname]) {
    return pageMetadataMap[pathname];
  }

  // 동적 경로 패턴 매칭
  for (const route of dynamicRoutePatterns) {
    if (route.pattern.test(pathname)) {
      return route.metadata;
    }
  }

  // 기본 메타데이터 반환
  return defaultMetadata;
}

/**
 * 메타데이터를 HTML 메타 태그로 변환합니다.
 */
export function generateMetaTags(metadata: PageMetadata, pathname: string) {
  const baseUrl = 'https://make-friend.vercel.app';
  const fullUrl = `${baseUrl}${pathname}`;

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords.join(', '),
    ogTitle: metadata.title,
    ogDescription: metadata.description,
    ogUrl: fullUrl,
    ogImage: metadata.ogImage || `${baseUrl}/og-image.png`,
    twitterTitle: metadata.title,
    twitterDescription: metadata.description,
    twitterImage: metadata.ogImage || `${baseUrl}/og-image.png`,
    canonical: fullUrl,
    robots: metadata.noIndex ? 'noindex, nofollow' : 'index, follow',
  };
}

/**
 * 새로운 페이지 메타데이터를 등록합니다.
 */
export function registerPageMetadata(pathname: string, metadata: PageMetadata) {
  pageMetadataMap[pathname] = metadata;
}

/**
 * 동적 경로 패턴을 등록합니다.
 */
export function registerDynamicRoute(pattern: RegExp, metadata: PageMetadata) {
  dynamicRoutePatterns.push({ pattern, metadata });
}
