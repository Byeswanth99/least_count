import { Card, Rank, Suit } from '../types/game';

export function getCardSymbol(suit: Suit): string {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
    joker: '🃏'
  };
  return symbols[suit];
}

export function getCardColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
}

export function calculateHandValue(hand: Card[], wildCardRank: Rank | null): number {
  return hand.reduce((total, card) => {
    if (wildCardRank && card.rank === wildCardRank) return total;
    if (card.rank === 'Joker') return total;
    return total + card.value;
  }, 0);
}

export function formatCardRank(rank: Rank): string {
  return rank;
}

export function isWildCard(card: Card, wildCardRank: Rank | null): boolean {
  return card.rank === 'Joker' || (wildCardRank !== null && card.rank === wildCardRank);
}
