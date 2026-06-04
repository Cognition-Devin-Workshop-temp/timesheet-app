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
  const laserRefs = useRef({})
  const enemyRefs = useRef({})
  const gameState = useGameStore((s) => s.gameState)
  const addScore = useGameStore((s) => s.addScore)
  const takeDamage = useGameStore((s) => s.takeDamage)

  const handleShoot = useCallback(() => {
    setLasers((prev) => {
      if (prev.length >= MAX_LASERS) return prev
      const pos = playerRef.current
      const id1 = getId()
      const id2 = getId()
      laserRefs.current[id1] = { current: null }
      laserRefs.current[id2] = { current: null }
      return [
        ...prev,
        { id: id1, position: [pos.x - 0.5, pos.y, pos.z - 1] },
        { id: id2, position: [pos.x + 0.5, pos.y, pos.z - 1] },
      ]
    })
  }, [])

  const removeLaser = useCallback((id) => {
    setLasers((prev) => prev.filter((l) => l.id !== id))
    delete laserRefs.current[id]
  }, [])

  const removeEnemy = useCallback((id) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id))
    delete enemyRefs.current[id]
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
      const id = getId()
      enemyRefs.current[id] = { current: null }
      setEnemies((prev) => [
        ...prev,
        {
          id,
          position: [x, y, -50],
          zigzag: Math.random() > 0.5,
        },
      ])
    }

    // Collision detection: lasers vs enemies
    const laserIds = Object.keys(laserRefs.current)
    const enemyIds = Object.keys(enemyRefs.current)
    const lasersToRemove = new Set()
    const enemiesToRemove = new Set()
    const newExplosions = []

    for (const lid of laserIds) {
      const laserPos = laserRefs.current[lid]?.current
      if (!laserPos) continue

      for (const eid of enemyIds) {
        if (enemiesToRemove.has(eid)) continue
        const enemyPos = enemyRefs.current[eid]?.current
        if (!enemyPos) continue

        if (checkSphereCollision(laserPos, 0.5, enemyPos, 0.8)) {
          lasersToRemove.add(lid)
          enemiesToRemove.add(eid)
          newExplosions.push({
            id: getId(),
            position: [enemyPos.x, enemyPos.y, enemyPos.z],
          })
          addScore(SCORE_PER_KILL)
          break
        }
      }
    }

    // Collision detection: enemies vs player
    const pPos = playerRef.current
    for (const eid of enemyIds) {
      if (enemiesToRemove.has(eid)) continue
      const enemyPos = enemyRefs.current[eid]?.current
      if (!enemyPos) continue

      if (checkSphereCollision(pPos, 1.0, enemyPos, 0.8)) {
        enemiesToRemove.add(eid)
        newExplosions.push({
          id: getId(),
          position: [enemyPos.x, enemyPos.y, enemyPos.z],
        })
        takeDamage(DAMAGE_PER_HIT)
      }
    }

    // Apply removals
    if (lasersToRemove.size > 0) {
      setLasers((prev) => prev.filter((l) => !lasersToRemove.has(String(l.id))))
      for (const id of lasersToRemove) delete laserRefs.current[id]
    }
    if (enemiesToRemove.size > 0) {
      setEnemies((prev) => prev.filter((e) => !enemiesToRemove.has(String(e.id))))
      for (const id of enemiesToRemove) delete enemyRefs.current[id]
    }
    if (newExplosions.length > 0) {
      setExplosions((prev) => [...prev, ...newExplosions])
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
            <Laser
              key={laser.id}
              id={laser.id}
              position={laser.position}
              onOutOfBounds={removeLaser}
              positionRef={laserRefs.current[laser.id]}
            />
          ))}

          {enemies.map((enemy) => (
            <EnemyShip
              key={enemy.id}
              id={enemy.id}
              position={enemy.position}
              zigzag={enemy.zigzag}
              onOutOfBounds={removeEnemy}
              positionRef={enemyRefs.current[enemy.id]}
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

      {/* Distant planets for atmosphere */}
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
