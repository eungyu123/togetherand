import { headers } from 'next/headers';
import { getPageMetadata, generateMetaTags } from '@/shared/utils/seo.utils';

export default async function ServerSEO() {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  // 경로에 따른 메타데이터 가져오기
  const pageMetadata = getPageMetadata(pathname);
  const metaTags = generateMetaTags(pageMetadata, pathname);

  return (
    <>
      <title>{metaTags.title}</title>
      <meta name="description" content={metaTags.description} />
      <meta name="keywords" content={metaTags.keywords} />

      {/* 기본 메타데이터 */}
      <meta name="author" content="Make Friend Team" />
      <meta name="creator" content="Make Friend" />
      <meta name="publisher" content="Make Friend" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="format-detection" content="telephone=no, email=no, address=no" />

      {/* Open Graph 메타데이터 */}
      <meta property="og:title" content={metaTags.ogTitle} />
      <meta property="og:description" content={metaTags.ogDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={metaTags.ogUrl} />
      <meta property="og:site_name" content="Make Friend" />
      <meta property="og:locale" content="ko_KR" />
      <meta property="og:image" content={metaTags.ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={metaTags.ogTitle} />

      {/* Twitter 카드 메타데이터 */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTags.twitterTitle} />
      <meta name="twitter:description" content={metaTags.twitterDescription} />
      <meta name="twitter:image" content={metaTags.twitterImage} />

      {/* 검색엔진 최적화 */}
      <meta name="robots" content={metaTags.robots} />
      <link rel="canonical" href={metaTags.canonical} />

      {/* Google 검증 */}
      <meta name="google-site-verification" content="your-google-verification-code" />
    </>
  );
}
