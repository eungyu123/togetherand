import { Play, RefreshCw, Loader2 } from 'lucide-react';
import { useCallStore } from '@/domain/call/store/call';
import { useMatchContext } from '@/domain/match/components/MatchProvider';

interface MatchButtonProps {
  gameType: string;
}

export function MatchButton({ gameType }: MatchButtonProps) {
  const callState = useCallStore(state => state.callState);
  const { cancelMatchRequest, createMatchRequest } = useMatchContext();
  // 매칭 상태별 버튼 설정
  const buttonConfig = {
    inMatch: {
      icon: null,
      text: '매칭중...',
      onClick: async () => {},
    },
    inMatchWait: {
      icon: <Loader2 size={18} className="animate-spin" />,
      text: '매칭 잡는 중...',
      onClick: async () => {
        try {
          await cancelMatchRequest(gameType);
        } catch (error) {
          console.error('❌ 매칭 취소 실패:', error);
        }
      },
    },
    ended: {
      icon: <Play size={18} />,
      text: '매칭 시작',
      onClick: async () => {
        try {
          await createMatchRequest(gameType);
        } catch (error) {
          console.error('❌ 매칭 시작 실패:', error);
        }
      },
    },
  };

  const getConfig = () => {
    if (callState === 'inMatch') {
      return buttonConfig.inMatch;
    } else if (callState === 'inMatchWait') {
      return buttonConfig.inMatchWait;
    } else {
      return buttonConfig.ended;
    }
  };
  const config = getConfig();

  return (
    <button
      className="flex items-center gap-2 px-4 py-2 bg-main-black-750 rounded-lg text-sm text-white hover:bg-main-black-700 transition-colors"
      onClick={config.onClick}
    >
      {config.icon}
      <span>{config.text}</span>
    </button>
  );
}
