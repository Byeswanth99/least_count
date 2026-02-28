import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RoundEndData } from '../types/game';
import { Card } from './Card';
import { PlayerAvatar } from './PlayerAvatar';
import { Scoreboard } from './Scoreboard';
import { calculateHandValue } from '../utils/cardUtils';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface GameBoardProps {
  gameState: GameState;
  playerId: string;
  lastRoundEndData?: RoundEndData | null;
  onDrawCard: (source: 'deck' | 'discard') => void;
  onDiscardCards: (cardIds: string[]) => void;
  onCallShow: () => void;
  onStartNextRound: () => void;
  onEndGameByHost?: () => void;
}

export function GameBoard({
  gameState,
  playerId,
  lastRoundEndData = null,
  onDrawCard,
  onDiscardCards,
  onCallShow,
  onStartNextRound,
  onEndGameByHost
}: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [hasDiscarded, setHasDiscarded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [localCardOrder, setLocalCardOrder] = useState<string[]>([]); // Store card IDs in user's preferred order
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playSound, resumeContextIfNeeded } = useSoundEffects();
  const prevTurnPlayerIdRef = useRef<string | null>(null);

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

  // Reset discard state when turn changes and play notification sound only when turn *transitions* to us
  useEffect(() => {
    const currentTurnId = gameState.currentTurnPlayerId ?? null;
    if (isMyTurn) {
      setHasDiscarded(false);
      setSelectedCards([]);
      // Play sound only when turn just switched to us (not on initial mount when we're first player)
      const justBecameMyTurn = prevTurnPlayerIdRef.current != null && prevTurnPlayerIdRef.current !== playerId && currentTurnId === playerId;
      if (justBecameMyTurn) {
        if (soundEnabled) playSound('turnNotification');
        if (navigator.vibrate) navigator.vibrate(200);
      }
    }
    prevTurnPlayerIdRef.current = currentTurnId;
  }, [gameState.currentTurnPlayerId, isMyTurn, soundEnabled, playSound, playerId]);

  // Reset card order when round changes
  useEffect(() => {
    setLocalCardOrder([]);
  }, [gameState.currentRound]);

  const handleCardClick = (cardId: string) => {
    if (hasDiscarded || !isMyTurn) return;

    resumeContextIfNeeded(); // Unlock audio on first interaction
    if (soundEnabled) {
      playSound('select');
    }

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
    
    // Play discard sound
    if (soundEnabled) {
      playSound('discard');
    }
    
    onDiscardCards(selectedCards);
    setSelectedCards([]);
    setHasDiscarded(true);
  };

  const handleDraw = (source: 'deck' | 'discard') => {
    if (!isMyTurn || !hasDiscarded) return;

    resumeContextIfNeeded();
    if (soundEnabled) {
      playSound('draw');
    }
    
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

  // Unified card reorder — works via mouse (desktop) and touch (mobile)
  const dragRef = useRef<{ cardId: string; moved: boolean } | null>(null);
  const dragStateRef = useRef({ draggedCardId: null as string | null, dragOverCardId: null as string | null });
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const findCardUnderPoint = useCallback((x: number, y: number): string | null => {
    if (!dragRef.current) return null;
    const srcEl = document.querySelector(`[data-card-id="${dragRef.current.cardId}"]`) as HTMLElement | null;
    if (srcEl) srcEl.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    if (srcEl) srcEl.style.visibility = '';
    const cardEl = el?.closest('[data-card-id]') as HTMLElement | null;
    return cardEl?.getAttribute('data-card-id') ?? null;
  }, []);

  const updateGhost = useCallback((x: number, y: number) => {
    if (!ghostRef.current) return;
    ghostRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -60%)`;
  }, []);

  const showGhost = useCallback((cardId: string, x: number, y: number) => {
    const srcEl = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement | null;
    if (!srcEl || ghostRef.current) return;
    const clone = srcEl.cloneNode(true) as HTMLDivElement;
    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.transform = `translate(${x}px, ${y}px) translate(-50%, -60%)`;
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.85';
    clone.style.filter = 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))';
    clone.style.transition = 'none';
    clone.removeAttribute('data-card-id');
    document.body.appendChild(clone);
    ghostRef.current = clone;
  }, []);

  const removeGhost = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  }, []);

  const handlePointerMove = useCallback((x: number, y: number) => {
    if (!dragRef.current) return;

    if (!dragRef.current.moved) {
      dragRef.current.moved = true;
      setDraggedCardId(dragRef.current.cardId);
      showGhost(dragRef.current.cardId, x, y);
    }

    updateGhost(x, y);

    const targetId = findCardUnderPoint(x, y);
    if (targetId && targetId !== dragRef.current.cardId) {
      setDragOverCardId(targetId);
      dragStateRef.current.dragOverCardId = targetId;
    }
  }, [findCardUnderPoint, showGhost, updateGhost]);

  const finishDrag = useCallback(() => {
    const ref = dragRef.current;
    const overCardId = dragStateRef.current.dragOverCardId;
    if (ref?.moved && overCardId && currentPlayer) {
      const hand = orderedHand;
      const srcIdx = hand.findIndex(c => c.id === ref.cardId);
      const tgtIdx = hand.findIndex(c => c.id === overCardId);
      if (srcIdx !== -1 && tgtIdx !== -1 && srcIdx !== tgtIdx) {
        const newOrder = hand.map(c => c.id);
        const [removed] = newOrder.splice(srcIdx, 1);
        newOrder.splice(tgtIdx, 0, removed);
        setLocalCardOrder(newOrder);
      }
    }
    removeGhost();
    dragRef.current = null;
    dragStateRef.current = { draggedCardId: null, dragOverCardId: null };
    setDraggedCardId(null);
    setDragOverCardId(null);
  }, [currentPlayer, orderedHand, setLocalCardOrder, removeGhost]);

  const handleCardPointerDown = useCallback((cardId: string) => {
    dragRef.current = { cardId, moved: false };
    dragStateRef.current.draggedCardId = cardId;
  }, []);

  // Global mouse listeners for desktop drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = () => { if (dragRef.current) finishDrag(); };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [handlePointerMove, finishDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current) return;
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [handlePointerMove]);

  const handleTouchEnd = useCallback(() => {
    if (dragRef.current) finishDrag();
  }, [finishDrag]);

  // Slot layout: top row 5 (turn order 1–5), left 2 (6–7), right 2 (8–9); order is anti-clockwise round-robin
  const topRowPlayers = otherPlayers.slice(0, 5);
  const leftColPlayers = otherPlayers.slice(5, 7);
  const rightColPlayers = otherPlayers.slice(7, 9);

  if (gameState.gamePhase === 'roundEnd' || gameState.gamePhase === 'gameEnd') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl w-full max-h-[95vh] overflow-y-auto">
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
            <h3 className="font-semibold mb-3">
              {gameState.gamePhase === 'gameEnd' ? 'Final Scores' : 'Round Results'}
            </h3>
            {(() => {
              const maxRounds = Math.max(...gameState.players.map(p => p.roundScores.length), 0);
              const whoShowed = lastRoundEndData?.showResult?.playerId;
              const sortedPlayers = gameState.players
                .slice()
                .sort((a, b) => a.totalScore - b.totalScore);

              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="px-3 py-2 text-left sticky left-0 bg-gray-100 z-10">Player</th>
                        {Array.from({ length: maxRounds }, (_, i) => (
                          <th key={i} className="px-2 py-2 text-center min-w-[40px]">R{i + 1}</th>
                        ))}
                        <th className="px-3 py-2 text-center font-bold bg-blue-50">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers.map((player, idx) => {
                        const isLeader = idx === 0 && !player.isEliminated;
                        return (
                          <tr
                            key={player.id}
                            className={`
                              border-b border-gray-200
                              ${isLeader ? 'bg-green-100 border-l-4 border-l-green-500' : ''}
                              ${player.isEliminated ? 'opacity-60 bg-gray-50' : ''}
                              ${!isLeader && !player.isEliminated ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
                            `}
                          >
                            <td className="px-3 py-3 font-semibold sticky left-0 bg-inherit z-10 whitespace-nowrap">
                              {isLeader && '🏆 '}
                              {player.name}
                              {whoShowed === player.id && (
                                <span className="ml-1 text-xs font-normal text-blue-600">(called show)</span>
                              )}
                              {player.isEliminated && ' ❌'}
                            </td>
                            {Array.from({ length: maxRounds }, (_, i) => (
                              <td key={i} className="px-2 py-3 text-center">
                                {player.roundScores[i] !== undefined ? (
                                  <span className={player.roundScores[i] === 0 ? 'text-green-600 font-bold' : ''}>
                                    {player.roundScores[i]}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            ))}
                            <td className="px-3 py-3 text-center font-bold bg-blue-50">{player.totalScore}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
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
    <div className="h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg p-2 sm:p-4 flex justify-between items-center z-10">
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

        <div className="flex gap-2">
          {gameState.hostId === playerId && onEndGameByHost && (
            <button
              onClick={() => {
                if (window.confirm('End game for everyone? All players will return to the lobby.')) {
                  onEndGameByHost();
                }
              }}
              className="bg-red-500/90 hover:bg-red-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base font-semibold transition-all"
              title="End game for everyone"
            >
              🚪 <span className="hidden sm:inline">Exit game</span>
            </button>
          )}
          <button
            onClick={() => {
              resumeContextIfNeeded(); // Unlock audio on first interaction (browser autoplay policy)
              setSoundEnabled(!soundEnabled);
            }}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base font-semibold transition-all"
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            onClick={() => setShowScoreboard(true)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base font-semibold transition-all"
          >
            📊 <span className="hidden sm:inline">Scoreboard</span>
          </button>
        </div>
      </div>

      {/* Board: top area grows to fill space above the bottom player panel, scrolls if needed */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {/* Top row: up to 5 players in anti-clockwise turn order (no empty placeholders) */}
        <div className="flex justify-center gap-1 sm:gap-2 px-1 sm:px-2 pt-3 sm:pt-4 shrink-0 min-h-[72px] sm:min-h-[80px]">
          {topRowPlayers.map((player) => (
            <div key={player.id} className="flex-1 min-w-0 max-w-[100px] sm:max-w-[120px] flex justify-center items-center">
              <PlayerAvatar
                player={player}
                isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                isYou={false}
                cardCount={player.hand.length}
                compact={otherPlayers.length > 5}
                extraCompact={otherPlayers.length > 7}
              />
            </div>
          ))}
        </div>

        {/* Middle: left 2 (when 6+ players) | center (deck + turn) | right 2 (when 8+ players); all in turn order */}
        <div className="flex items-start justify-center gap-2 sm:gap-4 px-2 pt-2 sm:pt-4 shrink-0">
          {/* Left column: 2 slots when we have 6+ other players (players 6–7 in anti-clockwise order) */}
          {leftColPlayers.length > 0 && (
            <div className="flex flex-col justify-center gap-2 sm:gap-4 w-14 sm:w-20 shrink-0">
              {leftColPlayers.map((player) => (
                <div key={player.id} className="flex justify-center">
                  <PlayerAvatar
                    player={player}
                    isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                    isYou={false}
                    cardCount={player.hand.length}
                    compact
                    extraCompact={otherPlayers.length > 7}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Center: Wild | Deck | Draw + turn message — sits right below top row, no big gap */}
          <div className="flex-1 min-w-0 flex flex-col items-center justify-start gap-2 sm:gap-3 max-w-lg">
            <div className="flex items-end justify-center gap-2 sm:gap-4 shrink-0">
              {gameState.wildCardRank && (
                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-600 whitespace-nowrap">Wild</div>
                  <Card
                    card={{ rank: gameState.wildCardRank, suit: 'hearts', value: 0, id: 'wild-display' }}
                    wildCardRank={gameState.wildCardRank}
                    size="medium"
                  />
                </div>
              )}
              <div
                onClick={() => handleDraw('deck')}
                className={`
                  relative w-16 h-24 bg-blue-900 rounded-lg border-2 border-white shadow-2xl
                  flex items-center justify-center text-white font-bold text-sm
                  ${isMyTurn && hasDiscarded ? 'cursor-pointer hover:scale-110 hover:shadow-blue-500/50' : 'opacity-60'}
                  transition-all duration-200
                `}
              >
                <div className="text-center">
                  <div className="text-2xl mb-0.5">🎴</div>
                  <div className="text-xs">{gameState.deck.length}</div>
                </div>
              </div>
              <div className="text-gray-700 text-xl sm:text-2xl font-bold mb-3">→</div>
              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                <div className="text-[10px] sm:text-xs font-semibold text-green-700 whitespace-nowrap">Draw Pile</div>
                <div
                  onClick={() => handleDraw('discard')}
                  className={`
                    relative
                    ${isMyTurn && hasDiscarded && gameState.discardPile.length > 0 ? 'cursor-pointer hover:scale-110 ring-2 ring-green-500 rounded-lg' : 'opacity-90'}
                    transition-all duration-200
                  `}
                >
                  {gameState.discardPile.length > 0 ? (
                    <Card card={gameState.discardPile[gameState.discardPile.length - 1]} wildCardRank={gameState.wildCardRank} size="medium" />
                  ) : (
                    <div className="w-16 h-24 bg-gray-300 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 text-[10px] text-center">Empty</div>
                  )}
                </div>
              </div>
              {gameState.currentTurnDiscardPile.length > 0 && (
                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                  <div className="text-[10px] sm:text-xs font-semibold text-orange-700 whitespace-nowrap">Just Discarded</div>
                  <div className="relative opacity-75">
                    <Card card={gameState.currentTurnDiscardPile[gameState.currentTurnDiscardPile.length - 1]} wildCardRank={gameState.wildCardRank} size="medium" />
                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                      {gameState.currentTurnDiscardPile.length}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Turn / action message only when it's your turn */}
            {isMyTurn && (
              <div className="w-full max-w-md rounded-lg bg-blue-100/90 border border-blue-200 px-3 py-2 text-center">
                {hasDiscarded ? (
                  canSkipDraw ? (
                    <span className="text-green-700 text-sm font-semibold">✅ Matching discard — turn passed</span>
                  ) : (
                    <span className="text-purple-700 text-sm font-semibold">👉 Draw from deck or discard pile</span>
                  )
                ) : handValue <= 10 ? (
                  <span className="text-green-700 text-sm font-semibold">🎯 Your turn — discard, or call SHOW (hand ≤ 10)</span>
                ) : (
                  <span className="text-blue-700 text-sm font-semibold">👉 Your turn — select cards and discard</span>
                )}
              </div>
            )}
          </div>

          {/* Right column: 2 slots when we have 8+ other players (players 8–9 in anti-clockwise order) */}
          {rightColPlayers.length > 0 && (
            <div className="flex flex-col justify-center gap-2 sm:gap-4 w-14 sm:w-20 shrink-0">
              {rightColPlayers.map((player) => (
                <div key={player.id} className="flex justify-center">
                  <PlayerAvatar
                    player={player}
                    isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                    isYou={false}
                    cardCount={player.hand.length}
                    compact
                    extraCompact
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Current Player — fixed at bottom of screen */}
      {currentPlayer && (
        <div className={`w-full shrink-0 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.15)] p-2 sm:p-3 ${
          isMyTurn ? 'turn-glow' : 'bg-white bg-opacity-95'
        }`}>
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

            {/* Cards */}
            <div className="flex justify-center items-end gap-0.5 sm:gap-1 mb-1 sm:mb-2 flex-wrap max-w-full px-1 pt-3">
              {(() => {
                const dragIdx = draggedCardId ? orderedHand.findIndex(c => c.id === draggedCardId) : -1;
                const overIdx = dragOverCardId ? orderedHand.findIndex(c => c.id === dragOverCardId) : -1;
                const insertBefore = dragIdx !== -1 && overIdx !== -1 && dragIdx > overIdx;

                return orderedHand.map((card) => {
                  const isBeingDragged = card.id === draggedCardId;
                  const isDropTarget = card.id === dragOverCardId;
                  const showInsertLeft = isDropTarget && insertBefore;
                  const showInsertRight = isDropTarget && !insertBefore;

                  let dragClass = '';
                  if (isBeingDragged) {
                    dragClass = 'opacity-40 scale-90';
                  } else if (isDropTarget) {
                    dragClass = `scale-105 ${showInsertLeft ? 'ml-6 sm:ml-8' : ''} ${showInsertRight ? 'mr-6 sm:mr-8' : ''}`;
                  }

                  return (
                    <div
                      key={card.id}
                      data-card-id={card.id}
                      onMouseDown={() => handleCardPointerDown(card.id)}
                      onTouchStart={() => handleCardPointerDown(card.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`touch-none select-none transition-all duration-200 ${dragClass}`}
                    >
                      <Card
                        card={card}
                        wildCardRank={gameState.wildCardRank}
                        isSelected={selectedCards.includes(card.id)}
                        onClick={() => handleCardClick(card.id)}
                        size="large"
                      />
                    </div>
                  );
                });
              })()}
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
                <span className="sm:hidden">Draw discard</span>
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

            <div className="h-5 sm:h-6 mt-1 flex items-center justify-center">
              {isMyTurn && !hasDiscarded && handValue > 10 && (
                <span className="text-blue-700 text-[10px] sm:text-xs font-semibold">
                  👉 Select and discard card(s) first
                </span>
              )}
              {isMyTurn && !hasDiscarded && handValue <= 10 && (
                <span className="text-green-700 text-[10px] sm:text-xs font-semibold animate-pulse">
                  🎯 You can call SHOW now (hand ≤ 10) or discard to continue
                </span>
              )}
              {isMyTurn && hasDiscarded && canSkipDraw && (
                <span className="text-green-700 text-[10px] sm:text-xs font-semibold">
                  ✅ Matching discard! Turn automatically passed.
                </span>
              )}
              {isMyTurn && hasDiscarded && !canSkipDraw && (
                <span className="text-purple-700 text-[10px] sm:text-xs font-semibold">
                  👉 Now draw a card from deck or discard pile
                </span>
              )}
            </div>
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
