import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['userName'], { unique: true })
@Index(['role'])
@Index(['createdAt'])
export class User {
  // 자동 uuid 생성
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 }) // 생성시 필요
  email: string;

  @Column({ name: 'password_hash', length: 255 }) // 생성시 필요
  passwordHash: string;

  @Column({ name: 'user_name', length: 30 }) // 생성시 필요
  userName: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ name: 'role', default: 'user', nullable: true })
  role: string;

  @Column({ name: 'provider', nullable: true })
  provider?: string;

  @Column({ name: 'social_id', nullable: true })
  socialId?: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl?: string;

  @Column({ name: 'self_introduction', type: 'text', nullable: true })
  selfIntroduction?: string;

  @Column({ name: 'age', type: 'int', nullable: true })
  age?: number;

  @Column({ name: 'location', length: 100, nullable: true })
  location?: string;

  @Column({ name: 'play_games', type: 'simple-array', nullable: true })
  playGames?: string[];

  // 생성 시 자동 생성
  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // 업데이트 시 자동 업데이트
  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
