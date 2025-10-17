import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  // ExecutionContext는 Nest에서 HTTP/WS/RPC 등을 다 추상화한 객체입니다.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // switchToWs()는 WebSocket 컨텍스트로 전환
      // .getClient()는 연결된 Socket.IO 클라이언트 객체를 가져옵니다.
      const client: Socket = context.switchToWs().getClient();

      // Socket.IO는 **handshake 시점에 메타데이터(auth, headers 등)**를 함께 보낼 수 있습니다.
      // 여기서는 두 가지 방식 지원:
      // auth.token 방식 (Socket 클라이언트에서 auth: { token }로 보냄)
      // headers.authorization 방식 (Bearer xxx 형태)
      // ✅ 보통 프론트에서 io('ws://...', { auth: { token } }) 이렇게 보냅니다.
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new WsException('인증 토큰이 필요합니다.');
      }

      const payload = this.jwtService.verify(token);
      client.handshake.auth.userId = payload.sub;

      return true;
    } catch (err) {
      throw new WsException('유효하지 않은 토큰입니다.');
    }
  }
}
