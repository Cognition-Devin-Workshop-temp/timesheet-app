import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '../theme';
import { getIcon } from './getIcon';

interface SectionProps {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  icon: string;
  isActive: boolean;
  index: number;
  direction: number; // 1 = forward, -1 = backward
}

const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  description,
  icon,
  isActive,
  index,
  direction,
}) => {
  const isHero = index === 0;
  const isContact = index === 5;

  const slideVariants = {
    enter: (dir: number) => ({
      y: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      y: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <AnimatePresence mode="wait" custom={direction}>
      {isActive && (
        <motion.div
          key={`section-${index}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 80px',
            zIndex: 10,
          }}
        >
          {isHero ? (
            <HeroContent title={title} subtitle={subtitle} icon={icon} />
          ) : isContact ? (
            <ContactContent title={title} subtitle={subtitle} description={description} icon={icon} />
          ) : (
            <ServiceContent
              title={title}
              subtitle={subtitle}
              description={description}
              icon={icon}
              index={index}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const HeroContent: React.FC<{ title: string; subtitle: string; icon: string }> = ({
  title,
  subtitle,
  icon,
}) => (
  <div style={{ textAlign: 'center', maxWidth: 900 }}>
    {/* Cognizant logo area */}
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          background: colors.gradientPrimary,
          borderRadius: 8,
          transform: 'rotate(45deg)',
        }}
      />
      <span
        style={{
          fontSize: 22,
          fontWeight: 300,
          color: colors.textSecondary,
          letterSpacing: 6,
          textTransform: 'uppercase',
        }}
      >
        Cognizant
      </span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      style={{ marginBottom: 30 }}
    >
      {getIcon(icon, 80)}
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.8 }}
      style={{
        fontSize: 72,
        fontWeight: 800,
        background: colors.gradientPrimary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1.1,
        margin: '0 0 20px',
      }}
    >
      {title}
    </motion.h1>

    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      style={{
        fontSize: 22,
        color: colors.textSecondary,
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {subtitle}
    </motion.p>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.8 }}
      style={{ marginTop: 40, display: 'flex', gap: 16, justifyContent: 'center' }}
    >
      <ScrollHint />
    </motion.div>
  </div>
);

const ServiceContent: React.FC<{
  title: string;
  subtitle: string;
  description?: string;
  icon: string;
  index: number;
}> = ({ title, subtitle, description, icon, index }) => {
  const isEven = index % 2 === 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 80,
        maxWidth: 1100,
        width: '100%',
        flexDirection: isEven ? 'row' : 'row-reverse',
      }}
    >
      {/* Icon + visual side */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        style={{
          flex: '0 0 auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 24,
            background: colors.bgCard,
            border: `1px solid ${colors.primary}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at center, ${colors.primary}15 0%, transparent 70%)`,
            }}
          />
          {getIcon(icon, 100)}
        </div>

        {/* Decorative corner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 40,
            height: 40,
            border: `2px solid ${colors.accent}30`,
            borderRadius: 8,
          }}
        />
      </motion.div>

      {/* Text side */}
      <div style={{ flex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            fontSize: 13,
            color: colors.accent,
            textTransform: 'uppercase',
            letterSpacing: 3,
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          0{index}. Service
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: colors.textPrimary,
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}
        >
          {title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            fontSize: 20,
            color: colors.primary,
            margin: '0 0 20px',
            fontWeight: 500,
          }}
        >
          {subtitle}
        </motion.p>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              lineHeight: 1.8,
              margin: 0,
              maxWidth: 500,
            }}
          >
            {description}
          </motion.p>
        )}

        {/* Stats/metrics row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          style={{ display: 'flex', gap: 40, marginTop: 30 }}
        >
          {getStatsForSection(title).map((stat, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  background: colors.gradientPrimary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

const ContactContent: React.FC<{
  title: string;
  subtitle: string;
  description?: string;
  icon: string;
}> = ({ title, subtitle, description, icon }) => (
  <div style={{ textAlign: 'center', maxWidth: 700 }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      style={{ marginBottom: 24 }}
    >
      {getIcon(icon, 80)}
    </motion.div>

    <motion.h2
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      style={{
        fontSize: 56,
        fontWeight: 700,
        background: colors.gradientPrimary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '0 0 16px',
      }}
    >
      {title}
    </motion.h2>

    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.8 }}
      style={{
        fontSize: 20,
        color: colors.textSecondary,
        margin: '0 0 16px',
      }}
    >
      {subtitle}
    </motion.p>

    {description && (
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        style={{
          fontSize: 16,
          color: colors.textMuted,
          margin: '0 0 40px',
          lineHeight: 1.7,
        }}
      >
        {description}
      </motion.p>
    )}

    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${colors.glowBlue}` }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      style={{
        background: colors.gradientPrimary,
        color: colors.bgDeep,
        border: 'none',
        borderRadius: 12,
        padding: '16px 48px',
        fontSize: 18,
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: 1,
      }}
    >
      Get in Touch
    </motion.button>
  </div>
);

const ScrollHint: React.FC = () => (
  <motion.div
    animate={{ y: [0, 8, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
  >
    <span style={{ fontSize: 13, color: colors.textMuted, letterSpacing: 2 }}>
      SCROLL TO EXPLORE
    </span>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 5 L12 19 M5 12 L12 19 L19 12"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  </motion.div>
);

function getStatsForSection(title: string) {
  switch (title) {
    case 'AI & Innovation':
      return [
        { value: '500+', label: 'AI Models Deployed' },
        { value: '93%', label: 'Jobs Reshaped by AI' },
        { value: '40+', label: 'Industries Served' },
      ];
    case 'Cloud Solutions':
      return [
        { value: '99.99%', label: 'Uptime SLA' },
        { value: '60%', label: 'Cost Reduction' },
        { value: '3x', label: 'Faster Deployment' },
      ];
    case 'Digital Engineering':
      return [
        { value: '10M+', label: 'Transactions/sec' },
        { value: '200+', label: 'Platforms Built' },
        { value: '0', label: 'Downtime Goal' },
      ];
    case 'Data & Analytics':
      return [
        { value: '50PB+', label: 'Data Processed' },
        { value: '10x', label: 'Faster Insights' },
        { value: '360°', label: 'Customer View' },
      ];
    default:
      return [];
  }
}

export default Section;
