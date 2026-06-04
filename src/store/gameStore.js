import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  gameState: 'start', // 'start' | 'playing' | 'gameover'
  score: 0,
  health: 100,
  highScore: 0,

  startGame: () => set({ gameState: 'playing', score: 0, health: 100 }),

  gameOver: () => {
    const { score, highScore } = get()
    set({
      gameState: 'gameover',
      highScore: Math.max(score, highScore),
    })
  },

  addScore: (points) => set((state) => ({ score: state.score + points })),

  takeDamage: (damage) => {
    const newHealth = Math.max(0, get().health - damage)
    set({ health: newHealth })
    if (newHealth <= 0) {
      get().gameOver()
    }
  },
}))
