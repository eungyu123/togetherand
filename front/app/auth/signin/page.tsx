import { redirect } from 'next/navigation';

// 로그인 페이지에서 새로고침시 메인페이지로 리다이렉트, 인터셉터 라우팅에서는 새로고침안됨
export default function SignInPage() {
  return redirect('/');
}
