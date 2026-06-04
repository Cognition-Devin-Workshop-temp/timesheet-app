# Star Wars Space Battle

A lightweight Star Wars-inspired 3D space shooter built with React Three Fiber. Runs smoothly in any modern browser without heavy assets.

## Gameplay

- **Move**: WASD / Arrow Keys
- **Shoot**: Spacebar
- **Objective**: Destroy enemy ships and survive as long as possible

## Features

- Low-poly X-Wing and TIE Fighter inspired ships
- Particle starfield background with distant planets
- Laser effects with glow
- Particle explosion effects
- Health/shield system
- Score tracking with high score
- Increasing difficulty over time
- Enemy AI with zigzag movement
- Smooth inertia-based player movement

## Tech Stack

- **React** + **Vite** (fast build tooling)
- **Three.js** via React Three Fiber
- **Zustand** (state management)
- **Tailwind CSS** (UI overlay)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  components/
    GameCanvas.jsx     - Three.js canvas setup
    GameScene.jsx      - Main game loop & orchestration
    PlayerShip.jsx     - Player ship model & controls
    EnemyShip.jsx      - Enemy TIE fighter model & AI
    Laser.jsx          - Laser projectile
    Explosion.jsx      - Particle explosion effect
    Starfield.jsx      - Background star particles
    HUD.jsx            - Score & health overlay
    StartScreen.jsx    - Start menu
    GameOverScreen.jsx - Game over screen
  store/
    gameStore.js       - Zustand state (score, health, game state)
  utils/
    collision.js       - Collision detection helpers
    constants.js       - Game balance constants
```

## Performance

- No external 3D model files — all geometry is procedural
- Object pooling for lasers
- Low-poly meshes throughout
- Runs on low-end hardware and mobile browsers
