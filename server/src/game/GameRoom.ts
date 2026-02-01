import { GameState, Player, Card, GameSettings, Rank, RoundEndData, ShowResult } from '../types/game';
import { Deck } from './Deck';

export class GameRoom {
  private state: GameState;

  constructor(roomCode: string, hostId: string, hostName: string, settings: GameSettings) {
    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      hand: [],
      roundScores: [],
      totalScore: 0,
      isEliminated: false,
      isConnected: true,
      isHost: true
    };

    this.state = {
      roomCode,
      players: [hostPlayer],
      playerOrder: [], // Will be set when game starts
      currentRound: 0,
      deck: [],
      discardPile: [],
      currentTurnDiscardPile: [],
      wildCardRank: null,
      currentTurnPlayerId: null,
      roundStartPlayerId: null,
      gamePhase: 'lobby',
      hostId,
      settings,
      turnStartTime: null,
      turnTimeLimit: settings.timerEnabled ? settings.timerDuration * 1000 : 0,
      skipDrawThisTurn: false
    };
  }

  getState(): GameState {
    return this.state;
  }

  addPlayer(playerId: string, playerName: string): boolean {
    if (this.state.players.length >= 10) {
      return false;
    }
    if (this.state.gamePhase !== 'lobby') {
      return false;
    }
    if (this.state.players.find(p => p.id === playerId)) {
      return false;
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      hand: [],
      roundScores: [],
      totalScore: 0,
      isEliminated: false,
      isConnected: true,
      isHost: false
    };

    this.state.players.push(newPlayer);
    return true;
  }

  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter(p => p.id !== playerId);
    
    // If host leaves, assign new host
    if (this.state.hostId === playerId && this.state.players.length > 0) {
      this.state.hostId = this.state.players[0].id;
      this.state.players[0].isHost = true;
    }
  }

  startGame(): boolean {
    if (this.state.gamePhase !== 'lobby') return false;
    if (this.state.players.length < 2) return false;

    // Randomize and fix player order for visual display (same for all clients)
    const playerIds = this.state.players.map(p => p.id);
    // Fisher-Yates shuffle
    for (let i = playerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
    }
    this.state.playerOrder = playerIds;
    console.log('Fixed player order for game:', this.state.playerOrder);

    this.state.gamePhase = 'playing';
    this.startNewRound();
    return true;
  }

  private startNewRound(): void {
    this.state.currentRound++;
    console.log(`Starting round ${this.state.currentRound} (limit: ${this.state.settings.roundLimit})`);
    
    // Create and shuffle deck
    const numDecks = Deck.getDeckCount(this.state.players.length);
    this.state.deck = Deck.createDeck(numDecks);

    // Set wild card (draw one random card from deck, but NEVER a Joker)
    let wildCard;
    do {
      const wildCardIndex = Math.floor(Math.random() * this.state.deck.length);
      wildCard = this.state.deck.splice(wildCardIndex, 1)[0];
    } while (wildCard.rank === 'Joker');
    
    this.state.wildCardRank = wildCard.rank;

    // Deal 7 cards to each active player
    this.state.players.forEach(player => {
      if (!player.isEliminated) {
        player.hand = [];
        for (let i = 0; i < 7; i++) {
          const card = this.state.deck.pop();
          if (card) player.hand.push(card);
        }
      }
    });

    // Put one card in discard pile
    const firstDiscard = this.state.deck.pop();
    this.state.discardPile = firstDiscard ? [firstDiscard] : [];
    this.state.currentTurnDiscardPile = [];
    this.state.skipDrawThisTurn = false;

    // Set first player's turn for this round using fixed playerOrder
    // Get active players in the fixed visual order
    const activePlayerIds = this.state.playerOrder.filter(id => {
      const player = this.state.players.find(p => p.id === id);
      return player && !player.isEliminated;
    });
    
    if (activePlayerIds.length > 0) {
      if (this.state.currentRound === 1) {
        // First round: Pick random player from the active players
        const randomIndex = Math.floor(Math.random() * activePlayerIds.length);
        this.state.roundStartPlayerId = activePlayerIds[randomIndex];
        this.state.currentTurnPlayerId = activePlayerIds[randomIndex];
        console.log(`First round: Random start player selected: ${this.state.roundStartPlayerId} (index ${randomIndex} in visual order)`);
      } else {
        // Subsequent rounds: Move to next player in anti-clockwise direction (based on visual order)
        const prevStartIndex = activePlayerIds.findIndex(id => id === this.state.roundStartPlayerId);
        if (prevStartIndex !== -1) {
          // Move anti-clockwise: previous index in visual order (with wrap-around)
          const nextStartIndex = (prevStartIndex - 1 + activePlayerIds.length) % activePlayerIds.length;
          this.state.roundStartPlayerId = activePlayerIds[nextStartIndex];
          this.state.currentTurnPlayerId = activePlayerIds[nextStartIndex];
          console.log(`Round ${this.state.currentRound}: Round-robin start player: ${this.state.roundStartPlayerId} (moved anti-clockwise from index ${prevStartIndex} to ${nextStartIndex})`);
        } else {
          // Fallback: if previous start player not found (eliminated), pick first available in visual order
          this.state.roundStartPlayerId = activePlayerIds[0];
          this.state.currentTurnPlayerId = activePlayerIds[0];
          console.log(`Round ${this.state.currentRound}: Fallback start player: ${this.state.roundStartPlayerId}`);
        }
      }
      this.state.turnStartTime = Date.now();
    }
  }

  drawCard(playerId: string, source: 'deck' | 'discard'): Card | null {
    if (this.state.currentTurnPlayerId !== playerId) return null;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return null;

    let card: Card | null = null;

    if (source === 'deck') {
      // If deck is empty, reshuffle discard pile (keep top card)
      if (this.state.deck.length === 0 && this.state.discardPile.length > 1) {
        const topCard = this.state.discardPile.pop()!;
        this.state.deck = Deck.shuffle(this.state.discardPile);
        this.state.discardPile = [topCard];
      }
      card = this.state.deck.pop() || null;
    } else {
      card = this.state.discardPile.pop() || null;
    }

    if (card) {
      player.hand.push(card);
      
      // Merge current turn discard pile into main discard pile
      if (this.state.currentTurnDiscardPile.length > 0) {
        this.state.discardPile.push(...this.state.currentTurnDiscardPile);
        this.state.currentTurnDiscardPile = [];
      }
      
      // Move to next player after drawing
      this.nextTurn();
    }

    return card;
  }

  discardCards(playerId: string, cardIds: string[]): boolean {
    if (this.state.currentTurnPlayerId !== playerId) return false;
    if (cardIds.length === 0) return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Find cards to discard
    const cardsToDiscard: Card[] = [];
    for (const cardId of cardIds) {
      const cardIndex = player.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return false; // Card not in hand
      cardsToDiscard.push(player.hand[cardIndex]);
    }

    // If discarding multiple cards, they must all be same rank
    if (cardsToDiscard.length > 1) {
      const firstRank = cardsToDiscard[0].rank;
      if (!cardsToDiscard.every(c => c.rank === firstRank)) {
        return false;
      }
    }

    // Check if discarding same rank as top of discard pile
    const topOfDiscardPile = this.state.discardPile.length > 0 
      ? this.state.discardPile[this.state.discardPile.length - 1] 
      : null;
    
    const isMatchingDiscard = topOfDiscardPile && 
      cardsToDiscard.every(c => c.rank === topOfDiscardPile.rank);

    // Remove cards from hand and add to CURRENT TURN discard pile (not main pile)
    for (const cardId of cardIds) {
      const cardIndex = player.hand.findIndex(c => c.id === cardId);
      player.hand.splice(cardIndex, 1);
    }
    this.state.currentTurnDiscardPile.push(...cardsToDiscard);

    // If discarded card matches top of discard pile, skip draw and move to next turn
    if (isMatchingDiscard) {
      // Merge current turn discard pile into main discard pile
      if (this.state.currentTurnDiscardPile.length > 0) {
        this.state.discardPile.push(...this.state.currentTurnDiscardPile);
        this.state.currentTurnDiscardPile = [];
      }
      
      // Move to next player immediately
      this.nextTurn();
    }

    return true;
  }

  private nextTurn(): void {
    // Get active players in the fixed visual order
    const activePlayerIds = this.state.playerOrder.filter(id => {
      const player = this.state.players.find(p => p.id === id);
      return player && !player.isEliminated;
    });
    
    const currentIndex = activePlayerIds.findIndex(id => id === this.state.currentTurnPlayerId);
    // Move anti-clockwise: decrement index with wrap-around
    const nextIndex = (currentIndex - 1 + activePlayerIds.length) % activePlayerIds.length;
    this.state.currentTurnPlayerId = activePlayerIds[nextIndex];
    this.state.turnStartTime = Date.now();
    console.log(`Turn moved anti-clockwise: from index ${currentIndex} to ${nextIndex} (visual order)`);
  }

  callShow(playerId: string): RoundEndData | null {
    if (this.state.currentTurnPlayerId !== playerId) return null;
    if (this.state.gamePhase !== 'playing') return null; // Only allow show during playing phase

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return null;

    const playerHandTotal = Deck.calculateHandValue(player.hand, this.state.wildCardRank);

    // Check if player can call show (hand must be <= 10)
    if (playerHandTotal > 10) return null;

    // Calculate all hand totals
    const allHandTotals = this.state.players
      .filter(p => !p.isEliminated)
      .map(p => ({
        player: p,
        handTotal: Deck.calculateHandValue(p.hand, this.state.wildCardRank)
      }));

    const lowestHandTotal = Math.min(...allHandTotals.map(h => h.handTotal));
    const isGoodShow = playerHandTotal === lowestHandTotal;

    // Assign scores - only push if this is the first time scoring this round
    // Check by comparing roundScores length with currentRound
    if (isGoodShow) {
      // Good show - caller gets 0, others get their hand total
      allHandTotals.forEach(({ player: p, handTotal }) => {
        // Only push score if we haven't scored this round yet
        if (p.roundScores.length < this.state.currentRound) {
          if (p.id === playerId) {
            p.roundScores.push(0);
            p.totalScore += 0;
          } else {
            p.roundScores.push(handTotal);
            p.totalScore += handTotal;
          }
        }
      });
    } else {
      // Bad show - caller gets 40, lowest gets 0, others get their hand total
      allHandTotals.forEach(({ player: p, handTotal }) => {
        // Only push score if we haven't scored this round yet
        if (p.roundScores.length < this.state.currentRound) {
          if (p.id === playerId) {
            p.roundScores.push(40);
            p.totalScore += 40;
          } else if (handTotal === lowestHandTotal) {
            p.roundScores.push(0);
            p.totalScore += 0;
          } else {
            p.roundScores.push(handTotal);
            p.totalScore += handTotal;
          }
        }
      });
    }

    const showResult: ShowResult = {
      playerId,
      handTotal: playerHandTotal,
      isGoodShow,
      lowestHandTotal
    };

    return this.endRound(showResult);
  }

  autoPlay(playerId: string): boolean {
    // Safety check - only auto-play if game is in playing phase
    if (this.state.gamePhase !== 'playing') {
      console.log('AutoPlay prevented - game not in playing phase');
      return false;
    }
    
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.hand.length === 0) return false;

    // Find highest value card(s) to discard first
    const handWithValues = player.hand.map(c => ({
      card: c,
      value: c.rank === this.state.wildCardRank || c.rank === 'Joker' ? 0 : c.value
    }));
    
    handWithValues.sort((a, b) => b.value - a.value);
    const highestValue = handWithValues[0].value;
    
    // Discard all cards with highest value (if same rank)
    const cardsToDiscard = handWithValues
      .filter(h => h.value === highestValue && h.card.rank === handWithValues[0].card.rank)
      .map(h => h.card.id);

    // Discard first (this doesn't change turn)
    const discardSuccess = this.discardCards(playerId, cardsToDiscard);
    if (!discardSuccess) return false;

    // Check again before drawing
    if (this.state.gamePhase !== 'playing') {
      console.log('AutoPlay prevented after discard - game phase changed');
      return false;
    }

    // Then draw from deck (this will change turn to next player)
    const card = this.drawCard(playerId, 'deck');
    return card !== null;
  }

  checkTurnTimeout(): { playerId: string; playerName: string } | null {
    if (!this.state.settings.timerEnabled) return null;
    if (this.state.gamePhase !== 'playing') return null;
    if (!this.state.turnStartTime || !this.state.currentTurnPlayerId) return null;

    const elapsed = Date.now() - this.state.turnStartTime;
    if (elapsed >= this.state.turnTimeLimit) {
      const player = this.state.players.find(p => p.id === this.state.currentTurnPlayerId);
      if (player && this.state.gamePhase === 'playing') {
        const success = this.autoPlay(this.state.currentTurnPlayerId);
        if (success) {
          return { playerId: player.id, playerName: player.name };
        }
      }
    }
    return null;
  }

  private endRound(showResult?: ShowResult): RoundEndData {
    // Prevent double-ending a round
    if (this.state.gamePhase !== 'playing') {
      console.warn('endRound called but game is not in playing phase');
      // Return dummy data if called inappropriately
      return {
        scores: [],
        wildCardRank: this.state.wildCardRank
      };
    }
    
    // Check for eliminations (point limit mode)
    if (this.state.settings.endConditionType === 'pointLimit') {
      this.state.players.forEach(player => {
        if (player.totalScore >= this.state.settings.pointLimit) {
          player.isEliminated = true;
        }
      });
    }

    const roundEndData: RoundEndData = {
      scores: this.state.players.map(player => ({
        playerId: player.id,
        playerName: player.name,
        handTotal: Deck.calculateHandValue(player.hand, this.state.wildCardRank),
        roundScore: player.roundScores[player.roundScores.length - 1] || 0,
        totalScore: player.totalScore,
        isEliminated: player.isEliminated
      })),
      showResult,
      wildCardRank: this.state.wildCardRank
    };

    // Check if game should end
    const activePlayers = this.state.players.filter(p => !p.isEliminated);
    
    let gameEnded = false;
    if (this.state.settings.endConditionType === 'pointLimit') {
      // Game ends when only 1 player remains
      gameEnded = activePlayers.length <= 1;
    } else {
      // Round limit mode - check if we've played all rounds
      gameEnded = this.state.currentRound >= this.state.settings.roundLimit;
      console.log(`Round ${this.state.currentRound}/${this.state.settings.roundLimit} complete. Game ended: ${gameEnded}`);
    }

    if (gameEnded) {
      console.log('Game ending - setting phase to gameEnd');
      this.state.gamePhase = 'gameEnd';
    } else {
      console.log('Round ending - setting phase to roundEnd');
      this.state.gamePhase = 'roundEnd';
    }

    return roundEndData;
  }

  startNextRound(): void {
    if (this.state.gamePhase !== 'roundEnd') return;
    
    const activePlayers = this.state.players.filter(p => !p.isEliminated);
    if (activePlayers.length > 1) {
      this.state.gamePhase = 'playing';
      this.startNewRound();
    }
  }

  getWinner(): Player | null {
    if (this.state.gamePhase !== 'gameEnd') return null;

    const activePlayers = this.state.players.filter(p => !p.isEliminated);
    
    if (this.state.settings.endConditionType === 'pointLimit') {
      // Winner is last player standing
      return activePlayers.length === 1 ? activePlayers[0] : null;
    } else {
      // Winner is player with lowest total score
      return activePlayers.reduce((lowest, player) => 
        player.totalScore < lowest.totalScore ? player : lowest
      );
    }
  }
}
