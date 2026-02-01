import { Card as CardType, Rank } from '../types/game';
import { getCardSymbol, getCardColor, formatCardRank, isWildCard } from '../utils/cardUtils';

interface CardProps {
  card: CardType;
  wildCardRank: Rank | null;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  showWildIndicator?: boolean; // New prop to control wild card highlighting
}

export function Card({ card, wildCardRank, isSelected, onClick, size = 'medium', showWildIndicator = true }: CardProps) {
  const isWild = isWildCard(card, wildCardRank);
  
  const sizeClasses = {
    small: 'w-12 h-16 text-xs',
    medium: 'w-16 h-24 text-sm',
    large: 'w-16 h-22 text-sm'
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        bg-white rounded-lg shadow-md border-2 
        ${isSelected ? 'border-blue-500 -translate-y-2' : 'border-gray-300'}
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}
        ${isWild && showWildIndicator ? 'ring-2 ring-yellow-400' : ''}
        transition-all duration-200 flex flex-col items-center justify-between p-2
        relative
      `}
    >
      {isWild && showWildIndicator && (
        <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          W
        </div>
      )}
      <div className={`font-bold ${getCardColor(card.suit)}`}>
        {formatCardRank(card.rank)}
      </div>
      <div className={`text-2xl ${getCardColor(card.suit)}`}>
        {getCardSymbol(card.suit)}
      </div>
      <div className={`font-bold ${getCardColor(card.suit)}`}>
        {formatCardRank(card.rank)}
      </div>
    </div>
  );
}
