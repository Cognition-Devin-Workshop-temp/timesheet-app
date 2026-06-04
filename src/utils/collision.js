import * as THREE from 'three'

const _box1 = new THREE.Box3()
const _box2 = new THREE.Box3()

export function checkCollision(obj1Pos, obj1Size, obj2Pos, obj2Size) {
  _box1.setFromCenterAndSize(obj1Pos, obj1Size)
  _box2.setFromCenterAndSize(obj2Pos, obj2Size)
  return _box1.intersectsBox(_box2)
}

export function checkSphereCollision(pos1, radius1, pos2, radius2) {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  const dz = pos1.z - pos2.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  return dist < radius1 + radius2
}

export const PLAYER_SIZE = new THREE.Vector3(1.5, 0.5, 2)
export const ENEMY_SIZE = new THREE.Vector3(1.2, 0.5, 1.5)
export const LASER_SIZE = new THREE.Vector3(0.1, 0.1, 1)
