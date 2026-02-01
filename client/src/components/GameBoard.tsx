import { useState, useEffect } from 'react';
import { GameState, Card as CardType, RoundEndData } from '../types/game';
import { Card } from './Card';
import { PlayerAvatar } from './PlayerAvatar';
import { Scoreboard } from './Scoreboard';
import { calculateHandValue } from '../utils/cardUtils';

interface GameBoardProps {
  gameState: GameState;
  playerId: string;
  onDrawCard: (source: 'deck' | 'discard') => void;
  onDiscardCards: (cardIds: string[]) => void;
  onCallShow: () => void;
  onStartNextRound: () => void;
}

export function GameBoard({
  gameState,
  playerId,
  onDrawCard,
  onDiscardCards,
  onCallShow,
  onStartNextRound
}: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [hasDiscarded, setHasDiscarded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [roundEndData, setRoundEndData] = useState<RoundEndData | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [localCardOrder, setLocalCardOrder] = useState<string[]>([]); // Store card IDs in user's preferred order

  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  
  // Arrange other players in anti-clockwise order from current player's perspective
  // If order is [A, B, C, D] and you're A, you see [B, C, D] (going forward/clockwise in display, anti-clockwise in turn)
  const getOtherPlayersInOrder = () => {
    const myIndex = gameState.playerOrder.findIndex(id => id === playerId);
    if (myIndex === -1) return [];
    
    const totalPlayers = gameState.playerOrder.length;
    const otherPlayers = [];
    
    // Go forward in the array (which represents anti-clockwise visually when you're at bottom)
    // This makes the display feel like going left-to-right counter-clockwise around the circle
    for (let i = 1; i < totalPlayers; i++) {
      const index = (myIndex + i) % totalPlayers;
      const player = gameState.players.find(p => p.id === gameState.playerOrder[index]);
      if (player) {
        otherPlayers.push(player);
      }
    }
    
    return otherPlayers;
  };
  
  const otherPlayers = getOtherPlayersInOrder();

  // Get ordered hand based on local order preference
  const orderedHand = currentPlayer ? (() => {
    const handMap = new Map(currentPlayer.hand.map(card => [card.id, card]));
    
    // Filter out card IDs that no longer exist in hand
    const validOrderedIds = localCardOrder.filter(id => handMap.has(id));
    
    // Find new cards that aren't in the order yet
    const newCardIds = currentPlayer.hand
      .map(c => c.id)
      .filter(id => !localCardOrder.includes(id));
    
    // Combine: existing order + new cards at the end
    const finalOrder = [...validOrderedIds, ...newCardIds];
    
    // Update local order if new cards were added
    if (newCardIds.length > 0) {
      setLocalCardOrder(finalOrder);
    }
    
    return finalOrder.map(id => handMap.get(id)!).filter(Boolean);
  })() : [];

  const handValue = currentPlayer ? calculateHandValue(currentPlayer.hand, gameState.wildCardRank) : 0;
  const canCallShow = isMyTurn && !hasDiscarded && handValue <= 10; // Can only show BEFORE discarding
  const canSkipDraw = gameState.skipDrawThisTurn;

  // Timer effect
  useEffect(() => {
    if (!gameState.settings.timerEnabled) {
      setTimeLeft(0);
      return;
    }

    if (!isMyTurn || !gameState.turnStartTime) {
      setTimeLeft(gameState.settings.timerDuration);
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - gameState.turnStartTime!;
      const remaining = Math.max(0, Math.ceil((gameState.turnTimeLimit - elapsed) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [isMyTurn, gameState.turnStartTime, gameState.settings.timerEnabled, gameState.settings.timerDuration, gameState.turnTimeLimit]);

  // Reset discard state when turn changes
  useEffect(() => {
    if (isMyTurn) {
      setHasDiscarded(false);
      setSelectedCards([]);
    }
  }, [gameState.currentTurnPlayerId]);

  // Reset card order when round changes
  useEffect(() => {
    setLocalCardOrder([]);
  }, [gameState.currentRound]);

  const handleCardClick = (cardId: string) => {
    if (hasDiscarded || !isMyTurn) return;

    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        // Check if we can add this card (must be same rank as others)
        if (prev.length > 0) {
          const firstCard = orderedHand.find(c => c.id === prev[0]);
          const clickedCard = orderedHand.find(c => c.id === cardId);
          if (firstCard && clickedCard && firstCard.rank !== clickedCard.rank) {
            return prev; // Can't select cards of different ranks
          }
        }
        return [...prev, cardId];
      }
    });
  };

  const handleDiscard = () => {
    if (!isMyTurn || hasDiscarded || selectedCards.length === 0) return;
    onDiscardCards(selectedCards);
    setSelectedCards([]);
    setHasDiscarded(true);
  };

  const handleDraw = (source: 'deck' | 'discard') => {
    if (!isMyTurn || !hasDiscarded) return;
    onDrawCard(source);
    setHasDiscarded(false);
  };

  const handleShow = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Show button clicked!', { isMyTurn, hasDiscarded, handValue, canCallShow });
    
    if (!isMyTurn || hasDiscarded || handValue > 10) {
      console.log('Cannot call show - conditions not met');
      return;
    }
    
    console.log('Calling show - conditions met!');
    onCallShow();
  };

  // Drag and drop handlers
  const handleDragStart = (cardId: string) => {
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    setDragOverCardId(cardId);
  };

  const handleDrop = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    if (!draggedCardId || !currentPlayer) return;

    const draggedIndex = orderedHand.findIndex(c => c.id === draggedCardId);
    const targetIndex = orderedHand.findIndex(c => c.id === targetCardId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    // Rotate cards in circular order (not swap)
    const newOrder = orderedHand.map(c => c.id);
    const [draggedCardId_] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedCardId_);
    
    // Update the local card order state
    setLocalCardOrder(newOrder);
    
    setDraggedCardId(null);
    setDragOverCardId(null);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragOverCardId(null);
  };

  // Position other players at top in a horizontal/curved arrangement
  const getPlayerPosition = (index: number, total: number) => {
    if (total <= 3) {
      // Simple horizontal layout for 3 or fewer - adjusted for mobile
      const spacing = Math.min(28, 75 / total);
      const startLeft = 50 - (spacing * (total - 1)) / 2;
      return { top: '12%', left: `${startLeft + index * spacing}%` };
    }
    // Curved arrangement for more players - tighter on mobile
    const angle = (index / (total - 1)) * Math.PI - Math.PI / 2;
    const radius = window.innerWidth < 640 ? 30 : 35; // Smaller radius on mobile
    const centerX = 50;
    const centerY = window.innerWidth < 640 ? 18 : 30; // Higher on mobile
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { top: `${Math.max(8, y)}%`, left: `${x}%` };
  };

  if (gameState.gamePhase === 'roundEnd' || gameState.gamePhase === 'gameEnd') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <h2 className="text-3xl font-bold text-center mb-6">
            {gameState.gamePhase === 'gameEnd' ? '🏆 Game Over!' : '🎯 Round Over!'}
          </h2>

          {gameState.gamePhase === 'gameEnd' && (
            <div className="mb-6 p-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg text-center">
              <div className="text-2xl font-bold text-white mb-2">Winner!</div>
              <div className="text-3xl font-bold text-white">
                {gameState.players
                  .filter(p => !p.isEliminated)
                  .sort((a, b) => a.totalScore - b.totalScore)[0]?.name || 'N/A'}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Final Scores:</h3>
            <div className="space-y-2">
              {gameState.players
                .slice()
                .sort((a, b) => a.totalScore - b.totalScore)
                .map((player, idx) => (
                  <div
                    key={player.id}
                    className={`
                      p-4 rounded-lg flex justify-between items-center
                      ${idx === 0 && !player.isEliminated ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-50'}
                      ${player.isEliminated ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {idx === 0 && !player.isEliminated && <span className="text-2xl">🏆</span>}
                      <span className="font-semibold">{player.name}</span>
                      {player.isEliminated && <span className="text-red-600 text-sm">(Eliminated)</span>}
                    </div>
                    <div className="text-xl font-bold">{player.totalScore} pts</div>
                  </div>
                ))}
            </div>
          </div>

          {gameState.gamePhase === 'roundEnd' && (
            <button
              onClick={onStartNextRound}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Next Round
            </button>
          )}

          {gameState.gamePhase === 'gameEnd' && (
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg p-2 sm:p-4 flex justify-between items-center z-10">
        <div className="text-white">
          <div className="text-xs sm:text-sm font-semibold">Round {gameState.currentRound}</div>
          <div className="text-[10px] sm:text-xs">
            {gameState.settings.endConditionType === 'pointLimit' 
              ? `Limit: ${gameState.settings.pointLimit}` 
              : `Rounds: ${gameState.settings.roundLimit}`}
          </div>
        </div>

        {isMyTurn && gameState.settings.timerEnabled && (
          <div className={`text-lg sm:text-2xl font-bold ${timeLeft <= 10 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
            ⏱️ {timeLeft}s
          </div>
        )}

        <button
          onClick={() => setShowScoreboard(true)}
          className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base font-semibold transition-all"
        >
          📊 <span className="hidden sm:inline">Scoreboard</span>
        </button>
      </div>

      {/* Other Players (Top Layout) - Shows in anti-clockwise order from your perspective */}
      <div className="absolute inset-0 pointer-events-none">
        {otherPlayers.map((player, index) => (
          <div
            key={player.id}
            className="absolute pointer-events-auto"
            style={getPlayerPosition(index, otherPlayers.length)}
          >
            <PlayerAvatar
              player={player}
              isCurrentTurn={gameState.currentTurnPlayerId === player.id}
              isYou={false}
              cardCount={player.hand.length}
            />
          </div>
        ))}
      </div>

      {/* Center Area - Deck, Wild Card, and Two Discard Piles */}
      <div className="absolute top-[35%] sm:top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-4 scale-75 sm:scale-100">
        {/* Wild Card Display */}
        {gameState.wildCardRank && (
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div className="text-[10px] sm:text-xs font-bold text-gray-700 bg-yellow-300 px-1 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">WILD</div>
            <div className="transform scale-75 sm:scale-90">
              <Card
                card={{
                  rank: gameState.wildCardRank,
                  suit: 'hearts',
                  value: 0,
                  id: 'wild-display'
                }}
                wildCardRank={gameState.wildCardRank}
                size="medium"
                showWildIndicator={true}
              />
            </div>
          </div>
        )}

        {/* Deck */}
        <div
          onClick={() => handleDraw('deck')}
          className={`
            relative w-16 h-24 sm:w-24 sm:h-32 bg-blue-900 rounded-lg border-2 sm:border-4 border-white shadow-2xl
            flex items-center justify-center text-white font-bold text-base sm:text-xl
            ${isMyTurn && hasDiscarded ? 'cursor-pointer hover:scale-110 hover:shadow-blue-500/50' : 'opacity-60'}
            transition-all duration-200
          `}
        >
          <div className="text-center">
            <div className="text-3xl mb-1">🎴</div>
            <div className="text-sm">{gameState.deck.length}</div>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-700 text-2xl sm:text-4xl font-bold">→</div>

        {/* Main Discard Pile (can draw from) */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
          <div className="text-[10px] sm:text-xs font-semibold text-green-700 whitespace-nowrap">Draw Pile</div>
          <div
            onClick={() => handleDraw('discard')}
            className={`
              relative w-16 h-24 sm:w-24 sm:h-32
              ${isMyTurn && hasDiscarded && gameState.discardPile.length > 0 ? 'cursor-pointer hover:scale-110 ring-2 ring-green-500' : 'opacity-90'}
              transition-all duration-200
            `}
          >
            {gameState.discardPile.length > 0 ? (
              <Card
                card={gameState.discardPile[gameState.discardPile.length - 1]}
                wildCardRank={gameState.wildCardRank}
                size="medium"
                showWildIndicator={true}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 rounded-lg border-2 sm:border-4 border-dashed border-gray-400 flex items-center justify-center text-gray-500 text-[10px] sm:text-xs text-center">
                Empty
              </div>
            )}
          </div>
        </div>

        {/* Current Turn Discard Pile (just discarded - cannot draw yet) */}
        {gameState.currentTurnDiscardPile.length > 0 && (
          <div className="flex flex-col items-center gap-0.5 sm:gap-1">
            <div className="text-[10px] sm:text-xs font-semibold text-orange-700 whitespace-nowrap">Just Discarded</div>
            <div className="relative w-16 h-24 sm:w-24 sm:h-32 opacity-75">
              <Card
                card={gameState.currentTurnDiscardPile[gameState.currentTurnDiscardPile.length - 1]}
                wildCardRank={gameState.wildCardRank}
                size="medium"
                showWildIndicator={true}
              />
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                {gameState.currentTurnDiscardPile.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Player (Bottom) */}
      {currentPlayer && (
        <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 backdrop-blur-sm shadow-2xl p-2 sm:p-3">
          <div className="max-w-6xl mx-auto">
            {/* Player Info and Hand Value - Compact Row */}
            <div className="flex justify-between items-center mb-1 sm:mb-2 px-1 sm:px-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className={`
                    w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 
                    flex items-center justify-center text-white font-bold text-xs sm:text-base
                    ${isMyTurn ? 'ring-2 sm:ring-4 ring-red-600 animate-pulse' : 'ring-1 sm:ring-2 ring-blue-600'}
                    transition-all duration-300
                  `}>
                    {currentPlayer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-blue-700 text-xs sm:text-base">YOU</div>
                    <div className="text-[10px] sm:text-xs text-gray-600">{currentPlayer.hand.length} cards</div>
                  </div>
                </div>
                <div className={`px-2 sm:px-4 py-0.5 sm:py-1 rounded-full font-bold text-xs sm:text-sm ${
                  handValue <= 10 ? 'bg-green-400 text-green-900' : 'bg-gray-300 text-gray-800'
                }`}>
                  Total: {handValue}
                </div>
              </div>
              
              {isMyTurn && gameState.settings.timerEnabled && (
                <div className={`text-sm sm:text-lg font-bold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                  ⏱️ {timeLeft}s
                </div>
              )}
            </div>

            {/* Cards - More compact */}
            <div className="flex justify-center items-end gap-0.5 sm:gap-1 mb-1 sm:mb-2 flex-wrap overflow-x-auto max-w-full px-1">
              {orderedHand.map(card => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id)}
                  onDragOver={(e) => handleDragOver(e, card.id)}
                  onDrop={(e) => handleDrop(e, card.id)}
                  onDragEnd={handleDragEnd}
                  className={`transform ${dragOverCardId === card.id ? 'border-2 border-blue-400 rounded-lg scale-95 sm:scale-100' : 'scale-95 sm:scale-100'}`}
                >
                  <Card
                    card={card}
                    wildCardRank={gameState.wildCardRank}
                    isSelected={selectedCards.includes(card.id)}
                    onClick={() => handleCardClick(card.id)}
                    size="large"
                    showWildIndicator={false}
                  />
                </div>
              ))}
            </div>

            {/* Actions - More compact */}
            <div className="flex justify-center gap-1 sm:gap-2 flex-wrap px-1">
              <button
                onClick={handleDiscard}
                disabled={!isMyTurn || hasDiscarded || selectedCards.length === 0}
                className={`
                  px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm
                  ${isMyTurn && !hasDiscarded && selectedCards.length > 0
                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg active:scale-95'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }
                `}
              >
                Discard ({selectedCards.length})
              </button>

              <button
                onClick={() => handleDraw('deck')}
                disabled={!isMyTurn || !hasDiscarded}
                className={`
                  px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm
                  ${isMyTurn && hasDiscarded
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }
                `}
              >
                Draw from Deck
              </button>

              <button
                onClick={() => handleDraw('discard')}
                disabled={!isMyTurn || !hasDiscarded || gameState.discardPile.length === 0}
                className={`
                  px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm
                  ${isMyTurn && hasDiscarded && gameState.discardPile.length > 0
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg active:scale-95'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }
                `}
              >
                <span className="hidden sm:inline">Draw from Discard</span>
                <span className="sm:hidden">Discard</span>
              </button>

              <button
                onClick={handleShow}
                disabled={!canCallShow}
                className={`
                  px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm
                  ${canCallShow
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg animate-pulse active:scale-95'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }
                `}
              >
                🎯 SHOW!
              </button>
            </div>

            {!isMyTurn && (
              <div className="text-center mt-1 sm:mt-2 text-gray-700 text-[10px] sm:text-xs font-semibold">
                Waiting for {gameState.players.find(p => p.id === gameState.currentTurnPlayerId)?.name}'s turn...
              </div>
            )}
            
            {isMyTurn && !hasDiscarded && handValue > 10 && (
              <div className="text-center mt-1 sm:mt-2 text-blue-700 text-[10px] sm:text-xs font-semibold">
                👉 Select and discard card(s) first
              </div>
            )}
            
            {isMyTurn && !hasDiscarded && handValue <= 10 && (
              <div className="text-center mt-2 text-green-700 text-xs font-semibold animate-pulse">
                🎯 You can call SHOW now (hand ≤ 10) or discard to continue
              </div>
            )}
            
            {isMyTurn && hasDiscarded && canSkipDraw && (
              <div className="text-center mt-2 text-green-700 text-xs font-semibold">
                ✅ Matching discard! Turn automatically passed.
              </div>
            )}
            
            {isMyTurn && hasDiscarded && !canSkipDraw && (
              <div className="text-center mt-2 text-purple-700 text-xs font-semibold">
                👉 Now draw a card from deck or discard pile
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scoreboard Modal */}
      {showScoreboard && (
        <Scoreboard gameState={gameState} onClose={() => setShowScoreboard(false)} />
      )}
    </div>
  );
}
