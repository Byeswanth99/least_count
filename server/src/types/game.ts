export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';

export interface Card {
  rank: Rank;
  suit: Suit;
  value: number;
  id: string; // Unique identifier for each card instance
}

export interface Player {
  id: string;           // Current socket.id (changes on reconnect)
  playerToken: string; // Persistent token for reconnection (survives refresh)
  name: string;
  hand: Card[];
  roundScores: number[]; // Score for each round
  totalScore: number;
  isEliminated: boolean;
  isConnected: boolean;
  isHost: boolean;
}

export type GamePhase = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';
export type EndConditionType = 'pointLimit' | 'roundLimit';

export interface GameSettings {
  endConditionType: EndConditionType;
  pointLimit: number; // Used if endConditionType is 'pointLimit'
  roundLimit: number; // Used if endConditionType is 'roundLimit'
  timerEnabled: boolean; // Whether turn timer is enabled
  timerDuration: number; // Timer duration in seconds (default 30)
}

export interface GameState {
  roomCode: string;
  players: Player[];
  playerOrder: string[]; // Fixed visual order of player IDs (same for all clients)
  currentRound: number;
  deck: Card[];
  discardPile: Card[]; // Main discard pile (can draw from)
  currentTurnDiscardPile: Card[]; // Cards discarded in current turn (cannot draw from yet)
  wildCardRank: Rank | null; // The rank that's wild this round
  currentTurnPlayerId: string | null;
  roundStartPlayerId: string | null; // Track who started current round (for round-robin)
  gamePhase: GamePhase;
  hostId: string;
  settings: GameSettings;
  turnStartTime: number | null; // Timestamp when turn started
  turnTimeLimit: number; // Timer duration in milliseconds
  skipDrawThisTurn: boolean; // Flag to indicate if player can skip draw (when matching discard)
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
