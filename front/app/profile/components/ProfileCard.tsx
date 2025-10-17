'use client';

import Image from 'next/image';
import { useAuthStore } from '@/shared/stores/auth';
import { User, MapPin, Calendar, Gamepad2, Camera, X, Save, Edit3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usersApi } from '@/shared/api/client/users';
import { Loader2 } from 'lucide-react';
import { useCallStore } from '@/domain/call/store/call';

// 상수 정의
const GAME_OPTIONS = [
  '리그오브 레전드',
  '롤토체스',
  '오버워치',
  '발로란트',
  '배틀그라운드',
] as const;

const MAX_GAMES = 5;

export default function ProfileCard() {
  const user = useAuthStore(state => state.user);
  const { setUser } = useAuthStore.getState();
  const { setCurrentUser } = useCallStore.getState();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    userName: user?.userName || '',
    email: user?.email || '',
    age: user?.age || 0,
    location: user?.location || '',
    playGames: user?.playGames || [],
    avatar: user?.photoUrl || '',
  });

  useEffect(() => {
    setEditForm({
      userName: user?.userName || '',
      email: user?.email || '',
      age: user?.age || 0,
      location: user?.location || '',
      playGames: user?.playGames || [],
      avatar: user?.photoUrl || '',
    });
  }, [JSON.stringify(user)]);

  const handleFieldChange = (field: string, value: string | number) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updateRes = await usersApi.updateProfile({
        userName: editForm.userName,
        email: editForm.email,
        age: editForm.age,
        location: editForm.location,
        playGames: editForm.playGames,
        photoUrl: editForm.avatar,
      });

      if (!updateRes.success) {
        throw new Error(updateRes.message);
      }
      console.log('updateRes.data', updateRes.data);
      setUser(updateRes.data);
      setCurrentUser({
        userId: updateRes.data.id,
        userName: updateRes.data.userName,
        userPhotoUrl: updateRes.data.photoUrl || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(`프로필 업데이트 에러: ${error.message}`);
      } else {
        alert('프로필 업데이트 에러: 알 수 없는 에러');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      userName: user?.userName || '',
      email: user?.email || '',
      age: user?.age || 0,
      location: user?.location || '',
      playGames: user?.playGames || [],
      avatar: user?.photoUrl || '',
    });
    setIsEditing(false);
  };

  const handleGameToggle = (game: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      playGames: editForm.playGames?.includes(game)
        ? editForm.playGames?.filter(g => g !== game)
        : [...(editForm.playGames || []), game],
    });
  };

  return (
    <div className="relative bg-main-black-800 lg:rounded-xl p-5 border border-main-black-700 ">
      {/* 프로필 헤더 */}
      <div className="text-center mb-8">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h3 className="lg:text-lg text-base font-semibold text-white">자기소개</h3>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 lg:px-4 px-3 lg:py-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white lg:text-base text-sm rounded-lg transition-colors duration-200 font-medium"
            >
              <Edit3 className="w-4 h-4" />
              편집
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 lg:px-4 px-3 lg:py-2 py-1.5 bg-green-600 hover:bg-green-700 text-white lg:text-base text-sm rounded-lg transition-colors duration-200 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isLoading ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center gap-2 lg:px-4 px-3 lg:py-2 py-1.5 bg-red-600 hover:bg-red-700 text-white lg:text-base text-sm rounded-lg transition-colors duration-200 font-medium"
              >
                <X className="w-4 h-4" />
                취소
              </button>
            </div>
          )}
        </div>

        <div className="relative lg:w-40 lg:h-40 w-28 h-28 mx-auto mb-6 group">
          {/* 이미지 */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 ">
            <div className="w-full h-full overflow-hidden relative">
              {(editForm.avatar || user?.photoUrl) && (
                <Image
                  src={editForm.avatar || user?.photoUrl || ''}
                  alt="프로필 이미지"
                  fill
                  className="object-cover transition-transform duration-300 "
                />
              )}
            </div>
          </div>

          {isEditing && (
            <button className="absolute -bottom-3 -right-3 bg-blue-600 hover:bg-blue-700 text-white lg:p-3 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110">
              <Camera className="lg:w-5 lg:h-5 w-4 h-4" />
            </button>
          )}

          {/* 온라인 상태 표시 */}
          <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-main-black-800" />
        </div>

        {/* 이름과 이메일 */}
        <div className="space-y-2">
          <input
            type="text"
            value={isEditing ? editForm.userName : user?.userName || ''}
            onChange={e => isEditing && handleFieldChange('userName', e.target.value)}
            disabled={!isEditing || isLoading}
            placeholder=""
            className={`lg:text-2xl text-xl font-bold text-center 
              ${
                isEditing
                  ? 'bg-main-black-700 border border-main-black-600 rounded-lg lg:p-3 p-2 text-neutral-300'
                  : `text-neutral-200`
              }
              `}
          />

          <p className="text-neutral-400 text-sm flex items-center justify-center gap-2">
            <User className="w-4 h-4" />
            <input
              type="email"
              value={isEditing ? editForm.email : user?.email || ''}
              onChange={e => isEditing && handleFieldChange('email', e.target.value)}
              disabled={true || !isEditing || isLoading}
              placeholder=""
              className="text-neutral-400 lg:text-sm text-xs flex items-center justify-center gap-2"
            />
          </p>
        </div>
      </div>

      {/* 프로필 정보 */}
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-4">
          <div className="bg-main-black-700/50 rounded-lg p-4 border border-main-black-600">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <label className="text-sm font-medium text-neutral-300">나이</label>
            </div>
            <input
              type="text"
              value={typeof editForm.age === 'number' && editForm.age >= 0 ? editForm.age : ''}
              onChange={e => isEditing && handleFieldChange('age', parseInt(e.target.value) || 0)}
              disabled={!isEditing || isLoading}
              placeholder="나이를 입력하세요"
              className="w-full bg-main-black-700 border border-main-black-600 rounded-lg p-3 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>

          <div className="bg-main-black-700/50 rounded-lg p-4 border border-main-black-600">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-4 h-4 text-green-400" />
              <label className="text-sm font-medium text-neutral-300">위치</label>
            </div>
            <input
              type="text"
              value={isEditing ? editForm.location : user?.location || ''}
              onChange={e => isEditing && handleFieldChange('location', e.target.value)}
              disabled={!isEditing || isLoading}
              placeholder="위치를 입력하세요"
              className="w-full bg-main-black-700 border border-main-black-600 rounded-lg p-3 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* 관심사 */}
        <div className="bg-main-black-700/50 rounded-lg p-4 border border-main-black-600">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <label className="text-sm font-medium text-neutral-300">관심사</label>
          </div>
          <div className="w-full grid grid-cols-2 gap-2">
            {!isEditing &&
              editForm.playGames?.map(game => (
                <span
                  key={game}
                  className="p-3 rounded-lg bg-main-black-700 text-white text-sm  border transition-colors duration-200 text-center"
                >
                  {game}
                </span>
              ))}

            {isEditing &&
              GAME_OPTIONS.map(game => (
                <button
                  key={game}
                  onClick={() => handleGameToggle(game)}
                  disabled={
                    !!editForm.playGames?.length &&
                    editForm.playGames?.length >= MAX_GAMES &&
                    !editForm.playGames?.includes(game)
                  }
                  className={`p-3 rounded-lg border transition-all duration-200${
                    editForm.playGames?.includes(game)
                      ? 'border-neutral-200 text-neutral-200'
                      : !!editForm.playGames?.length && editForm.playGames?.length >= MAX_GAMES
                      ? 'bg-main-black-700 border-neutral-600 text-neutral-500 cursor-not-allowed'
                      : 'bg-main-black-700 border-neutral-600 text-neutral-400 hover:border-neutral-400'
                  }`}
                >
                  {game}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
