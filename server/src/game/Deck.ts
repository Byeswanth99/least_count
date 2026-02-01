import { Card, Rank, Suit } from '../types/game';

export class Deck {
  private static cardIdCounter = 0;

  static createDeck(numDecks: number): Card[] {
    const deck: Card[] = [];
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    for (let deckNum = 0; deckNum < numDecks; deckNum++) {
      // Add standard cards
      for (const suit of suits) {
        for (const rank of ranks) {
          deck.push({
            rank,
            suit,
            value: this.getCardValue(rank),
            id: `${rank}-${suit}-${this.cardIdCounter++}`
          });
        }
      }
      // Add 2 jokers per deck
      deck.push({
        rank: 'Joker',
        suit: 'joker',
        value: 0,
        id: `Joker-${this.cardIdCounter++}`
      });
      deck.push({
        rank: 'Joker',
        suit: 'joker',
        value: 0,
        id: `Joker-${this.cardIdCounter++}`
      });
    }

    return this.shuffle(deck);
  }

  static getCardValue(rank: Rank): number {
    if (rank === 'A') return 1;
    if (rank === 'Joker') return 0;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank);
  }

  static shuffle(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static calculateHandValue(hand: Card[], wildCardRank: Rank | null): number {
    return hand.reduce((total, card) => {
      // If card rank matches wild card rank, it's worth 0
      if (wildCardRank && card.rank === wildCardRank) {
        return total;
      }
      // Jokers are always 0
      if (card.rank === 'Joker') {
        return total;
      }
      return total + card.value;
    }, 0);
  }

  static getDeckCount(playerCount: number): number {
    if (playerCount <= 7) return 2; // 108 cards
    return 3; // 162 cards for 8-10 players
  }
}
