import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { GameBoard } from './components/GameBoard';
import { GameState, GameSettings, RoundEndData } from './types/game';

const SESSION_KEY = 'least_count_session';

type Session = { roomCode: string; playerToken: string; playerName: string };
type AppState = 'lobby' | 'waitingRoom' | 'playing';

// Use sessionStorage (per-tab) so multiple tabs keep separate game sessions
function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
function saveSession(s: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function App() {
  const { socket, isConnected } = useSocket();
  const [appState, setAppState] = useState<AppState>('lobby');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [lastRoundEndData, setLastRoundEndData] = useState<RoundEndData | null>(null);

  useEffect(() => {
    if (!socket) return;

    const tryRejoin = () => {
      const session = getSession();
      if (!session?.roomCode || !session?.playerToken) return;
      let settled = false;
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (ok) return;
        clearSession();
        setGameState(null);
        setAppState('lobby');
      };
      const timer = setTimeout(() => settle(false), 120000); // 2 min timeout so we don't stay stuck if server never responds
      socket.emit('rejoinRoom', { roomCode: session.roomCode, playerToken: session.playerToken }, (response: any) => {
        if (response?.success && response?.gameState) {
          settle(true);
          setGameState(response.gameState);
          setAppState(response.gameState.gamePhase === 'lobby' ? 'waitingRoom' : 'playing');
        } else {
          settle(false);
        }
      });
    };

    const handleConnect = () => {
      setPlayerId(socket.id || '');
      tryRejoin();
    };

    if (socket.connected) {
      setPlayerId(socket.id || '');
      tryRejoin();
    }

    socket.on('connect', handleConnect);

    // Player joined
    socket.on('playerJoined', (data) => {
      setGameState(prevState => {
        if (!prevState) return prevState;
        return { ...prevState, players: data.players };
      });
    });

    // Player left
    socket.on('playerLeft', (data) => {
      setGameState(prevState => {
        if (!prevState) return prevState;
        return { ...prevState, players: data.players };
      });
    });

    // Game started
    socket.on('gameStarted', (data) => {
      setGameState(data.gameState);
      setAppState('playing');
    });

    // Game state update
    socket.on('gameStateUpdate', (data) => {
      setGameState(data.gameState);
      // Clear round-end snapshot when moving to next round
      if (data.gameState?.gamePhase === 'playing') {
        setLastRoundEndData(null);
      }
    });

    // Round ended – keep snapshot for the round-complete scorecard
    socket.on('roundEnded', (data: RoundEndData) => {
      console.log('Round ended:', data);
      setLastRoundEndData(data);
    });

    // Game ended – clear session so we don't attempt rejoin to a removed room
    socket.on('gameEnded', () => {
      clearSession();
    });

    // Host ended game – return everyone to lobby and clear data
    socket.on('gameEndedByHost', () => {
      clearSession();
      setGameState(null);
      setAppState('lobby');
    });

    // Turn timeout
    socket.on('turnTimeout', (data) => {
      console.log('Turn timeout for:', data.playerName);
    });

    // Player disconnected
    socket.on('playerDisconnected', (data) => {
      console.log('Player disconnected:', data.playerId);
    });

    // Player reconnected (e.g. after refresh) – update player list
    socket.on('playerReconnected', (data: { players: GameState['players'] }) => {
      setGameState(prev => prev ? { ...prev, players: data.players } : null);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('gameStarted');
      socket.off('gameStateUpdate');
      socket.off('roundEnded');
      socket.off('gameEnded');
      socket.off('gameEndedByHost');
      socket.off('turnTimeout');
      socket.off('playerDisconnected');
      socket.off('playerReconnected');
    };
  }, [socket]); // Removed gameState dependency to prevent re-registration

  const handleCreateRoom = (playerName: string, settings: GameSettings) => {
    if (!socket) return;

    socket.emit('createRoom', { playerName, settings }, (response: any) => {
      if (response.success) {
        if (response.playerToken) saveSession({ roomCode: response.roomCode, playerToken: response.playerToken, playerName });
        setGameState(response.gameState);
        setAppState('waitingRoom');
      } else {
        alert(response.error || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = (playerName: string, roomCode: string) => {
    if (!socket) return;

    socket.emit('joinRoom', { playerName, roomCode }, (response: any) => {
      if (response.success) {
        if (response.playerToken) saveSession({ roomCode, playerToken: response.playerToken, playerName });
        setGameState(response.gameState);
        setAppState('waitingRoom');
      } else {
        alert(response.error || 'Failed to join room');
      }
    });
  };

  const handleStartGame = () => {
    if (!socket) return;

    socket.emit('startGame', (response: any) => {
      if (!response.success) {
        alert(response.error || 'Failed to start game');
      }
    });
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    clearSession();
    socket.emit('leaveRoom');
    setAppState('lobby');
    setGameState(null);
  };

  const handleDrawCard = (source: 'deck' | 'discard') => {
    if (!socket) return;

    socket.emit('drawCard', { source }, (response: any) => {
      if (!response.success) {
        console.error('Draw failed:', response.error);
      }
    });
  };

  const handleDiscardCards = (cardIds: string[]) => {
    if (!socket) return;

    socket.emit('discardCards', { cardIds }, (response: any) => {
      if (!response.success) {
        console.error('Discard failed:', response.error);
        alert(response.error || 'Failed to discard cards');
      }
    });
  };

  const handleCallShow = () => {
    if (!socket) return;
    
    socket.emit('callShow', (response: any) => {
      if (!response.success) {
        alert('Show failed: ' + (response.error || 'Cannot call show'));
      }
    });
  };

  const handleStartNextRound = () => {
    if (!socket) return;

    socket.emit('startNextRound', (response: any) => {
      if (!response.success) {
        console.error('Start next round failed:', response.error);
      }
    });
  };

  const handleEndGameByHost = () => {
    if (!socket) return;
    socket.emit('endGameByHost', (response: any) => {
      if (response?.success) {
        clearSession();
        setGameState(null);
        setAppState('lobby');
      } else if (response?.error) {
        alert(response.error);
      }
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-4xl mb-4">🎴</div>
          <div className="text-xl font-bold text-gray-800">Connecting to server...</div>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'lobby') {
    return <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  if (appState === 'waitingRoom' && gameState) {
    return (
      <WaitingRoom
        gameState={gameState}
        playerId={playerId}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (appState === 'playing' && gameState) {
    return (
      <GameBoard
        gameState={gameState}
        playerId={playerId}
        lastRoundEndData={lastRoundEndData}
        onDrawCard={handleDrawCard}
        onDiscardCards={handleDiscardCards}
        onCallShow={handleCallShow}
        onStartNextRound={handleStartNextRound}
        onEndGameByHost={handleEndGameByHost}
      />
    );
  }

  return null;
}

export default App;
