import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { getKoreanTimeFormatted } from 'src/common/utils/date.util';
import * as bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from 'src/mail/mail.service';
import { REDIS_KEYS } from 'src/redis/keys/keys';
import axios, { AxiosResponse } from 'axios';
const qs = require('qs');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService
  ) {}

  /**
   * 회원가입
   */
  async signUp(signUpProps: {
    email: string;
    password: string;
    userName: string;
    phoneNumber?: string;
    verifyCode: string;
  }) {
    try {
      const { email, password, userName, phoneNumber, verifyCode } = signUpProps;

      // typeOrm 에서 단건 조회
      // AND => where: {email: email, userName: userName} 이렇게 조회된다.
      // OR => where: [{email: email}, {userName: userName}] 이렇게 조회된다.
      const existingUser = await this.usersRepository.findOne({ where: [{ email }, { userName }] });
      if (existingUser) {
        if (existingUser.email === email) throw new ConflictException('❌ 이미 존재하는 이메일입니다.');
        if (existingUser.userName === userName) throw new ConflictException('❌ 이미 존재하는 사용자 이름입니다.');
      }

      const code = await this.redisService.get(REDIS_KEYS.EMAIL_VERIFICATION(email));
      if (!code) {
        throw new BadRequestException('❌ 인증 코드가 만료되었거나 존재하지 않습니다.');
      }
      if (code !== verifyCode) {
        throw new BadRequestException('❌ 인증 코드가 일치하지 않습니다.');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const saveUser = await this.usersRepository.save({
        email,
        passwordHash: hashedPassword,
        userName,
        phoneNumber,
      });

      this.logger.log(`✅ 회원가입 완료. ${email}`);

      return {
        id: saveUser.id,
        email: saveUser.email,
        password: saveUser.passwordHash,
        userName: saveUser.userName,
        phoneNumber: saveUser.phoneNumber,
        createdAt: getKoreanTimeFormatted(),
        updatedAt: getKoreanTimeFormatted(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 회원가입 실패', { cause: error });
    }
  }

  /**
   * 로그인
   */
  async signIn(signInProps: { email: string; password: string }) {
    try {
      const { email, password } = signInProps;

      const user = await this.usersRepository.findOne({ where: { email } });
      if (!user) {
        throw new UnauthorizedException('❌ 존재하지 않는 이메일입니다.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('❌ 비밀번호가 일치하지 않습니다.');
      }

      const sessionId = uuidv4();
      const accessToken = this.jwtService.sign(
        { userId: user.id, type: 'access' },
        {
          expiresIn: '15m',
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
          secret: process.env.JWT_SECRET,
        }
      );

      const refreshToken = this.jwtService.sign(
        { userId: user.id, type: 'refresh', sessionId },
        {
          expiresIn: '7d',
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
          secret: process.env.JWT_REFRESH_SECRET,
        }
      );

      await this.redisService.set(REDIS_KEYS.REFRESH_TOKEN(user.id, sessionId), refreshToken, 60 * 60 * 24 * 7 * 1000);

      this.logger.log(`✅ 로그인 완료. ${email}`);

      return { accessToken, refreshToken, user };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 로그인 실패', { cause: error });
    }
  }

  /**
   * 로그아웃
   */
  async signOut({ refreshToken }: { refreshToken: string }) {
    try {
      const decoded = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      const userId = decoded.userId;
      const sessionId = decoded.sessionId;

      await this.redisService.set(REDIS_KEYS.REFRESH_BLACKLIST(userId, sessionId), 'true', 60 * 60 * 24 * 7 * 1000); // 7 days
      await this.redisService.del(REDIS_KEYS.REFRESH_TOKEN(userId, sessionId)); // 리프레쉬 토큰 삭제

      this.logger.log(`✅ 로그아웃 완료. ${userId}`);

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 로그아웃 실패', { cause: error });
    }
  }

  /**
   * 리프레쉬 토큰
   */
  async refreshToken({ refreshToken }: { refreshToken: string }) {
    try {
      const decoded = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      const userId = decoded.userId;
      const sessionId = decoded.sessionId;

      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new UnauthorizedException('❌ 사용자를 찾을 수 없습니다.');
      }

      const isBlacklisted = await this.redisService.get(REDIS_KEYS.REFRESH_BLACKLIST(userId, sessionId));
      if (isBlacklisted) {
        throw new UnauthorizedException('❌ 토큰이 블랙리스트에 등록되어 있습니다.');
      }

      const newSessionId = uuidv4();
      const newAccessToken = this.jwtService.sign(
        { userId: userId, type: 'access' },
        {
          expiresIn: '10m',
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
          secret: process.env.JWT_SECRET,
        }
      );
      const newRefreshToken = this.jwtService.sign(
        { userId: userId, type: 'refresh', sessionId: newSessionId },
        {
          expiresIn: '7d',
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
          secret: process.env.JWT_REFRESH_SECRET,
        }
      );
      // 리프레쉬 토큰 갱싱 (자동 덮어씌움)
      await this.redisService.set(
        REDIS_KEYS.REFRESH_TOKEN(userId, newSessionId),
        newRefreshToken,
        60 * 60 * 24 * 7 * 1000
      );

      this.logger.log(`✅ 리프레쉬 토큰 갱싱 완료. ${userId}`);

      return { newAccessToken, newRefreshToken };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 리프레쉬 토큰 갱싱 실패', { cause: error });
    }
  }

  /**
   * 이메일 인증 코드 전송
   */
  async sendVerificationCode({ email }: { email: string }) {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await this.redisService.set(REDIS_KEYS.EMAIL_VERIFICATION(email), code, 60 * 20 * 1000); // 20분 후 만료
      await this.mailService.sendMail({ to: email, subject: '이메일 인증 코드', text: `인증 코드: ${code}` });

      this.logger.log(`✅ 이메일:${email}, 인증 코드:${code} 전송 완료`);

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 메일 전송 실패', { cause: error });
    }
  }

  /**
   * 이메일 인증 코드 검증
   */
  async verifyEmailNumber({ email, verifyCode }: { email: string; verifyCode: string }) {
    const code = await this.redisService.get(REDIS_KEYS.EMAIL_VERIFICATION(email));

    if (!code) {
      throw new BadRequestException('❌ 인증 코드가 만료되었습니다.');
    }

    if (code !== verifyCode) {
      throw new BadRequestException('❌ 인증 코드가 일치하지 않습니다.');
    }

    this.logger.log(`✅ 이메일:${email}, 인증 코드 검증 완료`);

    return true;
  }

  /**
   * 비밀번호 초기화
   */
  async resetPassword({ email, password, verifyCode }: { email: string; password: string; verifyCode: string }) {
    try {
      const user = await this.usersRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException('❌ 존재하지 않는 이메일입니다.');
      }

      const code = await this.redisService.get(REDIS_KEYS.EMAIL_VERIFICATION(email));
      if (!code) throw new BadRequestException('❌ 인증 코드가 만료되었거나 존재하지 않습니다.');
      if (code !== verifyCode) throw new BadRequestException('❌ 인증 코드가 일치하지 않습니다.');

      const hashedPassword = await bcrypt.hash(password, 12);
      await this.usersRepository.update(user.id, { passwordHash: hashedPassword });

      this.logger.log(`✅ 비밀번호 초기화 완료. ${email}`);

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 비밀번호 초기화 실패', { cause: error });
    }
  }

  /**
   * 소셜 로그인 (Google - 구글 , Naver - 네이버 , Kakao - 카카오)
   */
  async socialLogin({
    provider,
    socialId,
    email,
    userName,
    photoUrl,
  }: {
    provider: string;
    socialId: string;
    email?: string;
    userName?: string;
    photoUrl?: string;
  }) {
    try {
      let user = await this.usersRepository.findOne({ where: { email } });
      if (!user) {
        // userName이 없으면 email 앞부분 사용 이메일도 없으면 프로바이더, 소셜아이디 사용
        const generatedUserName = userName || (email ? email.split('@')[0] : `user_${provider}_${socialId}`);
        user = await this.usersRepository.save({
          provider,
          socialId,
          email: email || '',
          userName: generatedUserName,
          passwordHash: '', // 소셜 로그인은 비밀번호 없음
          phoneNumber: '', // 그냥 전화번호는 저장안함
          role: 'user', // 기본 유저 권한
        });
      }

      const sessionId = uuidv4();
      const accessToken = this.jwtService.sign(
        { userId: user.id, type: 'access' },
        {
          expiresIn: '15m', // 15분 후 만료
          issuer: process.env.JWT_ISSUER, // 발급자
          audience: process.env.JWT_AUDIENCE, // 수신자
          secret: process.env.JWT_SECRET, // 시크릿 키
        }
      );
      const refreshToken = this.jwtService.sign(
        { userId: user.id, type: 'refresh', sessionId },
        {
          expiresIn: '7d', // 7일
          issuer: process.env.JWT_ISSUER, // 발급자
          audience: process.env.JWT_AUDIENCE, // 수신자
          secret: process.env.JWT_REFRESH_SECRET, // 시크릿 키
        }
      );
      await this.redisService.set(REDIS_KEYS.REFRESH_TOKEN(user.id, sessionId), refreshToken, 60 * 60 * 24 * 7 * 1000); // 7일 후 만료

      this.logger.log(`✅ 소셜 로그인 완료. ${provider} ${socialId}`);
      return { accessToken, refreshToken, user };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 소셜 로그인 실패', { cause: error });
    }
  }

  /**
   * 구글 서버에서 사용자 정보 조회
   */
  async getGoogleUserInfo({ code }: { code: string }) {
    try {
      this.logger.log(`🔍 Google OAuth 시작 - code: ${code?.substring(0, 10)}...`);
      this.logger.log(
        `🔍 환경변수 확인 - CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '설정됨' : '없음'}, REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI}`
      );
      this.logger.log(
        `🔍 전체 Google 환경변수: CLIENT_ID=${process.env.GOOGLE_CLIENT_ID}, CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET ? '설정됨' : '없음'}, REDIRECT_URI=${process.env.GOOGLE_REDIRECT_URI}`
      );

      const tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.logger.log(`🔍 Google Token 응답: ${JSON.stringify(tokenRes.data)}`);
      const { access_token } = tokenRes.data;

      // 2. access_token으로 사용자 정보 조회
      const userRes: AxiosResponse<any> = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      this.logger.log(`🔍 Google UserInfo 응답: ${JSON.stringify(userRes.data)}`);

      const userInfo = {
        id: userRes.data.id,
        email: userRes.data.email,
        userName: userRes.data.name,
        photoUrl: userRes.data.picture,
      };

      this.logger.log(`✅ 구글 사용자 정보 조회 완료. ${JSON.stringify(userInfo)}`);
      return userInfo;
    } catch (error) {
      this.logger.error('구글 인증 실패', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
      throw new InternalServerErrorException('구글 인증 실패', error);
    }
  }

  /**
   * 네이버 사용자 정보 조회
   */
  async getNaverUserInfo({ code }: { code: string }) {
    try {
      const tokenRes = await axios.post(
        'https://nid.naver.com/oauth2.0/token',
        qs.stringify({
          code,
          client_id: process.env.NAVER_CLIENT_ID,
          client_secret: process.env.NAVER_CLIENT_SECRET,
          redirect_uri: process.env.NAVER_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token } = tokenRes.data;

      // 2. access_token으로 사용자 정보 조회
      const userRes: AxiosResponse<any> = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { response } = userRes.data;

      this.logger.log(`✅ 네이버 응답: ${userRes.data}`);

      const userInfo = {
        id: response.id,
        userName: response.nickname,
        email: response.email || '',
        photoUrl: response.profile_image || '',
      };

      this.logger.log(`✅ 네이버 사용자 정보 조회 완료. ${userInfo}`);
      return userInfo;
    } catch (error) {
      this.logger.error('네이버 인증 실패', error, error.response?.data);
      throw new InternalServerErrorException('네이버 인증 실패', error);
    }
  }

  /**
   * 카카오 사용자 정보 조회, 이메일 추가해야함
   */
  async getKakaoUserInfo({ code }: { code: string }) {
    try {
      const tokenRes = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        qs.stringify({
          code,
          client_id: process.env.KAKAO_CLIENT_ID,
          client_secret: process.env.KAKAO_CLIENT_SECRET,
          redirect_uri: process.env.KAKAO_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token } = tokenRes.data;

      // 배포시 secure_resource 추가
      const userRes: AxiosResponse<any> = await axios.get(
        `https://kapi.kakao.com/v2/user/me?secure_resource=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        }
      );

      const { id, properties, kakao_account } = userRes.data;

      this.logger.log(`✅ 카카오 응답: ${userRes.data}`);

      const userInfo = {
        id,
        userName: properties.nickname,
        email: kakao_account?.email || '', // kakao_account.email에서 가져와야 함
        photoUrl: properties.profile_image || '', // 프로필 이미지
      };

      this.logger.log(`✅ 카카오 사용자 정보 조회 완료. ${userInfo}`);
      return userInfo;
    } catch (error) {
      this.logger.error('카카오 인증 실패', error, error.response?.data);
      throw new InternalServerErrorException('카카오 인증 실패', error);
    }
  }

  /**
   * 회원탈퇴
   */
  async withdrawAccount({ userId }: { userId: string }) {
    try {
      // 사용자 조회
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('❌ 사용자를 찾을 수 없습니다.');
      }

      this.logger.log(`✅ 소셜 로그인 사용자 회원탈퇴: ${user.email}`);

      // 사용자 삭제
      await this.usersRepository.remove(user);

      // Redis에서 관련 데이터 삭제 (선택사항)
      try {
        await this.redisService.del(REDIS_KEYS.EMAIL_VERIFICATION(user.email));
      } catch (redisError) {
        this.logger.warn('Redis 데이터 삭제 실패', redisError);
      }

      this.logger.log(`✅ 회원탈퇴 완료. ${user.email}`);

      return {
        deleted: true,
        email: user.email,
        deletedAt: getKoreanTimeFormatted(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 회원탈퇴 실패', { cause: error });
    }
  }
}
