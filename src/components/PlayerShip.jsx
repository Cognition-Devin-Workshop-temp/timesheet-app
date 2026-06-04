import { useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLAYER_SPEED, PLAYER_INERTIA, BOUNDS_X, BOUNDS_Y } from '../utils/constants'

export default function PlayerShip({ onShoot, playerRef }) {
  const meshRef = useRef()
  const velocity = useRef({ x: 0, y: 0 })
  const keys = useRef({})

  const handleKeyDown = useCallback((e) => {
    keys.current[e.key.toLowerCase()] = true
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      onShoot()
    }
  }, [onShoot])

  const handleKeyUp = useCallback((e) => {
    keys.current[e.key.toLowerCase()] = false
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useFrame(() => {
    if (!meshRef.current) return

    const k = keys.current
    if (k['arrowleft'] || k['a']) velocity.current.x -= PLAYER_SPEED
    if (k['arrowright'] || k['d']) velocity.current.x += PLAYER_SPEED
    if (k['arrowup'] || k['w']) velocity.current.y += PLAYER_SPEED
    if (k['arrowdown'] || k['s']) velocity.current.y -= PLAYER_SPEED

    velocity.current.x *= PLAYER_INERTIA
    velocity.current.y *= PLAYER_INERTIA

    meshRef.current.position.x += velocity.current.x
    meshRef.current.position.y += velocity.current.y

    meshRef.current.position.x = THREE.MathUtils.clamp(
      meshRef.current.position.x, -BOUNDS_X, BOUNDS_X
    )
    meshRef.current.position.y = THREE.MathUtils.clamp(
      meshRef.current.position.y, -BOUNDS_Y, BOUNDS_Y
    )

    // Slight tilt based on movement
    meshRef.current.rotation.z = -velocity.current.x * 0.3
    meshRef.current.rotation.x = velocity.current.y * 0.1

    if (playerRef) {
      playerRef.current = meshRef.current.position
    }
  })

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      {/* Main body */}
      <mesh>
        <coneGeometry args={[0.3, 2, 4]} />
        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wings */}
      <mesh position={[-1, 0, 0.3]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[1, 0, 0.3]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, 0, 1.2]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ff4400" />
      </mesh>
      <pointLight position={[0, 0, 1.2]} color="#ff6600" intensity={2} distance={3} />
      {/* Wing tip engines */}
      <mesh position={[-1.1, 0, 0.7]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color="#ff4400" />
      </mesh>
      <mesh position={[1.1, 0, 0.7]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color="#ff4400" />
      </mesh>
    </group>
  )
}
