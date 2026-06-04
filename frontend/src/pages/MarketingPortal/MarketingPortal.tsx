import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from './theme';

interface Zone {
  id: string;
  startX: number;
  endX: number;
  title: string;
  subtitle: string;
  description: string;
  stats: { value: string; label: string }[];
  color: string;
  icon: string;
}

const WORLD_WIDTH = 8000;
const GROUND_Y = 520;
const CHAR_W = 40;
const CHAR_H = 60;

const zones: Zone[] = [
  {
    id: 'start',
    startX: 0,
    endX: 1200,
    title: 'Welcome, Explorer',
    subtitle: 'Scroll to run through the Cognizant world',
    description: 'Use your mouse wheel to move the character forward. Discover our services as you run!',
    stats: [],
    color: colors.primary,
    icon: 'rocket',
  },
  {
    id: 'ai',
    startX: 1400,
    endX: 2800,
    title: 'AI & Innovation',
    subtitle: 'Intelligent systems that learn and adapt',
    description: 'From agentic AI to context engineering — production-grade intelligent agents across data engineering, analytics, and decision workflows.',
    stats: [
      { value: '500+', label: 'AI Models' },
      { value: '93%', label: 'Jobs Reshaped' },
      { value: '40+', label: 'Industries' },
    ],
    color: '#7C3AED',
    icon: 'brain',
  },
  {
    id: 'cloud',
    startX: 3000,
    endX: 4400,
    title: 'Cloud Solutions',
    subtitle: 'Build once. Scale fast. Run anywhere.',
    description: 'Enterprise-grade cloud architecture with intelligent orchestration. Modernize infrastructure, migrate workloads, and optimize costs.',
    stats: [
      { value: '99.99%', label: 'Uptime' },
      { value: '60%', label: 'Cost Saved' },
      { value: '3x', label: 'Faster' },
    ],
    color: '#0EA5E9',
    icon: 'cloud',
  },
  {
    id: 'engineering',
    startX: 4600,
    endX: 6000,
    title: 'Digital Engineering',
    subtitle: 'Crafting resilient, scalable platforms',
    description: 'Full-stack engineering from microservices to edge computing. Systems that handle millions of transactions with zero downtime.',
    stats: [
      { value: '10M+', label: 'TPS' },
      { value: '200+', label: 'Platforms' },
      { value: '0', label: 'Downtime' },
    ],
    color: '#10B981',
    icon: 'code',
  },
  {
    id: 'data',
    startX: 6200,
    endX: 7600,
    title: 'Data & Analytics',
    subtitle: 'Turn data into decisive action',
    description: 'Real-time analytics, data lakes, and ML pipelines that unlock hidden patterns and drive informed decisions at scale.',
    stats: [
      { value: '50PB+', label: 'Processed' },
      { value: '10x', label: 'Faster' },
      { value: '360°', label: 'View' },
    ],
    color: '#F59E0B',
    icon: 'chart',
  },
  {
    id: 'finish',
    startX: 7600,
    endX: 8000,
    title: "Let's Build Together",
    subtitle: 'You made it! Ready to transform your business?',
    description: 'Our teams across 40+ countries are ready to help you reimagine what\'s possible.',
    stats: [],
    color: colors.accent,
    icon: 'flag',
  },
];

interface Obstacle {
  x: number;
  w: number;
  h: number;
  type: 'block' | 'gap' | 'platform';
  y?: number;
}

const obstacles: Obstacle[] = [
  { x: 1100, w: 40, h: 50, type: 'block' },
  { x: 1350, w: 60, h: 30, type: 'block' },
  { x: 2000, w: 80, h: 25, type: 'platform', y: GROUND_Y - 100 },
  { x: 2500, w: 40, h: 60, type: 'block' },
  { x: 2900, w: 50, h: 40, type: 'block' },
  { x: 3500, w: 80, h: 25, type: 'platform', y: GROUND_Y - 120 },
  { x: 4000, w: 40, h: 55, type: 'block' },
  { x: 4550, w: 50, h: 45, type: 'block' },
  { x: 5200, w: 80, h: 25, type: 'platform', y: GROUND_Y - 90 },
  { x: 5800, w: 40, h: 50, type: 'block' },
  { x: 6100, w: 50, h: 35, type: 'block' },
  { x: 6800, w: 80, h: 25, type: 'platform', y: GROUND_Y - 110 },
  { x: 7300, w: 40, h: 40, type: 'block' },
];

