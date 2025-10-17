import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 비밀번호 초기화 요청 DTO
 *
 * - email: string
 * - password: string
 * - verifyCode: string
 */
export class ResetPasswordRequestDto {
  @ApiProperty({
    description: '이메일',
    example: 'beg4660@naver.com',
  })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'password123',
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(20, { message: '비밀번호는 최대 20자 이하여야 합니다.' })
  password: string;

  @ApiProperty({
    description: '인증 코드',
    example: '123456',
  })
  @IsString({ message: '인증 코드는 문자열이어야 합니다.' })
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  verifyCode: string;
}

export class ResetPasswordResponseDto {}
