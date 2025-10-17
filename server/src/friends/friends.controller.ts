// prettier-ignore
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpStatus, HttpCode, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequestDto } from 'src/common/dto/common.dto';
import { ResponseDto } from 'src/common/dto/common.dto';
import { getKoreanTimeFormatted } from 'src/common/utils/date.util';
import { FriendsService } from './friends.service';
// prettier-ignore
import { CreateFriendRequestDto, FriendRequestResponseDto, UpdateFriendRequestDto, GetFriendsResponseDto, GetFriendRequestsResponseDto, SearchFriendsDto, SearchedUserDto } from './dto/friend.dto';

@ApiTags('friends')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '친구 요청 보내기' })
  @ApiResponse({ status: 201, description: '✅ 친구 요청 전송 성공', type: ResponseDto<FriendRequestResponseDto> })
  @Post('requests')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createFriendRequest(
    @Request() req: RequestDto,
    @Body() createFriendRequestDto: CreateFriendRequestDto
  ): Promise<ResponseDto<FriendRequestResponseDto>> {
    const data = await this.friendsService.createFriendRequest(req.user.id, createFriendRequestDto);

    return {
      success: true,
      message: '✅ 친구 요청 전송 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '친구 요청 수락/거절/취소' })
  @ApiResponse({ status: 200, description: '✅ 친구 요청 상태 변경 성공', type: ResponseDto<FriendRequestResponseDto> })
  @Put('requests/:requestId')
  @UseGuards(JwtAuthGuard)
  async updateFriendRequest(
    @Request() req: RequestDto,
    @Param('requestId') requestId: string,
    @Body() updateFriendRequestDto: UpdateFriendRequestDto
  ): Promise<ResponseDto<FriendRequestResponseDto>> {
    const data = await this.friendsService.updateFriendRequest(requestId, req.user.id, updateFriendRequestDto);

    return {
      success: true,
      message: '✅ 친구 요청 상태 변경 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '친구 요청 삭제' })
  @ApiResponse({ status: 200, description: '✅ 친구 요청 삭제 성공' })
  @Delete('requests/:recipientId')
  @UseGuards(JwtAuthGuard)
  async deleteFriendRequest(
    @Request() req: RequestDto,
    @Param('recipientId') recipientId: string
  ): Promise<ResponseDto<null>> {
    await this.friendsService.deleteFriendRequest(recipientId, req.user.id);

    return {
      success: true,
      message: '✅ 친구 요청 삭제 성공',
      data: null,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '친구 요청 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '✅ 친구 요청 목록 조회 성공',
    type: ResponseDto<GetFriendRequestsResponseDto>,
  })
  @Get('requests')
  @UseGuards(JwtAuthGuard)
  async getFriendRequests(
    @Request() req: RequestDto,
    @Query('type') type: 'sent' | 'received' = 'sent',
    @Query('status') status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  ): Promise<ResponseDto<GetFriendRequestsResponseDto>> {
    const data = await this.friendsService.getFriendRequests(req.user.id, type, status);

    return {
      success: true,
      message: '✅ 친구 요청 목록 조회 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '친구 목록 조회 (온라인 상태 포함)' })
  @ApiResponse({ status: 200, description: '✅ 친구 목록 조회 성공', type: ResponseDto<GetFriendsResponseDto> })
  @Get()
  @UseGuards(JwtAuthGuard)
  async getFriends(@Request() req: RequestDto): Promise<ResponseDto<GetFriendsResponseDto>> {
    const data = await this.friendsService.getFriends(req.user.id);

    return {
      success: true,
      message: '✅ 친구 목록 조회 성공 (온라인 상태 포함)',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '친구 삭제' })
  @ApiResponse({ status: 200, description: '✅ 친구 삭제 성공' })
  @Delete(':friendId')
  @UseGuards(JwtAuthGuard)
  async deleteFriend(@Request() req: RequestDto, @Param('friendId') friendId: string): Promise<ResponseDto<null>> {
    await this.friendsService.deleteFriend(req.user.id, friendId);

    return {
      success: true,
      message: '✅ 친구 삭제 성공',
      data: null,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '사용자 검색 (친구 추가용)' })
  @ApiResponse({ status: 200, description: '✅ 사용자 검색 성공', type: ResponseDto<SearchedUserDto[]> })
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(
    @Request() req: RequestDto,
    @Query() searchDto: SearchFriendsDto
  ): Promise<ResponseDto<SearchedUserDto[]>> {
    const data = await this.friendsService.searchUsers(req.user.id, searchDto);

    return {
      success: true,
      message: '✅ 사용자 검색 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }
}
