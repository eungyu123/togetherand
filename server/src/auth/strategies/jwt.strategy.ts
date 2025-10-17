import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './types/jwt-payload.type';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Cookie에서 accessToken 추출
        req => {
          if (req && req.cookies && req.cookies.accessToken) {
            const token = req.cookies.accessToken;
            console.log('✅ Cookie에서 토큰 추출:', token.substring(0, 20) + '...');
            return token;
          }
          console.log('❌ Cookie에 토큰 없음');
          return null;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      ignoreExpiration: false, // 만료 무시 안함 -> 보안 강화
      passReqToCallback: true, // 요청 객체 전달 함
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    console.log('🔍 JWT Strategy validate 함수 실행됨');
    console.log('🔍 payload:', payload);

    if (!payload.userId) {
      throw new UnauthorizedException('토큰에 사용자 정보가 없습니다.');
    }

    if (!payload.type || payload.type !== 'access') {
      throw new UnauthorizedException('토큰 타입이 유효하지 않습니다.');
    }

    if (payload.exp < Date.now() / 1000) {
      throw new UnauthorizedException('토큰이 만료되었습니다.');
    }

    if (payload.iat > payload.exp) {
      throw new UnauthorizedException('토큰이 유효하지 않습니다.');
    }

    if (payload.aud !== process.env.JWT_AUDIENCE) {
      throw new UnauthorizedException('토큰 대상자가 유효하지 않습니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return {
      id: payload.userId, // id로 통일
    };
  }
}
