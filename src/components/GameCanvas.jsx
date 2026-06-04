import { Canvas } from '@react-three/fiber'
import GameScene from './GameScene'

export default function GameCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 2, 10], fov: 75 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#000011' }}
    >
      <fog attach="fog" args={['#000011', 30, 100]} />
      <GameScene />
    </Canvas>
  )
}
