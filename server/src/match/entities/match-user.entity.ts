import { User } from 'src/users/entities/user.entity';
import { Column, Entity, PrimaryColumn, CreateDateColumn, JoinColumn, ManyToOne } from 'typeorm';
import { Match } from './match.entity';

@Entity('match_users')
export class MatchUser {
  @PrimaryColumn('uuid', { name: 'match_id' })
  matchId: string;

  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  // 관계설정
  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
