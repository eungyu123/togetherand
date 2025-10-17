import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Get,
  Param,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
// prettier-ignore
import { SignUpRequestDto, SignUpResponseDto, SignInRequestDto, SignInResponseDto, VerifyEmailCodeRequestDto, VerifyEmailCodeResponseDto, ResetPasswordRequestDto, ResetPasswordResponseDto, SendVerifyCodeRequestDto, SendVerifyCodeResponseDto, RefreshTokenRequestDto, RefreshTokenResponseDto, SocialCallbackRequestDto, WithdrawRequestDto, WithdrawResponseDto } from "./dto";
import { SignOutRequestDto, SignOutResponseDto } from './dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ThrottleGuard } from 'src/common/guards/throttle.guard';
import { RequestDto, ResponseDto } from 'src/common/dto/common.dto';
import { getKoreanTimeFormatted } from 'src/common/utils/date.util';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/users/entities/user.entity';

// Swagger 태그 설정
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // --- 회원가입 ---
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '✅ 회원가입 성공 응답', type: ResponseDto<SignUpResponseDto> })
  @UseGuards(ThrottleGuard)
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignUpRequestDto): Promise<ResponseDto<SignUpResponseDto>> {
    const data = await this.authService.signUp(signupDto);

    return {
      success: true,
      message: '✅ 회원가입에 성공했습니다.',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // --- 회원탈퇴 ---
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '회원탈퇴' })
  @ApiResponse({ status: 200, description: '✅ 회원탈퇴 성공 응답', type: ResponseDto<WithdrawResponseDto> })
  @UseGuards(ThrottleGuard, JwtAuthGuard)
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawAccount(
    @Req() req,
    @Res({ passthrough: true }) response: Response
  ): Promise<ResponseDto<WithdrawResponseDto>> {
    const userId = req.user.id;

    // 회원탈퇴 처리
    const data = await this.authService.withdrawAccount({ userId });

    // 회원탈퇴 성공 시 쿠키 삭제
    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return {
      success: true,
      message: '✅ 회원탈퇴가 완료되었습니다.',
      data: {
        deleted: data.deleted,
        email: data.email,
        deletedAt: data.deletedAt,
      },
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // --- 로그인 ---
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '✅ 로그인 성공 응답', type: ResponseDto<SignInResponseDto> })
  @UseGuards(ThrottleGuard)
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signin(
    @Body() signinDto: SignInRequestDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<ResponseDto<SignInResponseDto>> {
    const data = await this.authService.signIn(signinDto);
    const { accessToken, refreshToken, ...userData } = data;

    // Access Token을 헤더에 설정
    response.cookie('accessToken', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 60 * 10 * 1000, // 10분
      path: '/',
    });

    // Refresh Token을 쿠키에 설정
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true, // 브라우저에서 접근 불가
      secure: process.env.NODE_ENV === 'production', // 프로덕션 환경에서만 보안 쿠키 설정
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/', // 모든 경로에서 접근 가능
    });

    return {
      success: true,
      message: '✅ 로그인에 성공했습니다.',
      data: userData,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // --- 로그아웃 ---
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '✅ 로그아웃 성공 응답', type: ResponseDto<SignOutResponseDto> })
  @UseGuards(ThrottleGuard, JwtAuthGuard)
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  async signout(@Req() req, @Res({ passthrough: true }) response: Response): Promise<ResponseDto<SignOutResponseDto>> {
    const refreshToken = req.cookies.refreshToken;
    const data = await this.authService.signOut({ refreshToken });

    // Access Token 쿠키 삭제 (설정했던 옵션과 동일하게)
    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    // Refresh Token 쿠키 삭제 (설정했던 옵션과 동일하게)
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return {
      success: true,
      message: '✅ 로그아웃에 성공했습니다.',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // --- 토큰 갱신 ---
  @ApiCookieAuth('refresh')
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '✅ 토큰 갱신 성공 응답', type: ResponseDto<RefreshTokenResponseDto> })
  @UseGuards(ThrottleGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req,
    @Res({ passthrough: true }) response: Response
  ): Promise<ResponseDto<RefreshTokenResponseDto>> {
    // 디버깅: 쿠키 정보 로그
    this.logger.debug('🔍 전체 쿠키:', req.cookies);
    this.logger.debug('🔍 요청 헤더:', req.headers);

    // 쿠키에서 리프레시 토큰 가져오기 (우선순위)
    const refreshToken = req.cookies?.refreshToken;

    this.logger.debug('🔍 refreshToken:', refreshToken);

    if (!refreshToken) {
      throw new BadRequestException('❌ 리프레시 토큰이 필요합니다.');
    }

    try {
      // 토큰 갱신
      const data = await this.authService.refreshToken({ refreshToken });
      const { newAccessToken, newRefreshToken } = data;

      // Access Token을 쿠키에 설정
      response.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 60 * 10 * 1000, // 10분
        path: '/',
      });

      // Refresh Token을 쿠키에 설정
      response.cookie('refreshToken', newRefreshToken, {
        httpOnly: true, // 브라우저에서 접근 불가
        secure: process.env.NODE_ENV === 'production', // 프로덕션 환경에서만 보안 쿠키 설정
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7일
        path: '/', // 모든 경로에서 접근 가능
      });

      return {
        success: true,
        message: '✅ 토큰 갱신에 성공했습니다.',
        data: true,
        timestamp: getKoreanTimeFormatted(),
      };
    } catch (error) {
      // 토큰 갱신 실패 시 쿠키 삭제
      response.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
      });

      response.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
      });

      throw error;
    }
  }

  // --- 인증 코드 발송 ---
  @ApiOperation({ summary: '인증 코드 발송' })
  @ApiResponse({
    status: 200,
    description: '✅ 인증 코드 발송 성공 응답',
    type: ResponseDto<SendVerifyCodeResponseDto>,
  })
  @UseGuards(ThrottleGuard)
  @Post('send-verify-code')
  @HttpCode(HttpStatus.OK)
  async sendVerifyCode(
    @Body() sendVerifyCodeDto: SendVerifyCodeRequestDto
  ): Promise<ResponseDto<SendVerifyCodeResponseDto>> {
    const data = await this.authService.sendVerificationCode(sendVerifyCodeDto);

    return {
      success: true,
      message: '✅ 인증 코드를 발송했습니다.',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // --- 이메일 인증 ---
  @ApiOperation({ summary: '이메일 인증' })
  @ApiResponse({ status: 200, description: '✅ 이메일 인증 성공 응답', type: ResponseDto<VerifyEmailCodeResponseDto> })
  @UseGuards(ThrottleGuard)
  @Post('verify-email-code')
  async verifyEmailCode(
    @Body() verifyEmailCodeDto: VerifyEmailCodeRequestDto
  ): Promise<ResponseDto<VerifyEmailCodeResponseDto>> {
    const data = await this.authService.verifyEmailNumber(verifyEmailCodeDto);

    return {
      success: true,
      message: '✅ 이메일 인증에 성공했습니다.',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // --- 비밀번호 재설정 ---
  @ApiOperation({ summary: '비밀번호 재설정' })
  @ApiResponse({
    status: 200,
    description: '✅ 비밀번호 재설정 성공 응답',
    type: ResponseDto<ResetPasswordResponseDto>,
  })
  @UseGuards(ThrottleGuard)
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordRequestDto
  ): Promise<ResponseDto<ResetPasswordResponseDto>> {
    const data = await this.authService.resetPassword(resetPasswordDto);

    return {
      success: true,
      message: '✅ 비밀번호 재설정에 성공했습니다.',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // --- Dynamic Social OAuth Callback, Google, Naver, Kakao ---
  @ApiOperation({ summary: 'Social OAuth 로그인 (Google, Naver, Kakao)' })
  @ApiResponse({ status: 200, description: '✅ Social OAuth 로그인 성공 응답' })
  @Post(':provider/callback')
  async socialCallback(
    @Param('provider') provider: string,
    @Res() res: Response,
    @Body() socialCallbackDto: SocialCallbackRequestDto,
    @Req() req: RequestDto
  ) {
    let userInfo: Partial<User>;

    this.logger.log(`🔍 Social OAuth 콜백 시작 - provider: ${provider}`);
    this.logger.log(`🔍 요청 body: ${JSON.stringify(socialCallbackDto)}`);

    if (!socialCallbackDto || !socialCallbackDto.code) {
      this.logger.error(`❌ 소셜 로그인 코드가 없습니다. socialCallbackDto: ${JSON.stringify(socialCallbackDto)}`);
      throw new Error('❌ 소셜 로그인 코드가 필요합니다.');
    }
    // Provider별로 다른 처리 로직
    switch (provider.toLowerCase()) {
      case 'google':
        this.logger.log(`🔍 Google OAuth 처리 시작`);
        userInfo = await this.authService.getGoogleUserInfo(socialCallbackDto);
        this.logger.log(`🔍 Google OAuth 처리 완료: ${JSON.stringify(userInfo)}`);
        break;
      case 'naver':
        userInfo = await this.authService.getNaverUserInfo(socialCallbackDto);
        break;
      case 'kakao':
        userInfo = await this.authService.getKakaoUserInfo(socialCallbackDto);
        break;
      default:
        throw new Error(`❌ 지원하지 않는 OAuth 제공자입니다: ${provider}`);
    }

    this.logger.log(`🔍 SocialLogin 호출 시작 - userInfo: ${JSON.stringify(userInfo)}`);

    const data = await this.authService.socialLogin({
      provider: provider.toLowerCase(),
      socialId: userInfo.id || '',
      email: userInfo.email || '',
      userName: userInfo.userName || '',
      photoUrl: userInfo?.photoUrl || '',
    });

    this.logger.log(`🔍 SocialLogin 완료 - accessToken 존재: ${!!data.accessToken}`);

    // Access Token을 쿠키에 설정
    res.cookie('accessToken', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 60 * 10 * 1000, // 10분
      path: '/',
    });

    // Refresh Token을 쿠키에 설정
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      message: `✅ ${provider} OAuth 로그인 성공`,
      data: data.user,
      timestamp: getKoreanTimeFormatted(),
    });
  }
}
