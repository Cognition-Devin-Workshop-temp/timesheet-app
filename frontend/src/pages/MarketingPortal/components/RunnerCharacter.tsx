import React from 'react';
import { motion } from 'framer-motion';
import { colors } from '../theme';

interface RunnerCharacterProps {
  progress: number;    // 0 to 1, overall scroll progress
  direction: 'right' | 'left';
  isRunning: boolean;
}

const RunnerCharacter: React.FC<RunnerCharacterProps> = ({ progress, direction, isRunning }) => {
  const xPos = direction === 'right' 
    ? -100 + progress * 1200 
    : 1100 - progress * 1200;

  return (
    <motion.div
      style={{
        position: 'fixed',
        bottom: 40,
        left: 0,
        zIndex: 100,
        pointerEvents: 'none',
        width: '100vw',
      }}
    >
      <motion.div
        animate={{
          x: xPos,
          scaleX: direction === 'left' ? -1 : 1,
        }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        style={{ display: 'inline-block' }}
      >
        <svg
          width="80"
          height="100"
          viewBox="0 0 80 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glow effect behind runner */}
          <defs>
            <filter id="runnerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.accent} />
            </linearGradient>
          </defs>

          {/* Trail particles */}
          {isRunning && (
            <>
              <motion.circle
                cx="10" cy="70" r="3"
                fill={colors.primary}
                animate={{ opacity: [0.8, 0], x: [-10, -30], scale: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.1 }}
              />
              <motion.circle
                cx="15" cy="60" r="2"
                fill={colors.accent}
                animate={{ opacity: [0.6, 0], x: [-10, -25], scale: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2 }}
              />
              <motion.circle
                cx="12" cy="80" r="2.5"
                fill={colors.primaryLight}
                animate={{ opacity: [0.7, 0], x: [-8, -28], scale: [1, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, repeatDelay: 0.15 }}
              />
            </>
          )}

          {/* Head */}
          <motion.circle
            cx="40" cy="15" r="10"
            fill="url(#bodyGrad)"
            filter="url(#runnerGlow)"
            animate={isRunning ? { cy: [15, 12, 15] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Visor / eye line */}
          <rect x="33" y="13" width="14" height="3" rx="1.5" fill={colors.bgDeep} opacity={0.8} />
          <rect x="36" y="13.5" width="4" height="2" rx="1" fill={colors.accent} opacity={0.9} />

          {/* Body */}
          <motion.line
            x1="40" y1="25" x2="40" y2="55"
            stroke="url(#bodyGrad)" strokeWidth="4" strokeLinecap="round"
            animate={isRunning ? { y1: [25, 23, 25], y2: [55, 53, 55] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Left arm */}
          <motion.line
            x1="40" y1="32" x2="25" y2="45"
            stroke="url(#bodyGrad)" strokeWidth="3" strokeLinecap="round"
            animate={isRunning ? { x2: [25, 55, 25], y2: [45, 38, 45] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Right arm */}
          <motion.line
            x1="40" y1="32" x2="55" y2="38"
            stroke="url(#bodyGrad)" strokeWidth="3" strokeLinecap="round"
            animate={isRunning ? { x2: [55, 25, 55], y2: [38, 45, 38] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Left leg */}
          <motion.line
            x1="40" y1="55" x2="25" y2="85"
            stroke="url(#bodyGrad)" strokeWidth="3.5" strokeLinecap="round"
            animate={isRunning ? { x2: [25, 55, 25], y2: [85, 75, 85] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Right leg */}
          <motion.line
            x1="40" y1="55" x2="55" y2="75"
            stroke="url(#bodyGrad)" strokeWidth="3.5" strokeLinecap="round"
            animate={isRunning ? { x2: [55, 25, 55], y2: [75, 85, 75] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Briefcase / message */}
          <motion.g
            animate={isRunning ? { y: [0, -3, 0], rotate: [0, 5, 0] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x="52" y="32" width="16" height="12" rx="2" fill={colors.accent} opacity={0.9} />
            <rect x="55" y="36" width="10" height="2" rx="1" fill={colors.bgDeep} />
            <rect x="55" y="40" width="6" height="1" rx="0.5" fill={colors.bgDeep} opacity={0.6} />
            <rect x="58" y="29" width="4" height="5" rx="1" fill={colors.accent} />
          </motion.g>
        </svg>

        {/* Speech bubble that appears while running */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: -45,
              left: 20,
              background: colors.bgCard,
              border: `1px solid ${colors.primary}`,
              borderRadius: 12,
              padding: '6px 14px',
              fontSize: 12,
              color: colors.textPrimary,
              whiteSpace: 'nowrap',
              boxShadow: `0 0 20px ${colors.glowBlue}`,
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Next up...
            </motion.span>
          </motion.div>
        )}
      </motion.div>

      {/* Ground line with glow */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.primary}40, ${colors.accent}40, transparent)`,
        }}
      />
    </motion.div>
  );
};

export default RunnerCharacter;
