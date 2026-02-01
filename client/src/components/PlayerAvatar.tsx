import { Player } from '../types/game';

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn: boolean;
  isYou: boolean;
  cardCount: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function PlayerAvatar({ player, isCurrentTurn, isYou, cardCount, position = 'top' }: PlayerAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`flex flex-col items-center ${position === 'bottom' ? 'gap-2' : 'gap-0.5 sm:gap-1'}`}>
      <div
        className={`
          relative rounded-full 
          ${isYou ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'}
          ${isCurrentTurn ? 'ring-2 sm:ring-4 ring-red-600 animate-pulse' : 'ring-1 sm:ring-2 ring-gray-300'}
          ${player.isEliminated ? 'opacity-50 grayscale' : ''}
          ${!player.isConnected ? 'opacity-40' : ''}
          bg-gradient-to-br from-blue-400 to-purple-500
          flex items-center justify-center
          text-white font-bold
          ${isYou ? 'text-base sm:text-xl' : 'text-sm sm:text-lg'}
          shadow-lg
          transition-all duration-300
        `}
      >
        {getInitials(player.name)}
        
        {player.isHost && (
          <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-yellow-400 rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs">
            👑
          </div>
        )}
      </div>

      <div className="text-center">
        <div className={`font-semibold ${isYou ? 'text-sm sm:text-base text-blue-700' : 'text-xs sm:text-sm text-gray-800'} truncate max-w-[80px] sm:max-w-none`}>
          {isYou ? 'YOU' : player.name}
          {!player.isConnected && ' (DC)'}
        </div>
        <div className={`text-xs sm:text-sm font-bold ${isCurrentTurn ? 'text-red-600' : 'text-blue-600'}`}>
          {cardCount} 🃏
        </div>
      </div>

      {player.isEliminated && (
        <div className="text-[10px] sm:text-xs text-red-600 font-semibold">
          ELIMINATED
        </div>
      )}
    </div>
  );
}
