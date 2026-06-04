import React from 'react';
import { motion } from 'framer-motion';
import { colors, sections } from '../theme';

interface NavigationDotsProps {
  currentSection: number;
  onNavigate: (index: number) => void;
}

const NavigationDots: React.FC<NavigationDotsProps> = ({ currentSection, onNavigate }) => {
  return (
    <div
      style={{
        position: 'fixed',
        right: 30,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: 'center',
      }}
    >
      {sections.map((section, index) => (
        <button
          key={section.id}
          onClick={() => onNavigate(index)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            position: 'relative',
          }}
          title={section.title}
        >
          {/* Label on hover */}
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 1, x: 0 }}
            style={{
              position: 'absolute',
              right: 24,
              fontSize: 12,
              color: colors.textSecondary,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {section.title}
          </motion.span>

          {/* Dot */}
          <motion.div
            animate={{
              scale: currentSection === index ? 1.3 : 1,
              backgroundColor: currentSection === index ? colors.primary : colors.textMuted,
            }}
            whileHover={{ scale: 1.4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              position: 'relative',
            }}
          >
            {currentSection === index && (
              <motion.div
                layoutId="activeDot"
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: `2px solid ${colors.primary}`,
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        </button>
      ))}

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 4,
          width: 2,
          height: 'calc(100% - 8px)',
          background: `${colors.textMuted}30`,
          transform: 'translateX(-50%)',
          borderRadius: 1,
          zIndex: -1,
        }}
      >
        <motion.div
          animate={{
            height: `${(currentSection / (sections.length - 1)) * 100}%`,
          }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          style={{
            width: '100%',
            background: colors.gradientPrimary,
            borderRadius: 1,
          }}
        />
      </div>
    </div>
  );
};

export default NavigationDots;
