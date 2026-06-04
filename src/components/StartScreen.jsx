import { useGameStore } from '../store/gameStore'

export default function StartScreen() {
  const startGame = useGameStore((s) => s.startGame)
  const highScore = useGameStore((s) => s.highScore)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-yellow-400 mb-2 tracking-widest"
            style={{ textShadow: '0 0 20px rgba(255, 200, 0, 0.5)' }}>
          STAR WARS
        </h1>
        <h2 className="text-2xl text-blue-300 mb-12 tracking-wider">
          SPACE BATTLE
        </h2>

        {highScore > 0 && (
          <p className="text-yellow-300 text-lg mb-6">
            HIGH SCORE: {highScore.toLocaleString()}
          </p>
        )}

        <button
          onClick={startGame}
          className="px-10 py-4 bg-transparent border-2 border-yellow-400 text-yellow-400
                     text-xl font-bold tracking-wider rounded-sm cursor-pointer
                     hover:bg-yellow-400 hover:text-black transition-all duration-300
                     hover:shadow-[0_0_30px_rgba(255,200,0,0.5)]"
        >
          START GAME
        </button>

        <div className="mt-10 text-gray-500 text-sm space-y-1">
          <p>WASD / Arrow Keys — Move</p>
          <p>SPACE — Shoot</p>
        </div>
      </div>
    </div>
  )
}
