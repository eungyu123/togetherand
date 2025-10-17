// prettier-ignore
import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { FriendRequest } from './entity/friend-request.entity';
import { FriendRequestStatus } from './enums/friend-request-status.enum';
import { Friendship } from './entity/friendship.entity';
// prettier-ignore
import { CreateFriendRequestDto, FriendRequestResponseDto, UpdateFriendRequestDto, GetFriendsResponseDto, GetFriendRequestsResponseDto, SearchFriendsDto, FriendResponseDto, SearchedUserDto } from './dto/friend.dto';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    private readonly redisService: RedisService
  ) {}

  /**
   * 친구 요청 생성
   */
  async createFriendRequest(
    requesterId: string,
    createFriendRequestDto: CreateFriendRequestDto
  ): Promise<FriendRequestResponseDto> {
    try {
      const { recipientId } = createFriendRequestDto;

      // 1. 자기 자신에게 친구 요청을 보낼 수 없음
      if (requesterId === recipientId) {
        throw new BadRequestException('❌ 자기 자신에게 친구 요청을 보낼 수 없습니다.');
      }

      // 2. 수신자가 존재하는지 확인
      const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
      if (!recipient) {
        throw new NotFoundException('❌ 요청을 받을 사용자를 찾을 수 없습니다.');
      }

      // 3. 양방향 PENDING 상태의 친구 요청이 있는지 확인
      const existingRequest = await this.friendRequestRepository.findOne({
        where: [
          { requesterId, recipientId, status: FriendRequestStatus.PENDING },
          { requesterId: recipientId, recipientId: requesterId, status: FriendRequestStatus.PENDING },
        ],
      });

      if (existingRequest) {
        throw new ConflictException('❌ 이미 친구 요청이 존재합니다.');
      }

      // 4. 양방향 친구 관계가 있는지 확인
      const existingFriendship = await this.friendshipRepository.findOne({
        where: [
          { userId: requesterId, friendId: recipientId },
          { userId: recipientId, friendId: requesterId },
        ],
      });

      if (existingFriendship) {
        throw new ConflictException('❌ 이미 친구입니다.');
      }

      // 5. 친구 요청 생성
      const friendRequest = this.friendRequestRepository.create({
        requesterId,
        recipientId,
        status: FriendRequestStatus.PENDING,
      });

      const savedRequest = await this.friendRequestRepository.save(friendRequest);

      this.logger.log(`✅ 친구 요청 생성 완료: ${requesterId} -> ${recipientId}`);

      return savedRequest;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 친구 요청 생성 실패', { cause: error });
    }
  }

  /**
   * 친구 요청 상태 변경 (수락/거절/취소)
   */
  async updateFriendRequest(
    requestId: string,
    userId: string,
    updateDto: UpdateFriendRequestDto
  ): Promise<FriendRequestResponseDto> {
    try {
      const { status } = updateDto;

      // 친구 요청 조회
      const friendRequest = await this.friendRequestRepository.findOne({
        where: { id: requestId },
        relations: ['requester', 'recipient'],
      });

      // 친구 요청이 없으면 에러
      if (!friendRequest) {
        throw new NotFoundException('❌ 친구 요청을 찾을 수 없습니다.');
      }

      // 요청자 또는 수신자가 아니면 에러
      if (friendRequest.requesterId !== userId && friendRequest.recipientId !== userId) {
        throw new BadRequestException('❌ 친구 요청을 수정할 권한이 없습니다.');
      }

      // 수락/거절은 수신자만 가능
      if (status === FriendRequestStatus.ACCEPTED || status === FriendRequestStatus.REJECTED) {
        if (friendRequest.recipientId !== userId) {
          throw new BadRequestException('❌ 친구 요청을 수락/거절할 권한이 없습니다.');
        }
      }

      // 취소는 요청자만 가능
      if (status === FriendRequestStatus.CANCELLED) {
        if (friendRequest.requesterId !== userId) {
          throw new BadRequestException('❌ 친구 요청을 취소할 권한이 없습니다.');
        }
      }

      // 요청을 수락하는 경우 친구 관계 생성
      if (status === FriendRequestStatus.ACCEPTED) {
        // 이미 친구 관계가 있는지 확인
        const existingFriendship = await this.friendshipRepository.findOne({
          where: [
            { userId: friendRequest.requesterId, friendId: friendRequest.recipientId },
            { userId: friendRequest.recipientId, friendId: friendRequest.requesterId },
          ],
        });
        if (existingFriendship) {
          throw new ConflictException('❌ 이미 친구입니다.');
        }

        // 친구 관계 생성
        const [smallerId, largerId] = [friendRequest.requesterId, friendRequest.recipientId].sort();

        const friendship = this.friendshipRepository.create({
          userId: smallerId,
          friendId: largerId,
        });

        await this.friendshipRepository.save(friendship);
        this.logger.debug(`✅ 친구 관계 생성: ${smallerId} <-> ${largerId}`);
      }

      friendRequest.status = status;
      const updatedRequest = await this.friendRequestRepository.save(friendRequest);

      this.logger.debug(`✅ 친구 요청 상태 변경: ${requestId} -> ${status}`);

      // 이건 위에 처럼 거절 상태로 변경 말고 그냥 삭제시켜버리는것
      // 위처럼 거절 상태로 쓰고 싶으면 그냥 이 부분 삭제하면됨
      // 대신 조회 부분같은곳에서 거절된건 필터링 해주는 등 로직 변경 필요
      // ========================================================
      if (status === FriendRequestStatus.REJECTED) {
        await this.friendRequestRepository.remove(friendRequest);
      }
      // ========================================================

      return updatedRequest;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 친구 요청 상태 변경 실패', { cause: error });
    }
  }

  /**
   * 친구 요청 삭제
   */
  async deleteFriendRequest(recipientId: string, userId: string): Promise<void> {
    try {
      this.logger.debug('🔥 deleteFriendRequest', recipientId, userId);
      const friendRequest = await this.friendRequestRepository.findOne({
        where: { recipientId, requesterId: userId },
      });

      if (!friendRequest) {
        throw new NotFoundException('❌ 친구 요청을 찾을 수 없습니다.');
      }

      // 요청을 삭제할 권한이 있는지 확인 - 요청자만 가능, 수신자는 삭제 말고 거절 API 사용
      // 근데 지금은 그냥 둘다 가능하게 함
      if (friendRequest.requesterId !== userId && friendRequest.recipientId !== userId) {
        throw new BadRequestException('❌ 친구 요청을 삭제할 권한이 없습니다.');
      }

      await this.friendRequestRepository.remove(friendRequest);

      this.logger.debug(`✅ 친구 요청 삭제 완료: ${recipientId}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 친구 요청 삭제 실패', { cause: error });
    }
  }

  /**
   * 친구 요청 목록 조회
   */
  async getFriendRequests(
    userId: string,
    type: 'sent' | 'received',
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  ): Promise<GetFriendRequestsResponseDto> {
    try {
      const requests = await this.friendRequestRepository.find({
        where:
          type === 'sent'
            ? { requesterId: userId, status: status as FriendRequestStatus }
            : { recipientId: userId, status: status as FriendRequestStatus },
        relations: type === 'sent' ? ['recipient'] : ['requester'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`✅ 친구 요청 목록 조회 완료: ${userId}, ${type}, ${status}`);
      return {
        requests,
        totalCount: requests.length,
      };
    } catch (error) {
      throw new InternalServerErrorException('❌ 친구 요청 목록 조회 실패', { cause: error });
    }
  }

  /**
   * 친구 목록 조회 (온라인 상태 포함)
   */
  async getFriends(userId: string): Promise<GetFriendsResponseDto> {
    try {
      const friendships = await this.friendshipRepository.find({
        where: [{ userId }, { friendId: userId }],
        relations: ['user', 'friend'],
        order: { createdAt: 'DESC' },
      });

      const friends: FriendResponseDto[] = friendships.map(friendship => {
        const isUser = friendship.userId === userId;
        const friend = isUser ? friendship.friend : friendship.user;

        return {
          id: friend.id,
          userName: friend.userName,
          photoUrl: friend.photoUrl,
        };
      });

      // 친구들의 온라인 상태 일괄 조회
      const friendIds = friends.map(friend => friend.id);
      const onlineStatuses = await this.redisService.getUsersOnlineStatus(friendIds);

      this.logger.debug('onlineStatuses', JSON.stringify(onlineStatuses));

      // 온라인 상태 정보를 친구 목록에 추가
      const friendsWithStatus = friends.map(friend => {
        const onlineStatus = onlineStatuses[friend.id];
        return {
          ...friend,
          status: onlineStatus ? onlineStatus.status : 'offline',
          lastSeen: onlineStatus ? onlineStatus.lastSeen : null,
        };
      });

      this.logger.debug(`✅ 친구 목록 조회 완료: ${userId} (온라인 상태 포함)`);

      return {
        friends: friendsWithStatus,
        totalCount: friendsWithStatus.length,
      };
    } catch (error) {
      throw new InternalServerErrorException('❌ 친구 목록 조회 실패', { cause: error });
    }
  }

  /**
   * 친구 삭제
   */
  async deleteFriend(userId: string, friendId: string): Promise<void> {
    try {
      const friendship = await this.friendshipRepository.findOne({
        where: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
        // WHERE (user_id = :userId AND friend_id = :friendId)
        // OR (user_id = :friendId AND friend_id = :userId)
      });

      if (!friendship) {
        throw new NotFoundException('❌ 친구 관계를 찾을 수 없습니다.');
      }

      await this.friendshipRepository.remove(friendship);

      this.logger.debug(`✅ 친구 삭제 완료: ${userId} <-> ${friendId}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 친구 삭제 실패', { cause: error });
    }
  }

  /**
   * 사용자 검색 (친구 추가용)
   *
   * 검색 조건:
   * 1. 현재 사용자 제외
   * 2. 이미 친구인 사용자 제외
   * 3. 사용자명으로 필터링
   * 4. 최대 20명까지만 결과 반환
   * 5. 각 사용자의 친구 요청 상태 포함
   */
  async searchUsers(userId: string, searchDto: SearchFriendsDto): Promise<SearchedUserDto[]> {
    try {
      // userId가 없으면 에러 처리
      if (!userId) {
        console.error('❌ userId가 없습니다:', userId);
        throw new Error('사용자 ID가 필요합니다.');
      }

      // 현재 친구 목록 조회 (친구 ID들)
      const friendships = await this.friendshipRepository.find({
        where: [{ userId }, { friendId: userId }], // SQL로 변환하면  where userId = userId or friendId = userId
        select: ['userId', 'friendId'],
      });

      // 친구 ID 목록 생성 (현재 사용자 제외)
      const friendIds = friendships.map(friendship => {
        return friendship.userId === userId ? friendship.friendId : friendship.userId;
      });

      // QueryBuilder를 사용하여 'user' 엔티티를 기준으로 쿼리 작성 시작
      const queryBuilder = this.userRepository
        .createQueryBuilder('user') // 'user'는 쿼리에서 사용할 alias(별칭)
        .where('user.id != :userId', { userId }); // 현재 로그인한 사용자(userId)는 검색 결과에서 제외

      // 친구가 있는 경우 친구들도 검색 결과에서 제외
      if (friendIds.length > 0) {
        // 친구 ID 목록에 없는 사용자만 검색
        queryBuilder.andWhere('user.id NOT IN (:...friendIds)', { friendIds });
      }

      // 만약 검색어가 있다면, 해당 값이 userName에 포함되는 유저를 필터링
      if (searchDto.userName) {
        queryBuilder.andWhere(
          'user.userName ILIKE :userName', // PostgreSQL의 대소문자 구분 없는 부분 문자열 검색
          { userName: `%${searchDto.userName}%` } // 예: '%john%' -> 'john'을 포함하는 모든 문자열
        );
      }

      // 최종적으로 필요한 필드만 선택하고, 최대 20명까지만 결과 가져오기
      const searchedUsers = await queryBuilder
        .select(['user.id', 'user.userName', 'user.photoUrl']) // 필요한 필드만 선택
        .limit(20) // 최대 20명까지만 결과 제한
        .getMany(); // 쿼리 실행 후, 결과 배열을 반환

      // 검색된 사용자들과의 친구 요청 상태를 조회
      const searchedUserIds = searchedUsers.map(user => user.id);

      // 현재 사용자가 보낸 친구 요청들 조회
      const sentRequests = await this.friendRequestRepository.find({
        where: {
          requesterId: userId,
          recipientId: In(searchedUserIds),
          status: FriendRequestStatus.PENDING,
        },
        select: ['id', 'recipientId', 'status'],
      });

      console.log('sentRequests', JSON.stringify(sentRequests));

      // 검색된 사용자들과의 친구 요청 상태를 조회
      const receivedRequests = await this.friendRequestRepository.find({
        where: {
          requesterId: In(searchedUserIds),
          recipientId: userId,
          status: FriendRequestStatus.PENDING,
        },
        select: ['id', 'requesterId', 'status'],
      });

      console.log('receivedRequests', JSON.stringify(receivedRequests));

      // 친구 요청 상태 및 ID 맵 생성
      const sentRequestStatusMap = new Map<string, FriendRequestStatus>();
      const sentRequestIdMap = new Map<string, string>();
      const receivedRequestStatusMap = new Map<string, FriendRequestStatus>();
      const receivedRequestIdMap = new Map<string, string>();

      // 보낸 요청들 맵에 추가
      sentRequests.forEach(request => {
        sentRequestStatusMap.set(request.recipientId, request.status);
        sentRequestIdMap.set(request.recipientId, request.id);
      });

      // 받은 요청들 맵에 추가
      receivedRequests.forEach(request => {
        receivedRequestStatusMap.set(request.requesterId, request.status);
        receivedRequestIdMap.set(request.requesterId, request.id);
      });

      // 검색된 사용자들에 친구 요청 상태 및 ID 추가
      const usersWithStatus: SearchedUserDto[] = searchedUsers.map(user => ({
        id: user.id,
        userName: user.userName,
        photoUrl: user.photoUrl,
        sentFriendRequest: sentRequestStatusMap.get(user.id) || null,
        sentFriendRequestId: sentRequestIdMap.get(user.id) || null,
        receivedFriendRequest: receivedRequestStatusMap.get(user.id) || null,
        receivedFriendRequestId: receivedRequestIdMap.get(user.id) || null,
      }));

      console.log('usersWithStatus', JSON.stringify(usersWithStatus));

      // 검색이 정상적으로 완료되었음을 로그에 기록
      this.logger.debug(
        `✅ 사용자 검색 완료: ${userId}, 결과: ${searchedUsers.length}명 (친구 ${friendIds.length}명 제외)`
      );

      // 검색된 사용자 목록 반환
      return usersWithStatus;
    } catch (error) {
      this.logger.error('❌ 사용자 검색 실패:', error);
      throw new InternalServerErrorException('❌ 사용자 검색 실패', { cause: error });
    }
  }
}
