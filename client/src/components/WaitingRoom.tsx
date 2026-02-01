import { GameState } from '../types/game';

interface WaitingRoomProps {
  gameState: GameState;
  playerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function WaitingRoom({ gameState, playerId, onStartGame, onLeaveRoom }: WaitingRoomProps) {
  const isHost = gameState.hostId === playerId;
  const canStart = gameState.players.length >= 2 && gameState.players.length <= 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🎴 Waiting Room</h2>
          <div className="bg-gray-100 inline-block px-6 py-3 rounded-lg">
            <div className="text-sm text-gray-600">Room Code</div>
            <div className="text-3xl font-bold text-blue-600 tracking-widest">
              {gameState.roomCode}
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm font-semibold text-gray-700 mb-2">Game Settings:</div>
          {gameState.settings.endConditionType === 'pointLimit' ? (
            <div className="text-sm text-gray-600">
              🎯 Point Limit: <span className="font-semibold">{gameState.settings.pointLimit} points</span>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              🔄 Round Limit: <span className="font-semibold">{gameState.settings.roundLimit} rounds</span>
            </div>
          )}
          <div className="text-sm text-gray-600 mt-1">
            ⏱️ Turn Timer: <span className="font-semibold">
              {gameState.settings.timerEnabled 
                ? `${gameState.settings.timerDuration} seconds` 
                : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-700">
              Players ({gameState.players.length}/10)
            </h3>
            {!canStart && (
              <div className="text-xs text-red-600">Need 2-10 players</div>
            )}
          </div>

          <div className="space-y-2">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`
                  p-4 rounded-lg flex items-center justify-between
                  ${player.id === playerId ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {player.name}
                      {player.id === playerId && ' (You)'}
                    </div>
                    {player.isHost && (
                      <div className="text-xs text-yellow-600 font-semibold">👑 Host</div>
                    )}
                  </div>
                </div>
                <div className="text-green-600">●</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`
                w-full py-3 rounded-lg font-semibold text-white transition-all shadow-lg
                ${canStart
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
                  : 'bg-gray-400 cursor-not-allowed'
                }
              `}
            >
              {canStart ? 'Start Game' : 'Need 2-10 Players to Start'}
            </button>
          ) : (
            <div className="text-center text-gray-600 py-3 bg-gray-100 rounded-lg">
              Waiting for host to start the game...
            </div>
          )}

          <button
            onClick={onLeaveRoom}
            className="w-full py-3 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
