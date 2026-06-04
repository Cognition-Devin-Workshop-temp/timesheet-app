import { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import PlayerShip from './PlayerShip'
import EnemyShip from './EnemyShip'
import Laser from './Laser'
import Explosion from './Explosion'
import Starfield from './Starfield'
import { useGameStore } from '../store/gameStore'
import { checkSphereCollision } from '../utils/collision'
import {
  BOUNDS_X,
  BOUNDS_Y,
  ENEMY_SPAWN_RATE,
  SCORE_PER_KILL,
  DAMAGE_PER_HIT,
  MAX_LASERS,
  MAX_ENEMIES,
} from '../utils/constants'

let nextId = 0
function getId() {
  return nextId++
}

export default function GameScene() {
  const [lasers, setLasers] = useState([])
  const [enemies, setEnemies] = useState([])
  const [explosions, setExplosions] = useState([])
  const playerRef = useRef(new THREE.Vector3())
  const frameCount = useRef(0)
  const gameState = useGameStore((s) => s.gameState)
  const addScore = useGameStore((s) => s.addScore)
  const takeDamage = useGameStore((s) => s.takeDamage)

  const handleShoot = useCallback(() => {
    setLasers((prev) => {
      if (prev.length >= MAX_LASERS) return prev
      const pos = playerRef.current
      return [
        ...prev,
        { id: getId(), position: [pos.x - 0.5, pos.y, pos.z - 1] },
        { id: getId(), position: [pos.x + 0.5, pos.y, pos.z - 1] },
      ]
    })
  }, [])

  const removeLaser = useCallback((id) => {
    setLasers((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const removeEnemy = useCallback((id) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id))
  }, [])

  useFrame(() => {
    if (gameState !== 'playing') return

    frameCount.current++

    // Spawn enemies with increasing difficulty
    const spawnRate = Math.max(20, ENEMY_SPAWN_RATE - Math.floor(frameCount.current / 300))
    if (frameCount.current % spawnRate === 0 && enemies.length < MAX_ENEMIES) {
      const x = (Math.random() - 0.5) * BOUNDS_X * 2
      const y = (Math.random() - 0.5) * BOUNDS_Y * 1.5
      setEnemies((prev) => [
        ...prev,
        {
          id: getId(),
          position: [x, y, -50],
          zigzag: Math.random() > 0.5,
        },
      ])
    }
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, -5]} intensity={0.8} />

      <Starfield />

      {gameState === 'playing' && (
        <>
          <PlayerShip onShoot={handleShoot} playerRef={playerRef} />

          {lasers.map((laser) => (
            <LaserWrapper
              key={laser.id}
              laser={laser}
              onRemoveLaser={removeLaser}
              onRemoveEnemy={removeEnemy}
              onAddExplosion={(pos) =>
                setExplosions((prev) => [...prev, { id: getId(), position: pos }])
              }
              onAddScore={() => addScore(SCORE_PER_KILL)}
            />
          ))}

          {enemies.map((enemy) => (
            <EnemyWrapper
              key={enemy.id}
              enemy={enemy}
              playerPos={playerRef}
              onRemoveEnemy={removeEnemy}
              onDamage={() => takeDamage(DAMAGE_PER_HIT)}
              onAddExplosion={(pos) =>
                setExplosions((prev) => [...prev, { id: getId(), position: pos }])
              }
            />
          ))}

          {explosions.map((exp) => (
            <Explosion
              key={exp.id}
              id={exp.id}
              position={exp.position}
              onComplete={removeExplosion}
            />
          ))}
        </>
      )}

      {/* Distant planet for atmosphere */}
      <mesh position={[20, -10, -80]}>
        <sphereGeometry args={[15, 32, 32]} />
        <meshStandardMaterial color="#553322" roughness={0.9} />
      </mesh>
      <mesh position={[-30, 15, -100]}>
        <sphereGeometry args={[8, 24, 24]} />
        <meshStandardMaterial color="#224455" roughness={0.8} />
      </mesh>
    </>
  )
}

function LaserWrapper({ laser, onRemoveLaser, onRemoveEnemy, onAddExplosion, onAddScore }) {
  const meshRef = useRef()

  useFrame(() => {
    if (!meshRef.current) return
    const laserPos = meshRef.current.position

    // Check collision with each enemy by traversing parent scene
    const scene = meshRef.current.parent
    if (!scene) return

    scene.traverse((obj) => {
      if (obj.userData.enemyId !== undefined) {
        const enemyPos = obj.position
        if (checkSphereCollision(laserPos, 0.5, enemyPos, 0.8)) {
          onRemoveLaser(laser.id)
          onRemoveEnemy(obj.userData.enemyId)
          onAddExplosion([enemyPos.x, enemyPos.y, enemyPos.z])
          onAddScore()
        }
      }
    })
  })

  return (
    <group ref={meshRef} userData={{ type: 'laser', laserId: laser.id }}>
      <Laser
        position={laser.position}
        id={laser.id}
        onOutOfBounds={onRemoveLaser}
      />
    </group>
  )
}

function EnemyWrapper({ enemy, playerPos, onRemoveEnemy, onDamage, onAddExplosion }) {
  const meshRef = useRef()

  useFrame(() => {
    if (!meshRef.current || !playerPos.current) return
    const enemyPos = meshRef.current.position

    // Check collision with player
    if (checkSphereCollision(enemyPos, 0.8, playerPos.current, 1.0)) {
      onRemoveEnemy(enemy.id)
      onAddExplosion([enemyPos.x, enemyPos.y, enemyPos.z])
      onDamage()
    }
  })

  return (
    <group ref={meshRef} userData={{ type: 'enemy', enemyId: enemy.id }}>
      <EnemyShip
        position={enemy.position}
        id={enemy.id}
        zigzag={enemy.zigzag}
        onOutOfBounds={onRemoveEnemy}
      />
    </group>
  )
}
