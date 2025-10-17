'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MatchButton } from './MatchButton';
import { gameTypes } from '../type';
import { useMatchStore } from '@/domain/match/store/match';

export default function HeaderBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedGameType = useMatchStore(state => state.gameType);
  const { setGameType } = useMatchStore.getState();

  const selectedGameTypeLabel =
    gameTypes.find(type => type.value === selectedGameType)?.label || '랜덤 매칭';

  const handleGameTypeSelect = (gameType: string) => {
    setGameType(gameType);
    setIsDropdownOpen(false);
  };

  return (
    <header className="flex justify-between items-center p-3 w-full h-15 bg-main-black-800">
      {/* 게임 타입 선택 영역 */}
      <section className="flex gap-3">
        <div className="relative">
          {/* 드롭다운 버튼 */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between lg:w-40 lg:h-9 w-32 h-8 px-3 bg-main-black-750 rounded-lg text-white hover:bg-main-black-700 transition-colors"
          >
            <span className="text-sm truncate">{selectedGameTypeLabel}</span>
            {isDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* 드롭다운 메뉴 */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 lg:w-40 w-32 bg-main-black-750 rounded-lg shadow-lg border border-main-black-600 z-10">
              {gameTypes.map(gameType => (
                <button
                  key={gameType.value}
                  onClick={() => handleGameTypeSelect(gameType.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-main-black-600 transition-colors first:rounded-t-md last:rounded-b-md ${
                    selectedGameType === gameType.value
                      ? 'bg-main-black-600 text-blue-400'
                      : 'text-white'
                  }`}
                >
                  {gameType.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 매칭 컨트롤 영역 */}
      <section className="flex gap-3">
        <MatchButton gameType={selectedGameType} />
      </section>

      {/* 드롭다운 외부 클릭 시 닫기 */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsDropdownOpen(false)} />
      )}
    </header>
  );
}
