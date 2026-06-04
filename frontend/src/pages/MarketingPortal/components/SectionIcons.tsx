import React from 'react';
import { motion } from 'framer-motion';
import { colors } from '../theme';

interface IconProps {
  size?: number;
}

export const RocketIcon: React.FC<IconProps> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <defs>
      <linearGradient id="rocketGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={colors.primary} />
        <stop offset="100%" stopColor={colors.accent} />
      </linearGradient>
    </defs>
    <motion.path
      d="M30 5 C30 5 45 15 45 35 L35 45 L25 45 L15 35 C15 15 30 5 30 5Z"
      fill="url(#rocketGrad)"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
    <circle cx="30" cy="24" r="5" fill={colors.bgDeep} />
    <circle cx="30" cy="24" r="3" fill={colors.accent} opacity={0.8} />
    <motion.path
      d="M25 45 L22 55 L30 50 L38 55 L35 45"
      fill={colors.accent}
      opacity={0.7}
      animate={{ opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  </svg>
);

export const BrainIcon: React.FC<IconProps> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <defs>
      <linearGradient id="brainGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={colors.primary} />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
    <motion.path
      d="M30 10 C20 10 12 18 12 28 C12 35 16 40 22 43 L22 50 L38 50 L38 43 C44 40 48 35 48 28 C48 18 40 10 30 10Z"
      fill="url(#brainGrad)"
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.path
      d="M22 22 Q30 18 38 22 M22 28 Q30 24 38 28 M22 34 Q30 30 38 34"
      stroke={colors.bgDeep}
      strokeWidth="1.5"
      fill="none"
      animate={{ pathLength: [0, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
    {[{ cx: 24, cy: 20 }, { cx: 36, cy: 20 }, { cx: 30, cy: 30 }].map((pos, i) => (
      <motion.circle
        key={i}
        cx={pos.cx}
        cy={pos.cy}
        r="2"
        fill={colors.accent}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
      />
    ))}
  </svg>
);

export const CloudIcon: React.FC<IconProps> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <defs>
      <linearGradient id="cloudGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={colors.primary} />
        <stop offset="100%" stopColor={colors.primaryLight} />
      </linearGradient>
    </defs>
    <motion.path
      d="M15 38 C8 38 4 33 4 28 C4 23 8 19 13 18.5 C14 13 19 9 25 9 C30 9 34 12 36 16 C37 15.5 38 15 40 15 C45 15 49 19 49 24 C53 25 56 28 56 32 C56 36 53 38 49 38Z"
      fill="url(#cloudGrad)"
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.path
      d="M20 44 L20 50 M30 44 L30 52 M40 44 L40 48"
      stroke={colors.accent}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="4 4"
      animate={{ strokeDashoffset: [0, -8] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  </svg>
);

export const CodeIcon: React.FC<IconProps> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="5" y="8" width="50" height="44" rx="6" fill={colors.bgCard} stroke={colors.primary} strokeWidth="1.5" />
    <rect x="5" y="8" width="50" height="12" rx="6" fill={colors.primary} opacity={0.15} />
    <circle cx="14" cy="14" r="2.5" fill="#FF5F57" />
    <circle cx="22" cy="14" r="2.5" fill="#FFBD2E" />
    <circle cx="30" cy="14" r="2.5" fill="#28CA41" />
    <motion.text
      x="12" y="32" fill={colors.primary} fontSize="8" fontFamily="monospace"
      animate={{ opacity: [0, 1] }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {'const build = () => {'}
    </motion.text>
    <motion.text
      x="16" y="40" fill={colors.accent} fontSize="8" fontFamily="monospace"
      animate={{ opacity: [0, 1] }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      {'  return <Future />;'}
    </motion.text>
    <motion.text
      x="12" y="48" fill={colors.primary} fontSize="8" fontFamily="monospace"
      animate={{ opacity: [0, 1] }}
      transition={{ duration: 0.5, delay: 1 }}
    >
      {'};'}
    </motion.text>
  </svg>
);

export const ChartIcon: React.FC<IconProps> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <defs>
      <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={colors.primary} />
        <stop offset="100%" stopColor={colors.accent} />
      </linearGradient>
    </defs>
    {[
      { x: 8, h: 25, delay: 0 },
      { x: 18, h: 35, delay: 0.1 },
      { x: 28, h: 20, delay: 0.2 },
      { x: 38, h: 40, delay: 0.3 },
      { x: 48, h: 30, delay: 0.4 },
    ].map((bar, i) => (
      <motion.rect
        key={i}
        x={bar.x}
        y={55 - bar.h}
        width="8"
        height={bar.h}
        rx="2"
        fill="url(#barGrad)"
        initial={{ height: 0, y: 55 }}
        animate={{ height: bar.h, y: 55 - bar.h }}
        transition={{ duration: 0.8, delay: bar.delay, repeat: Infinity, repeatDelay: 3, repeatType: 'reverse' }}
      />
    ))}
    <line x1="5" y1="55" x2="58" y2="55" stroke={colors.textMuted} strokeWidth="1" />
  </svg>
);

export const HandshakeIcon: React.FC<IconProps> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <defs>
      <linearGradient id="handGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={colors.primary} />
        <stop offset="100%" stopColor={colors.accent} />
      </linearGradient>
    </defs>
    <motion.path
      d="M10 30 L20 20 L30 28 L40 20 L50 30"
      stroke="url(#handGrad)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.path
      d="M5 35 L15 25 M55 35 L45 25"
      stroke={colors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <motion.circle
      cx="30" cy="42" r="8"
      fill="none"
      stroke={colors.accent}
      strokeWidth="1.5"
      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <circle cx="30" cy="42" r="3" fill={colors.accent} />
  </svg>
);