interface Collectible {
  x: number;
  y: number;
  collected: boolean;
  id: number;
}

function generateCollectibles(): Collectible[] {
  const items: Collectible[] = [];
  let id = 0;
  for (let x = 300; x < WORLD_WIDTH - 200; x += 250 + Math.floor(seededRand(id) * 150)) {
    items.push({
      x,
      y: GROUND_Y - 80 - Math.floor(seededRand(id + 50) * 60),
      collected: false,
      id: id++,
    });
  }
  return items;
}

function seededRand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const MarketingPortal: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [activeZone, setActiveZone] = useState<Zone>(zones[0]);
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [showZoneCard, setShowZoneCard] = useState(true);
  const [collectibles, setCollectibles] = useState<Collectible[]>(() => generateCollectibles());
  const [particles, setParticles] = useState<StarParticle[]>([]);
  const [charY, setCharY] = useState(GROUND_Y - CHAR_H);
  const [velocityY, setVelocityY] = useState(0);
  const [runFrame, setRunFrame] = useState(0);

  const scrollPosRef = useRef(0);
  const charYRef = useRef(GROUND_Y - CHAR_H);
  const velYRef = useRef(0);
  const isJumpingRef = useRef(false);
  const lastWheelTime = useRef(0);
  const frameRef = useRef(0);
  const collectiblesRef = useRef(collectibles);
  const particlesRef = useRef<StarParticle[]>([]);
  const scoreRef = useRef(0);
  const animFrameRef = useRef(0);
  const activeZoneRef = useRef(activeZone);

  const cameraX = Math.max(0, Math.min(scrollPos - 400, WORLD_WIDTH - 1024));

  // Zone detection (driven by scroll handler, not effect)
  const updateZone = useCallback((pos: number) => {
    const zone = zones.find((z) => pos >= z.startX && pos < z.endX);
    if (zone && zone.id !== activeZoneRef.current.id) {
      activeZoneRef.current = zone;
      setShowZoneCard(false);
      setTimeout(() => {
        setActiveZone(zone);
        setShowZoneCard(true);
      }, 300);
    }
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const now = Date.now();
    const dt = Math.min(now - lastWheelTime.current, 100);
    lastWheelTime.current = now;

    const speed = Math.abs(e.deltaY) * 0.8 * Math.max(0.5, dt / 16);
    const direction = e.deltaY > 0 ? 1 : -1;
    const move = direction * Math.min(speed, 60);

    scrollPosRef.current = Math.max(0, Math.min(scrollPosRef.current + move, WORLD_WIDTH - 100));
    setScrollPos(scrollPosRef.current);

    // Auto-jump when approaching obstacles
    if (direction > 0) {
      const charX = scrollPosRef.current;
      for (const obs of obstacles) {
        if (obs.type === 'block') {
          const dist = obs.x - charX;
          if (dist > 0 && dist < 80 && !isJumpingRef.current) {
            velYRef.current = -14;
            isJumpingRef.current = true;
            setIsJumping(true);
            break;
          }
        }
      }
    }

    frameRef.current += 1;
    setRunFrame(frameRef.current);

    updateZone(scrollPosRef.current);
  }, [updateZone]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !isJumpingRef.current) {
      e.preventDefault();
      velYRef.current = -14;
      isJumpingRef.current = true;
      setIsJumping(true);
    }
  }, []);

  // Physics loop
  useEffect(() => {
    const gravity = 0.6;
    let running = true;

    const tick = () => {
      if (!running) return;

      // Gravity
      velYRef.current += gravity;
      charYRef.current += velYRef.current;

      // Ground collision
      let groundLevel = GROUND_Y - CHAR_H;

      // Platform collision
      const charX = scrollPosRef.current;
      for (const obs of obstacles) {
        if (obs.type === 'platform' && obs.y !== undefined) {
          if (
            charX + CHAR_W > obs.x &&
            charX < obs.x + obs.w &&
            charYRef.current + CHAR_H >= obs.y &&
            charYRef.current + CHAR_H <= obs.y + 15 &&
            velYRef.current >= 0
          ) {
            groundLevel = obs.y - CHAR_H;
          }
        }
      }

      if (charYRef.current >= groundLevel) {
        charYRef.current = groundLevel;
        velYRef.current = 0;
        if (isJumpingRef.current) {
          isJumpingRef.current = false;
          setIsJumping(false);
        }
      }

      setCharY(charYRef.current);
      setVelocityY(velYRef.current);

      // Collectible collision
      const cx = scrollPosRef.current;
      const cy = charYRef.current;
      let changed = false;
      for (const c of collectiblesRef.current) {
        if (!c.collected && Math.abs(c.x - cx) < 30 && Math.abs(c.y - cy) < 40) {
          c.collected = true;
          changed = true;
          scoreRef.current += 10;
          setScore(scoreRef.current);

          // Spawn particles
          const newParticles: StarParticle[] = [];
          for (let i = 0; i < 6; i++) {
            newParticles.push({
              x: c.x,
              y: c.y,
              vx: (seededRand(c.id * 10 + i) - 0.5) * 6,
              vy: -seededRand(c.id * 10 + i + 30) * 5 - 2,
              life: 30,
              maxLife: 30,
              size: 3 + seededRand(c.id * 10 + i + 60) * 3,
            });
          }
          particlesRef.current = [...particlesRef.current, ...newParticles];
        }
      }
      if (changed) {
        setCollectibles([...collectiblesRef.current]);
      }

      // Update particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15,
          life: p.life - 1,
        }))
        .filter((p) => p.life > 0);
      setParticles([...particlesRef.current]);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    parent.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      parent.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleWheel, handleKeyDown]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cam = cameraX;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#060A12');
    skyGrad.addColorStop(0.6, '#0A0E17');
    skyGrad.addColorStop(1, '#0F1520');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Stars (parallax)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) {
      const sx = ((seededRand(i) * 2000 - cam * 0.1) % 1100 + 1100) % 1100;
      const sy = seededRand(i + 100) * 300;
      const sr = seededRand(i + 200) * 1.5 + 0.5;
      const alpha = 0.3 + seededRand(i + 300) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Background mountains (parallax)
    ctx.fillStyle = '#0D1219';
    ctx.beginPath();
    ctx.moveTo(0, 450);
    for (let x = 0; x <= W; x += 4) {
      const wx = x + cam * 0.15;
      const h = Math.sin(wx * 0.003) * 60 + Math.sin(wx * 0.007) * 30 + 380;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Mid mountains
    ctx.fillStyle = '#111824';
    ctx.beginPath();
    ctx.moveTo(0, 470);
    for (let x = 0; x <= W; x += 4) {
      const wx = x + cam * 0.3;
      const h = Math.sin(wx * 0.005) * 40 + Math.sin(wx * 0.012) * 20 + 430;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Zone background tint
    const currentZone = zones.find((z) => scrollPos >= z.startX && scrollPos < z.endX);
    if (currentZone) {
      const zoneProgress = (scrollPos - currentZone.startX) / (currentZone.endX - currentZone.startX);
      const intensity = Math.sin(zoneProgress * Math.PI) * 0.08;
      ctx.fillStyle = currentZone.color;
      ctx.globalAlpha = intensity;
      ctx.fillRect(0, 350, W, 200);
      ctx.globalAlpha = 1;
    }

    // Ground
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    groundGrad.addColorStop(0, '#1A2338');
    groundGrad.addColorStop(1, '#0F1520');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // Ground line with glow
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.primary;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Grid lines on ground
    ctx.strokeStyle = `${colors.primary}15`;
    ctx.lineWidth = 1;
    for (let gx = -cam % 80; gx < W; gx += 80) {
      ctx.beginPath();
      ctx.moveTo(gx, GROUND_Y);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gy = GROUND_Y + 30; gy < H; gy += 30) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    // Zone markers (gate posts)
    for (const zone of zones) {
      const gx = zone.startX - cam;
      if (gx < -60 || gx > W + 60) continue;

      // Gate pillars
      ctx.fillStyle = zone.color;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(gx - 3, GROUND_Y - 120, 6, 120);
      ctx.fillRect(gx + 60 - 3, GROUND_Y - 120, 6, 120);

      // Gate top
      ctx.fillRect(gx - 3, GROUND_Y - 120, 66, 4);

      // Zone label
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = zone.color;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(zone.title.toUpperCase(), gx + 30, GROUND_Y - 128);
      ctx.globalAlpha = 1;
    }

    // Obstacles
    for (const obs of obstacles) {
      const ox = obs.x - cam;
      if (ox < -100 || ox > W + 100) continue;

      if (obs.type === 'block') {
        // Glowing block
        const blockGrad = ctx.createLinearGradient(ox, GROUND_Y - obs.h, ox, GROUND_Y);
        blockGrad.addColorStop(0, colors.accent);
        blockGrad.addColorStop(1, `${colors.accent}40`);
        ctx.fillStyle = blockGrad;
        ctx.fillRect(ox, GROUND_Y - obs.h, obs.w, obs.h);

        // Block outline
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox, GROUND_Y - obs.h, obs.w, obs.h);

        // Warning stripes
        ctx.fillStyle = `${colors.bgDeep}60`;
        for (let s = 0; s < obs.h; s += 10) {
          ctx.fillRect(ox, GROUND_Y - obs.h + s, obs.w, 3);
        }
      } else if (obs.type === 'platform' && obs.y !== undefined) {
        ctx.fillStyle = `${colors.primary}80`;
        ctx.fillRect(ox, obs.y, obs.w, 6);
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 8;
        ctx.fillRect(ox, obs.y, obs.w, 2);
        ctx.shadowBlur = 0;
      }
    }

    // Collectibles (diamonds)
    for (const c of collectiblesRef.current) {
      if (c.collected) continue;
      const cx = c.x - cam;
      const cy = c.y;
      if (cx < -20 || cx > W + 20) continue;

      const bob = Math.sin(Date.now() * 0.005 + c.id) * 4;
      const dy = cy + bob;

      ctx.save();
      ctx.translate(cx, dy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = colors.accent;
      ctx.shadowColor = colors.accent;
      ctx.shadowBlur = 12;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Inner glow
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Collection particles
    for (const p of particlesRef.current) {
      const px = p.x - cam;
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(px, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Character
    const charScreenX = scrollPos - cam;
    const cy2 = charYRef.current;
    const frame = frameRef.current;
    const isRunAnim = Date.now() - lastWheelTime.current < 200;

    // Shadow
    ctx.fillStyle = `${colors.primary}30`;
    ctx.beginPath();
    ctx.ellipse(charScreenX + CHAR_W / 2, GROUND_Y + 2, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Character body (stick figure with glow)
    const grad = ctx.createLinearGradient(charScreenX, cy2, charScreenX + CHAR_W, cy2 + CHAR_H);
    grad.addColorStop(0, colors.primary);
    grad.addColorStop(1, colors.accent);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const headX = charScreenX + CHAR_W / 2;
    const headY = cy2 + 10;

    // Head glow
    ctx.shadowColor = colors.primary;
    ctx.shadowBlur = 15;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(headX, headY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Visor
    ctx.fillStyle = colors.bgDeep;
    ctx.fillRect(headX - 7, headY - 2, 14, 3);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX - 3, headY - 1.5, 5, 2);

    // Body
    ctx.beginPath();
    ctx.moveTo(headX, headY + 9);
    ctx.lineTo(headX, cy2 + 42);
    ctx.stroke();

    // Arms & Legs with run animation
    const legSwing = isRunAnim ? Math.sin(frame * 0.6) * 15 : 0;
    const armSwing = isRunAnim ? Math.sin(frame * 0.6) * 12 : 0;

    // Left arm
    ctx.beginPath();
    ctx.moveTo(headX, cy2 + 22);
    ctx.lineTo(headX - 12 + armSwing, cy2 + 35);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(headX, cy2 + 22);
    ctx.lineTo(headX + 12 - armSwing, cy2 + 35);
    ctx.stroke();

    // Left leg
    ctx.beginPath();
    ctx.moveTo(headX, cy2 + 42);
    ctx.lineTo(headX - 10 + legSwing, cy2 + CHAR_H);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(headX, cy2 + 42);
    ctx.lineTo(headX + 10 - legSwing, cy2 + CHAR_H);
    ctx.stroke();

    // Briefcase
    const bcSwing = isRunAnim ? Math.sin(frame * 0.6 + 1) * 3 : 0;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX + 14, cy2 + 28 + bcSwing, 12, 8);
    ctx.fillStyle = colors.bgDeep;
    ctx.fillRect(headX + 16, cy2 + 31 + bcSwing, 8, 2);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX + 18, cy2 + 25 + bcSwing, 4, 4);

    // Run particles behind character
    if (isRunAnim && !isJumpingRef.current) {
      for (let i = 0; i < 3; i++) {
        const px = charScreenX - 5 - seededRand(frame * 3 + i) * 20;
        const py = GROUND_Y - seededRand(frame * 3 + i + 10) * 8;
        ctx.fillStyle = colors.primary;
        ctx.globalAlpha = 0.4 - i * 0.1;
        ctx.beginPath();
        ctx.arc(px, py, 2 - i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Finish flag
    const flagX = 7700 - cam;
    if (flagX > -50 && flagX < W + 50) {
      ctx.fillStyle = colors.accent;
      ctx.fillRect(flagX, GROUND_Y - 100, 4, 100);
      // Flag
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(flagX + 4, GROUND_Y - 100);
      ctx.lineTo(flagX + 35, GROUND_Y - 85);
      ctx.lineTo(flagX + 4, GROUND_Y - 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', flagX + 18, GROUND_Y - 82);
    }

    // Distance markers
    for (let d = 500; d < WORLD_WIDTH; d += 500) {
      const dx = d - cam;
      if (dx < 0 || dx > W) continue;
      ctx.fillStyle = colors.textMuted;
      ctx.globalAlpha = 0.4;
      ctx.font = '10px Inter, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${d}m`, dx, GROUND_Y + 18);
      ctx.globalAlpha = 1;
    }
  }, [scrollPos, charY, velocityY, runFrame, cameraX, isJumping, collectibles, particles]);

  // Repaint loop for animations (bobbing collectibles, particles)
  useEffect(() => {
    let id: number;
    const repaint = () => {
      setRunFrame((f) => f); // force re-render for canvas
      id = requestAnimationFrame(repaint);
    };
    id = requestAnimationFrame(repaint);
    return () => cancelAnimationFrame(id);
  }, []);

  const progress = (scrollPos / (WORLD_WIDTH - 100)) * 100;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: colors.bgDeep,
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        cursor: 'default',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* HUD - Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: `linear-gradient(180deg, ${colors.bgDeep}ee 0%, transparent 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              background: colors.gradientPrimary,
              borderRadius: 5,
              transform: 'rotate(45deg)',
            }}
          />
          <span
            style={{
              fontSize: 15,
              fontWeight: 300,
              color: colors.textPrimary,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            Cognizant
          </span>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                background: colors.accent,
                transform: 'rotate(45deg)',
                borderRadius: 2,
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.accent }}>{score}</span>
          </div>

          <div
            style={{
              fontSize: 13,
              color: colors.textMuted,
              fontFamily: 'monospace',
            }}
          >
            {Math.floor(scrollPos)}m / {WORLD_WIDTH}m
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          top: 52,
          left: 24,
          right: 24,
          height: 3,
          background: `${colors.textMuted}20`,
          borderRadius: 2,
          zIndex: 50,
          overflow: 'hidden',
        }}
      >
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            height: '100%',
            background: colors.gradientPrimary,
            borderRadius: 2,
          }}
        />
        {/* Zone markers on progress bar */}
        {zones.slice(1, -1).map((z) => (
          <div
            key={z.id}
            style={{
              position: 'absolute',
              left: `${(z.startX / WORLD_WIDTH) * 100}%`,
              top: -2,
              width: 2,
              height: 7,
              background: z.color,
              borderRadius: 1,
            }}
          />
        ))}
      </div>

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={1024}
        height={620}
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          width: '100%',
          height: 'calc(100% - 60px)',
        }}
      />

      {/* Zone info card */}
      <AnimatePresence mode="wait">
        {showZoneCard && (
          <motion.div
            key={activeZone.id}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              top: 80,
              left: 24,
              maxWidth: 360,
              background: `${colors.bgCard}e0`,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${activeZone.color}30`,
              borderRadius: 16,
              padding: '20px 24px',
              zIndex: 40,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: activeZone.color,
                textTransform: 'uppercase',
                letterSpacing: 3,
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              {activeZone.icon === 'rocket' ? 'START ZONE' : activeZone.icon === 'flag' ? 'FINISH' : 'ZONE'}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: colors.textPrimary,
                marginBottom: 6,
              }}
            >
              {activeZone.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: activeZone.color,
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              {activeZone.subtitle}
            </div>
            <div
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                lineHeight: 1.6,
                marginBottom: activeZone.stats.length > 0 ? 14 : 0,
              }}
            >
              {activeZone.description}
            </div>

            {activeZone.stats.length > 0 && (
              <div style={{ display: 'flex', gap: 20 }}>
                {activeZone.stats.map((stat, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: activeZone.color,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color: colors.textMuted,
        }}
      >
        <span>SCROLL to run</span>
        <span style={{ color: colors.textMuted + '50' }}>|</span>
        <span>SPACE to jump</span>
        <span style={{ color: colors.textMuted + '50' }}>|</span>
        <span>Collect <span style={{ color: colors.accent }}>diamonds</span> for points</span>
      </div>
    </div>
  );
};

export default MarketingPortal;
