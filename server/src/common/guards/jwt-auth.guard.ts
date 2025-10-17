import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

//  @Injectable() ->  "이 클래스는 주입 가능한 객체다"
// AuthGuard("jwt") -> jwt 전략 사용 ( jwt.strategy.ts 참고)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // JWT 전략 실행
    // const request = context.switchoTHttp().getRequest();
    // console.log("request.headers.authorization", request.headers.authorization);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 인증 실패 시 처리
    if (err || !user) {
      // 인증 실패 시 엑세스 쿠키 삭제
      const response = context.switchToHttp().getResponse<Response>();
      response.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
      });

      throw err || new UnauthorizedException('인증이 필요합니다.');
    }

    return user;
  }
}
