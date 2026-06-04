import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { LASER_SPEED } from '../utils/constants'

export default function Laser({ position, id, onOutOfBounds, positionRef }) {
  const meshRef = useRef()

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.z -= LASER_SPEED

    if (positionRef) {
      positionRef.current = meshRef.current.position
    }

    if (meshRef.current.position.z < -60) {
      onOutOfBounds(id)
    }
  })

  return (
    <group ref={meshRef} position={position}>
      <mesh>
        <boxGeometry args={[0.05, 0.05, 1.0]} />
        <meshBasicMaterial color="#00ff44" />
      </mesh>
      <mesh>
        <boxGeometry args={[0.12, 0.12, 1.2]} />
        <meshBasicMaterial color="#00ff44" transparent opacity={0.3} />
      </mesh>
      <pointLight color="#00ff44" intensity={2} distance={3} />
    </group>
  )
}
