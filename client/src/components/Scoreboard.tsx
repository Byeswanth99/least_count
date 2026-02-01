import { GameState } from '../types/game';

interface ScoreboardProps {
  gameState: GameState;
  onClose: () => void;
}

export function Scoreboard({ gameState, onClose }: ScoreboardProps) {
  const maxRounds = Math.max(...gameState.players.map(p => p.roundScores.length));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">📊 Scoreboard</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 text-sm text-gray-600">
            <div className="font-semibold">Game Settings:</div>
            {gameState.settings.endConditionType === 'pointLimit' ? (
              <div>Point Limit: {gameState.settings.pointLimit} points</div>
            ) : (
              <div>Total Rounds: {gameState.settings.roundLimit}</div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left sticky left-0 bg-gray-100">Player</th>
                  {Array.from({ length: maxRounds }, (_, i) => (
                    <th key={i} className="px-4 py-2 text-center">R{i + 1}</th>
                  ))}
                  <th className="px-4 py-2 text-center font-bold bg-blue-50">Total</th>
                </tr>
              </thead>
              <tbody>
                {gameState.players
                  .slice()
                  .sort((a, b) => a.totalScore - b.totalScore)
                  .map((player, idx) => (
                    <tr
                      key={player.id}
                      className={`
                        border-b
                        ${player.isEliminated ? 'bg-red-50 text-red-800' : ''}
                        ${idx === 0 && !player.isEliminated ? 'bg-green-50' : ''}
                      `}
                    >
                      <td className="px-4 py-2 font-semibold sticky left-0 bg-white">
                        {idx === 0 && !player.isEliminated && '🏆 '}
                        {player.name}
                        {player.isEliminated && ' ❌'}
                      </td>
                      {Array.from({ length: maxRounds }, (_, i) => (
                        <td key={i} className="px-4 py-2 text-center">
                          {player.roundScores[i] !== undefined ? (
                            <span className={player.roundScores[i] === 0 ? 'text-green-600 font-bold' : ''}>
                              {player.roundScores[i]}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center font-bold bg-blue-50">
                        {player.totalScore}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
