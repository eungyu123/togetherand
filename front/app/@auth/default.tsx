// 인터셉터 url이 있다면 그것이 보여지는데 그게 없으면 디폴트.tsx 가보여진다.
// 그래서 위에 보이는 'auth/signin'이랑 '/'은 각각 page가 있는데 다른 url로 접속하면
// 페이지가 없으니까 그냥 default.tsx 가 보여진다.
// 즉 예를 들어 /asd 라는 url로 접속하면 그냥 디폴트.tsx 가 보여지고 없으면 에러뜬다.
export default function Default() {
  return null;
}
