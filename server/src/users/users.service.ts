import {
  ConflictException,
  Get,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities';
import { DeleteUserResponseDto, UpdateUserRequestDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    // 여기서 DB(레포지토리)의 User 엔티티 가져온 것
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * 유저 정보 조회
   */
  async findById(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('❌ 유저 정보가 없습니다.');
      }

      this.logger.debug(`✅ 유저 정보 조회 완료. ${user.id}, ${user.userName}`);

      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 유저 정보 조회 실패', { cause: error });
    }
  }

  /**
   * 유저 정보 수정
   */
  async updateUser(id: string, updateUserDto: UpdateUserRequestDto): Promise<User> {
    try {
      console.log(updateUserDto);

      // 현재 유저 정보 조회
      const currentUser = await this.userRepository.findOne({ where: { id } });
      if (!currentUser) {
        throw new NotFoundException('❌ 유저 정보가 없습니다.');
      }

      // userName이 변경되는 경우 중복 체크
      if (updateUserDto.userName && updateUserDto.userName !== currentUser.userName) {
        const existingUser = await this.userRepository.findOne({
          where: { userName: updateUserDto.userName },
        });
        if (existingUser && existingUser.id !== id) {
          throw new ConflictException('❌ 이미 사용 중인 닉네임입니다.');
        }
      }

      // email이 변경되는 경우 중복 체크
      if (updateUserDto.email && updateUserDto.email !== currentUser.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateUserDto.email },
        });
        if (existingUser && existingUser.id !== id) {
          throw new ConflictException('❌ 이미 사용 중인 이메일입니다.');
        }
      }

      const result = await this.userRepository.update(id, updateUserDto);
      if (result.affected === 0) throw new NotFoundException('❌ 유저 정보가 없습니다.');

      const updatedUser = await this.userRepository.findOne({ where: { id } });
      if (!updatedUser) throw new NotFoundException('❌ 유저 정보가 없습니다.');

      this.logger.log(`✅ 유저 정보 수정 완료. ${updatedUser.id}, ${updatedUser.userName}`);

      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 유저 정보 수정 실패', { cause: error });
    }
  }

  /**
   * 유저 정보 삭제
   */
  async deleteUser(id: string): Promise<DeleteUserResponseDto> {
    try {
      const result = await this.userRepository.delete(id);
      if (result.affected === 0) throw new NotFoundException('❌ 유저 정보가 없습니다.');

      this.logger.log(`✅ 유저 정보 삭제 완료. ${id}`);

      return {};
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('❌ 유저 정보 삭제 실패', { cause: error });
    }
  }
}
