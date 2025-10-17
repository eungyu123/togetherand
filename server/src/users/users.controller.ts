import { Controller, Get, Put, Delete, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { RequestDto } from 'src/common/dto/common.dto';
import { DeleteUserResponseDto, UpdateUserRequestDto } from './dto/user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResponseDto } from 'src/common/dto/common.dto';
import { getKoreanTimeFormatted } from 'src/common/utils/date.util';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '✅ 프로필 조회 성공', type: User })
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: RequestDto): Promise<ResponseDto<User>> {
    const data = await this.usersService.findById(req.user.id);

    return {
      success: true,
      message: '✅ 프로필 조회 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '내 프로필 수정' })
  @ApiResponse({ status: 200, description: '✅ 프로필 수정 성공', type: ResponseDto<User> })
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Request() req: RequestDto,
    @Body() updateUserDto: UpdateUserRequestDto
  ): Promise<ResponseDto<User>> {
    console.log('🔍 ===== UsersController updateMyProfile 시작 =====');
    const data = await this.usersService.updateUser(req.user.id, updateUserDto);
    return {
      success: true,
      message: '✅ 프로필 수정 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '내 계정 삭제' })
  @ApiResponse({ status: 200, description: '✅ 계정 삭제 성공', type: ResponseDto<DeleteUserResponseDto> })
  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  async deleteMyProfile(@Request() req: RequestDto): Promise<ResponseDto<DeleteUserResponseDto>> {
    const data = await this.usersService.deleteUser(req.user.id);
    console.log(data);
    return {
      success: true,
      message: '✅ 계정 삭제 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }
}
