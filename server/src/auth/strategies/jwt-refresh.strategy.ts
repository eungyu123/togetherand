import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtRefreshPayload } from "./types/jwt-refresh-payload.type";
import { Repository } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { Request } from "express";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(
    @InjectRepository(User) // 유저 엔티티 주입
    private readonly userRepository: Repository<User>, // 유저 레포지토리 주입
    private readonly redisService: RedisService // 레디스 서비스 주입
  ) {
    super({
      jwtFromRequest: extractRefreshToken,
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      ignoreExpiration: false, // 만료 무시 안함 -> 보안 강화
      passReqToCallback: true, // 요청 객체 전달 함
    });
  }

  async validate(payload: JwtRefreshPayload) {
    if (!payload.userId) {
      throw new UnauthorizedException("토큰에 사용자 정보가 없습니다.");
    }

    if (payload.type && payload.type !== "refresh") {
      throw new UnauthorizedException("토큰 타입이 유효하지 않습니다.");
    }

    if (payload.exp < Date.now() / 1000) {
      throw new UnauthorizedException("토큰이 만료되었습니다.");
    }

    if (payload.iat > payload.exp) {
      throw new UnauthorizedException("토큰이 유효하지 않습니다.");
    }

    if (payload.aud !== process.env.JWT_AUDIENCE) {
      throw new UnauthorizedException("토큰 대상자가 유효하지 않습니다.");
    }

    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
    }

    const isBlacklisted = await this.redisService.get(`refresh-blacklist:${payload.userId}`);
    if (isBlacklisted) {
      throw new UnauthorizedException("토큰이 블랙리스트에 등록되어 있습니다.");
    }

    return {
      userId: payload.userId,
    };
  }
}

function extractRefreshToken(req: Request): string | null {
  if (req.cookies && req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  } else {
    return null;
  }
}
