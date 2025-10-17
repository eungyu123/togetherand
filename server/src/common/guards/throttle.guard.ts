import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

// 요청 제한
@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const endpoint = request.route.path;

    // 키 생성 (IP + 엔드포인트)
    const key = `throttle:${ip}:${endpoint}`;

    // 현재 요청 수 확인
    const currentCount = (await this.redisService.get(key)) || 0;
    const maxRequests = 100; // 1분당 최대 요청 수
    const windowMs = 60 * 1000; // 1분

    // 요청 수가 제한을 초과하면 거부
    if (currentCount >= maxRequests) {
      throw new HttpException("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS);
    }

    // 요청 수 증가
    await this.redisService.set(key, currentCount + 1, windowMs);

    return true;
  }
}
