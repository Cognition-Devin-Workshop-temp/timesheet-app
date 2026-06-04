import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function EnemyShip({ position, id, onOutOfBounds, zigzag }) {
  const meshRef = useRef()
  const time = useRef(Math.random() * Math.PI * 2)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    time.current += delta * 3

    // Move toward player (forward)
    meshRef.current.position.z += 0.08

    // Zigzag movement
    if (zigzag) {
      meshRef.current.position.x += Math.sin(time.current) * 0.03
    }

    // Slight rotation for visual effect
    meshRef.current.rotation.z = Math.sin(time.current) * 0.1

    if (meshRef.current.position.z > 15) {
      onOutOfBounds(id)
    }
  })

  return (
    <group ref={meshRef} position={position}>
      {/* Enemy body - TIE fighter inspired */}
      <mesh>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Side panels */}
      <mesh position={[-0.7, 0, 0]}>
        <boxGeometry args={[0.05, 1.2, 0.8]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0.7, 0, 0]}>
        <boxGeometry args={[0.05, 1.2, 0.8]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Connecting struts */}
      <mesh position={[-0.35, 0, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 4]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[0.35, 0, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 4]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Red engine glow */}
      <mesh position={[0, 0, 0.4]}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <pointLight position={[0, 0, 0]} color="#ff0000" intensity={1} distance={2} />
    </group>
  )
}
