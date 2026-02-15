export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';

export interface Card {
  rank: Rank;
  suit: Suit;
  value: number;
  id: string;
}

export interface Player {
  id: string;
  playerToken: string;
  name: string;
  hand: Card[];
  roundScores: number[];
  totalScore: number;
  isEliminated: boolean;
  isConnected: boolean;
  isHost: boolean;
}

export type GamePhase = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';
export type EndConditionType = 'pointLimit' | 'roundLimit';

export interface GameSettings {
  endConditionType: EndConditionType;
  pointLimit: number;
  roundLimit: number;
  timerEnabled: boolean;
  timerDuration: number;
}

export interface GameState {
  roomCode: string;
  players: Player[];
  playerOrder: string[];
  currentRound: number;
  deck: Card[];
  discardPile: Card[];
  currentTurnDiscardPile: Card[];
  wildCardRank: Rank | null;
  currentTurnPlayerId: string | null;
  roundStartPlayerId: string | null;
  gamePhase: GamePhase;
  hostId: string;
  settings: GameSettings;
  turnStartTime: number | null;
  turnTimeLimit: number;
  skipDrawThisTurn: boolean;
}

export interface ShowResult {
  playerId: string;
  handTotal: number;
  isGoodShow: boolean;
  lowestHandTotal: number;
}

export interface RoundEndData {
  scores: Array<{
    playerId: string;
    playerName: string;
    handTotal: number;
    roundScore: number;
    totalScore: number;
    isEliminated: boolean;
  }>;
  showResult?: ShowResult;
  wildCardRank: Rank | null;
}
