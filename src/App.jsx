import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import StartScreen from './components/StartScreen'
import GameOverScreen from './components/GameOverScreen'
import { useGameStore } from './store/gameStore'

export default function App() {
  const gameState = useGameStore((s) => s.gameState)

  return (
    <div className="relative w-full h-full">
      <GameCanvas />

      {gameState === 'playing' && <HUD />}
      {gameState === 'start' && <StartScreen />}
      {gameState === 'gameover' && <GameOverScreen />}
    </div>
  )
}
