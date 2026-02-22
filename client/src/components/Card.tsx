import { Card as CardType, Rank } from '../types/game';
import { getCardSymbol, getCardColor, formatCardRank } from '../utils/cardUtils';

interface CardProps {
  card: CardType;
  wildCardRank: Rank | null;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  showWildIndicator?: boolean; // Kept for API compatibility but no longer used (no wild highlighting)
}

export function Card({ card, wildCardRank: _wildCardRank, isSelected, onClick, size = 'medium' }: CardProps) {
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
        transition-all duration-200 flex flex-col items-center justify-between p-2
        relative
      `}
    >
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
