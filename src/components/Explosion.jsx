import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Explosion({ position, id, onComplete }) {
  const groupRef = useRef()
  const life = useRef(0)
  const maxLife = 40

  const particles = useMemo(() => {
    return Array.from({ length: 12 }, () => ({
      velocity: [
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
      ],
      scale: Math.random() * 0.3 + 0.1,
    }))
  }, [])

  useFrame(() => {
    if (!groupRef.current) return
    life.current++

    const progress = life.current / maxLife
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i]
      if (p) {
        child.position.x += p.velocity[0]
        child.position.y += p.velocity[1]
        child.position.z += p.velocity[2]
        const scale = (1 - progress) * p.scale
        child.scale.setScalar(Math.max(0, scale))
      }
    })

    if (life.current >= maxLife) {
      onComplete(id)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {particles.map((p, i) => (
        <mesh key={i} scale={p.scale}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#ff6600' : '#ffcc00'}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  )
}
