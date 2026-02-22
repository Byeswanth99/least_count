import { Player } from '../types/game';

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn: boolean;
  isYou: boolean;
  cardCount: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Smaller avatar and text when many players (e.g. 5+) to avoid overlap */
  compact?: boolean;
  /** Even smaller for 8–9 players (7+ others) on mobile/desktop */
  extraCompact?: boolean;
}

export function PlayerAvatar({ player, isCurrentTurn, isYou, cardCount, position = 'top', compact = false, extraCompact = false }: PlayerAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarSize = extraCompact
    ? (isYou ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-7 h-7 sm:w-8 sm:h-8')
    : compact
      ? (isYou ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-9 h-9 sm:w-10 sm:h-10')
      : (isYou ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16');
  const textSize = extraCompact
    ? (isYou ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[10px]')
    : compact
      ? (isYou ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs')
      : (isYou ? 'text-sm sm:text-base text-blue-700' : 'text-xs sm:text-sm text-gray-800');
  const maxNameWidth = extraCompact ? 'max-w-[40px] sm:max-w-[48px]' : compact ? 'max-w-[56px] sm:max-w-[64px]' : 'max-w-[80px] sm:max-w-none';

  const gapClass = position === 'bottom' ? 'gap-2' : extraCompact ? 'gap-0' : compact ? 'gap-0.5' : 'gap-0.5 sm:gap-1';
  const initialsSize = extraCompact ? 'text-[8px] sm:text-[10px]' : compact ? 'text-[10px] sm:text-xs' : isYou ? 'text-base sm:text-xl' : 'text-sm sm:text-lg';
  const cardCountSize = extraCompact ? 'text-[8px] sm:text-[10px]' : compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm';

  return (
    <div className={`flex flex-col items-center ${gapClass}`}>
      <div
        className={`
          relative rounded-full 
          ${avatarSize}
          ${isCurrentTurn ? 'ring-2 sm:ring-4 ring-red-600 animate-pulse' : 'ring-1 sm:ring-2 ring-gray-300'}
          ${player.isEliminated ? 'opacity-50 grayscale' : ''}
          ${!player.isConnected ? 'opacity-40' : ''}
          bg-gradient-to-br from-blue-400 to-purple-500
          flex items-center justify-center
          text-white font-bold
          ${initialsSize}
          shadow-lg
          transition-all duration-300
        `}
      >
        {getInitials(player.name)}
        
        {player.isHost && !compact && !extraCompact && (
          <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-yellow-400 rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs">
            👑
          </div>
        )}
        {player.isHost && (compact || extraCompact) && (
          <div className={`absolute -top-0.5 -right-0.5 bg-yellow-400 rounded-full flex items-center justify-center ${extraCompact ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 text-[6px]' : 'w-3 h-3 sm:w-4 sm:h-4 text-[8px]'}`}>
            👑
          </div>
        )}
      </div>

      <div className="text-center">
        <div className={`font-semibold ${textSize} text-gray-800 truncate ${maxNameWidth} ${isYou ? 'text-blue-700' : ''}`}>
          {isYou ? 'YOU' : player.name}
          {!player.isConnected && ' (DC)'}
        </div>
        <div className={`${cardCountSize} font-bold ${isCurrentTurn ? 'text-red-600' : 'text-blue-600'}`}>
          {cardCount} 🃏
        </div>
      </div>

      {player.isEliminated && !extraCompact && (
        <div className="text-[10px] sm:text-xs text-red-600 font-semibold">
          ELIMINATED
        </div>
      )}
      {player.isEliminated && extraCompact && (
        <div className="text-[8px] text-red-600 font-semibold">OUT</div>
      )}
    </div>
  );
}
