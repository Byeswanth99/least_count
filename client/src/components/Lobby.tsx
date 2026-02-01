import { useState } from 'react';
import { GameSettings, EndConditionType } from '../types/game';

interface LobbyProps {
  onCreateRoom: (playerName: string, settings: GameSettings) => void;
  onJoinRoom: (playerName: string, roomCode: string) => void;
}

export function Lobby({ onCreateRoom, onJoinRoom }: LobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [endConditionType, setEndConditionType] = useState<EndConditionType>('pointLimit');
  const [pointLimit, setPointLimit] = useState(200);
  const [roundLimit, setRoundLimit] = useState(5);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerDuration, setTimerDuration] = useState(30);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    const settings: GameSettings = {
      endConditionType,
      pointLimit,
      roundLimit,
      timerEnabled,
      timerDuration
    };

    onCreateRoom(playerName.trim(), settings);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      alert('Please enter room code');
      return;
    }

    onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase());
  };

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎴 Least Count</h1>
            <p className="text-gray-600">The Ultimate Card Game</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Create New Game
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
            >
              Join Existing Game
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
            <h3 className="font-semibold mb-2">How to Play:</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Get dealt 7 cards each round</li>
              <li>Draw and discard to minimize your hand value</li>
              <li>Call "Show" when your hand is ≤ 10</li>
              <li>Lowest score wins!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <button
            onClick={() => setMode('menu')}
            className="text-gray-600 hover:text-gray-800 mb-4"
          >
            ← Back
          </button>

          <h2 className="text-3xl font-bold text-gray-800 mb-6">Create Game</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Game End Condition
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="pointLimit"
                    checked={endConditionType === 'pointLimit'}
                    onChange={(e) => setEndConditionType(e.target.value as EndConditionType)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Point Limit</div>
                    <div className="text-xs text-gray-600">Players eliminated at limit</div>
                  </div>
                </label>

                {endConditionType === 'pointLimit' && (
                  <input
                    type="number"
                    value={pointLimit}
                    onChange={(e) => setPointLimit(parseInt(e.target.value) || 200)}
                    min={50}
                    max={500}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg ml-8"
                  />
                )}

                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="roundLimit"
                    checked={endConditionType === 'roundLimit'}
                    onChange={(e) => setEndConditionType(e.target.value as EndConditionType)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Round Limit</div>
                    <div className="text-xs text-gray-600">Lowest score after X rounds wins</div>
                  </div>
                </label>

                {endConditionType === 'roundLimit' && (
                  <input
                    type="number"
                    value={roundLimit}
                    onChange={(e) => setRoundLimit(parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg ml-8"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Turn Timer
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={timerEnabled}
                    onChange={(e) => setTimerEnabled(e.target.checked)}
                    className="mr-3 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Enable Turn Timer</div>
                    <div className="text-xs text-gray-600">Auto-play if time runs out</div>
                  </div>
                </label>

                {timerEnabled && (
                  <div className="ml-8">
                    <label className="block text-xs text-gray-600 mb-1">Duration (seconds)</label>
                    <input
                      type="number"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
                      min={10}
                      max={120}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      placeholder="30"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <button
          onClick={() => setMode('menu')}
          className="text-gray-600 hover:text-gray-800 mb-4"
        >
          ← Back
        </button>

        <h2 className="text-3xl font-bold text-gray-800 mb-6">Join Game</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none uppercase text-center text-2xl tracking-widest font-bold"
            />
          </div>

          <button
            onClick={handleJoinRoom}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
