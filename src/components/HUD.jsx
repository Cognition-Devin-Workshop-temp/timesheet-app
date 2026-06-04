import { useGameStore } from '../store/gameStore'

export default function HUD() {
  const score = useGameStore((s) => s.score)
  const health = useGameStore((s) => s.health)

  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-none z-10">
      {/* Score */}
      <div className="text-yellow-400 text-xl font-bold tracking-wider">
        <span className="text-gray-400 text-sm mr-2">SCORE</span>
        {score.toLocaleString()}
      </div>

      {/* Health Bar */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">SHIELD</span>
        <div className="w-48 h-4 bg-gray-800 border border-gray-600 rounded-sm overflow-hidden">
          <div
            className="h-full transition-all duration-200 rounded-sm"
            style={{
              width: `${health}%`,
              backgroundColor: health > 60 ? '#00ff88' : health > 30 ? '#ffaa00' : '#ff3333',
              boxShadow: `0 0 10px ${health > 60 ? '#00ff88' : health > 30 ? '#ffaa00' : '#ff3333'}`,
            }}
          />
        </div>
        <span className="text-white text-sm w-10">{health}%</span>
      </div>
    </div>
  )
}
