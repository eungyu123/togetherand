import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 회원가입 요청 DTO
 *
 * - email: string
 * - password: string
 * - userName: string
 * - phoneNumber: string
 * - verifyCode: string
 */
export class SignUpRequestDto {
  @ApiProperty({
    description: '이메일',
    example: 'beg4660@naver.com',
  })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'Password123!',
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(30, { message: '비밀번호는 최대 30자까지 가능합니다.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,30}$/, {
    message: '비밀번호는 영문 대소문자, 숫자, 특수문자를 포함해야 하며, 8~30자여야 합니다.',
  })
  password: string;

  @ApiProperty({
    description: '이름',
    example: '잭슨',
  })
  @IsString({ message: '이름은 문자열이어야 합니다.' })
  @MinLength(2, { message: '이름은 최소 2자 이상이어야 합니다.' })
  @MaxLength(12, { message: '이름은 최대 12자까지 가능합니다.' })
  @Matches(/^[a-zA-Z0-9가-힣_-]+$/, {
    message: '이름은 영문, 숫자, 한글, 언더스코어, 하이픈만 사용 가능합니다.',
  })
  userName: string;

  @ApiProperty({
    description: '전화번호',
    example: '010-1234-5678',
  })
  @IsOptional()
  @IsString({ message: '전화번호는 문자열이어야 합니다.' })
  @Matches(/^[0-9-+\s()]+$/, {
    message: '유효한 전화번호 형식을 입력해주세요.',
  })
  phoneNumber: string;

  @ApiProperty({
    description: '인증 코드',
    example: '123456',
  })
  @IsString({ message: '인증 코드는 문자열이어야 합니다.' })
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  verifyCode: string;
}

export class SignUpResponseDto {}
