// lib/api/types/user.ts

export interface UserType {
  id: string;
  userName: string;
  email: string;
  photoUrl: string | undefined;
  selfIntroduction: string | undefined;
  age: number | undefined;
  location: string | undefined;
  playGames: string[] | undefined;
}

export interface UserFirstLoginType extends UserType {
  blobPhoto?: Blob | undefined;
}

export type OpponentsUserType = Pick<UserType, 'userName' | 'photoUrl'>;
