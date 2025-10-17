import { Gamepad2 } from 'lucide-react';
import { UserFirstLoginType } from '@/shared/api/types/user';

// 상수 정의
const GAME_OPTIONS = [
  '리그오브 레전드',
  '롤토체스',
  '오버워치',
  '발로란트',
  '배틀그라운드',
] as const;

const MAX_GAMES = 5;

interface GameSelectionStepProps {
  formData: UserFirstLoginType;
  onGameToggle: (game: string) => void;
}

export function GameSelectionStep({ formData, onGameToggle }: GameSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-blue-400" />
          관심 게임
        </h3>
        <p className="text-neutral-400 text-sm mb-4">
          플레이하는 게임을 선택해주세요 (최대 {MAX_GAMES}개)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {GAME_OPTIONS.map(game => (
            <button
              key={game}
              onClick={() => onGameToggle(game)}
              disabled={
                !!formData.playGames?.length &&
                formData.playGames?.length >= MAX_GAMES &&
                !formData.playGames?.includes(game)
              }
              className={`p-3 rounded-lg border transition-all duration-200 ${
                formData.playGames?.includes(game)
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : !!formData.playGames?.length && formData.playGames?.length >= MAX_GAMES
                  ? 'bg-main-black-700 border-main-black-600 text-neutral-500 cursor-not-allowed'
                  : 'bg-main-black-700 border-main-black-600 text-neutral-300 hover:border-blue-500'
              }`}
            >
              {game}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
