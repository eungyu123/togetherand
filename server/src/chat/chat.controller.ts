// prettier-ignore
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestDto } from '../common/dto/common.dto';
import { ResponseDto } from '../common/dto/common.dto';
import { getKoreanTimeFormatted } from '../common/utils/date.util';
import { ChatService } from './chat.service';
// prettier-ignore
import { CreateChatRoomDto, SendMessageDto, AddMemberDto, UpdateChatRoomDto, RemoveMemberDto, ChatRoomResponseDto, ChatMessageResponseDto, ChatRoomMemberResponseDto } from './dto/chat.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 생성' })
  @ApiResponse({
    status: 201,
    description: '✅ 채팅방 생성 성공',
    type: ResponseDto<ChatRoomResponseDto>,
  })
  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  async createChatRoom(
    @Request() req: RequestDto,
    @Body() createChatRoomDto: CreateChatRoomDto
  ): Promise<ResponseDto<ChatRoomResponseDto>> {
    const data = await this.chatService.createChatRoom(req.user.id, createChatRoomDto);

    return {
      success: true,
      message: '✅ 채팅방 생성 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 목록 조회 성공',
    type: ResponseDto<ChatRoomResponseDto[]>,
  })
  @Get('rooms')
  async getChatRooms(@Request() req: RequestDto): Promise<ResponseDto<ChatRoomResponseDto[]>> {
    const data = await this.chatService.getUserChatRooms(req.user.id);

    return {
      success: true,
      message: '✅ 채팅방 목록 조회 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 멤버 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 멤버 목록 조회 성공',
    type: ResponseDto<ChatRoomMemberResponseDto[]>,
  })
  @Get('rooms/:roomId/members')
  async getRoomMembers(
    @Request() req: RequestDto,
    @Param('roomId') roomId: string
  ): Promise<ResponseDto<ChatRoomMemberResponseDto[]>> {
    const data = await this.chatService.getRoomMembers(roomId, req.user.id);

    return {
      success: true,
      message: '✅ 채팅방 멤버 목록 조회 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 메시지 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 메시지 목록 조회 성공',
    type: ResponseDto<ChatMessageResponseDto[]>,
  })
  @Get('rooms/:roomId/messages')
  async getRoomMessages(
    @Request() req: RequestDto,
    @Param('roomId') roomId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ): Promise<ResponseDto<ChatMessageResponseDto[]>> {
    const data = await this.chatService.getRoomMessages(roomId, req.user.id, page, limit);

    return {
      success: true,
      message: '✅ 채팅방 메시지 목록 조회 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 멤버 추가' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 멤버 추가 성공',
  })
  @Post('rooms/:roomId/members')
  async addMember(
    @Request() req: RequestDto,
    @Param('roomId') roomId: string,
    @Body() addMemberDto: AddMemberDto
  ): Promise<ResponseDto<null>> {
    await this.chatService.addMemberToRoom(roomId, addMemberDto.userId, addMemberDto.role);

    return {
      success: true,
      message: '✅ 채팅방 멤버 추가 성공',
      data: null,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  // 추가된 부분 내일 확인하기
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 수정' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 수정 성공',
    type: ResponseDto<ChatRoomResponseDto>,
  })
  @Put('rooms/:roomId')
  async updateChatRoom(
    @Request() req: RequestDto,
    @Param('roomId') roomId: string,
    @Body() updateChatRoomDto: UpdateChatRoomDto
  ): Promise<ResponseDto<ChatRoomResponseDto>> {
    const data = await this.chatService.updateChatRoom(roomId, req.user.id, updateChatRoomDto);

    return {
      success: true,
      message: '✅ 채팅방 수정 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 멤버 삭제' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 멤버 삭제 성공',
  })
  @Post('rooms/:roomId/members/remove')
  async removeMember(
    @Request() req: RequestDto,
    @Param('roomId') roomId: string,
    @Body() removeMemberDto: RemoveMemberDto
  ): Promise<ResponseDto<null>> {
    await this.chatService.removeMemberFromRoom(roomId, removeMemberDto.userId, req.user.id);

    return {
      success: true,
      message: '✅ 채팅방 멤버 삭제 성공',
      data: null,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 삭제' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 삭제 성공',
  })
  @Post('rooms/:roomId/delete')
  async deleteChatRoom(@Request() req: RequestDto, @Param('roomId') roomId: string): Promise<ResponseDto<null>> {
    await this.chatService.deleteChatRoom(roomId, req.user.id);

    return {
      success: true,
      message: '✅ 채팅방 삭제 성공',
      data: null,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiResponse({
    status: 200,
    description: '✅ 채팅방 나가기 성공',
  })
  @Post('rooms/:roomId/leave')
  async leaveChatRoom(@Request() req: RequestDto, @Param('roomId') roomId: string): Promise<ResponseDto<null>> {
    await this.chatService.leaveChatRoom(roomId, req.user.id);

    return {
      success: true,
      message: '✅ 채팅방 나가기 성공',
      data: null,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '안읽은 메시지 카운트 조회' })
  @ApiResponse({
    status: 200,
    description: '✅ 안읽은 메시지 카운트 조회 성공',
    type: ResponseDto<Record<string, number>>,
  })
  @Get('unread-counts')
  async getUnreadCounts(@Request() req: RequestDto): Promise<ResponseDto<Record<string, number>>> {
    const data = await this.chatService.getUnreadCounts(req.user.id);

    return {
      success: true,
      message: '✅ 안읽은 메시지 카운트 조회 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '특정 방의 안읽은 메시지 카운트 조회' })
  @ApiResponse({
    status: 200,
    description: '✅ 방별 안읽은 메시지 카운트 조회 성공',
    type: ResponseDto<number>,
  })
  @Get('rooms/:roomId/unread-count')
  async getRoomUnreadCount(@Request() req: RequestDto, @Param('roomId') roomId: string): Promise<ResponseDto<number>> {
    const data = await this.chatService.getRoomUnreadCount(req.user.id, roomId);

    return {
      success: true,
      message: '✅ 방별 안읽은 메시지 카운트 조회 성공',
      data,
      timestamp: getKoreanTimeFormatted(),
    };
  }
}
