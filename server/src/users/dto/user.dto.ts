import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsDate,
  IsObject,
  IsNumber,
  IsArray,
} from 'class-validator';
import { User } from '../entities/user.entity';

/**
 * 유저 생성용 DTO
 *
 * - email: string
 * - password: string
 * - userName: string
 * - phoneNumber: string
 * - role: string
 * - provider: string
 * - socialId: string
 * - photoUrl: string
 * - selfIntroduction: string
 * - age: number
 * - location: string
 * - playGames: string[]
 * - createdAt: Date
 * - updatedAt: Date
 */
export class UpdateUserRequestDto {
  @IsOptional()
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email?: string;

  @IsOptional()
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(30, { message: '비밀번호는 최대 30자까지 가능합니다.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '비밀번호는 영문 대소문자, 숫자, 특수문자를 포함해야 합니다.',
  })
  password?: string;

  @IsOptional()
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(12, { message: '닉네임은 최대 12자까지 가능합니다.' })
  @Matches(/^[a-zA-Z0-9가-힣_-]+$/, {
    message: '닉네임은 영문, 숫자, 한글, 언더스코어, 하이픈만 사용 가능합니다.',
  })
  userName?: string;

  @IsOptional()
  @IsString({ message: '전화번호는 문자열이어야 합니다.' })
  @Matches(/^[0-9-+\s()]+$/, {
    message: '유효한 전화번호 형식을 입력해주세요.',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  socialId?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  selfIntroduction?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  playGames?: string[];

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}

export class DeleteUserResponseDto {}
