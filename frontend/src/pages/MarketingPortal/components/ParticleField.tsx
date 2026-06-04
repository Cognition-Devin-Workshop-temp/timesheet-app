import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { colors } from '../theme';

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateParticles() {
  return Array.from({ length: 40 }, (_, i) => {
    const s = seededRandom;
    return {
      id: i,
      x: s(i * 7 + 1) * 100,
      y: s(i * 7 + 2) * 100,
      size: s(i * 7 + 3) * 3 + 1,
      duration: s(i * 7 + 4) * 20 + 15,
      delay: s(i * 7 + 5) * 10,
      color: s(i * 7 + 6) > 0.5 ? colors.primary : colors.accent,
      opacity: s(i * 7 + 7) * 0.3 + 0.1,
    };
  });
}

function generateLines() {
  return Array.from({ length: 8 }, (_, i) => {
    const s = seededRandom;
    return {
      id: i,
      x1: s(i * 5 + 100) * 100,
      y1: s(i * 5 + 101) * 100,
      x2: s(i * 5 + 102) * 100,
      y2: s(i * 5 + 103) * 100,
      duration: s(i * 5 + 104) * 30 + 20,
    };
  });
}

const ParticleField: React.FC = () => {
  const [particles] = useState(generateParticles);
  const [lines] = useState(generateLines);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Connecting lines (grid effect) */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
      >
        {lines.map((l) => (
          <motion.line
            key={l.id}
            x1={`${l.x1}%`}
            y1={`${l.y1}%`}
            x2={`${l.x2}%`}
            y2={`${l.y2}%`}
            stroke={colors.primary}
            strokeWidth="0.5"
            opacity={0.06}
            animate={{
              x1: [`${l.x1}%`, `${(l.x1 + 10) % 100}%`, `${l.x1}%`],
              y1: [`${l.y1}%`, `${(l.y1 + 8) % 100}%`, `${l.y1}%`],
            }}
            transition={{ duration: l.duration, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </svg>

      {/* Radial glow spots */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primary}08 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.accent}06 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};

export default ParticleField;
