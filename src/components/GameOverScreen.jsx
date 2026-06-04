import { useGameStore } from '../store/gameStore'

export default function GameOverScreen() {
  const score = useGameStore((s) => s.score)
  const highScore = useGameStore((s) => s.highScore)
  const startGame = useGameStore((s) => s.startGame)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/85">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-red-500 mb-6 tracking-wider"
            style={{ textShadow: '0 0 20px rgba(255, 0, 0, 0.5)' }}>
          GAME OVER
        </h1>

        <div className="space-y-3 mb-10">
          <p className="text-yellow-400 text-2xl">
            SCORE: {score.toLocaleString()}
          </p>
          <p className="text-gray-400 text-lg">
            BEST: {highScore.toLocaleString()}
          </p>
        </div>

        <button
          onClick={startGame}
          className="px-10 py-4 bg-transparent border-2 border-yellow-400 text-yellow-400
                     text-xl font-bold tracking-wider rounded-sm cursor-pointer
                     hover:bg-yellow-400 hover:text-black transition-all duration-300
                     hover:shadow-[0_0_30px_rgba(255,200,0,0.5)]"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  )
}
