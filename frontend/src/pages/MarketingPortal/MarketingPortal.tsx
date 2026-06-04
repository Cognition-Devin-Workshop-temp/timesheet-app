import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { colors, sections } from './theme';
import Section from './components/Section';
import RunnerCharacter from './components/RunnerCharacter';
import ParticleField from './components/ParticleField';
import NavigationDots from './components/NavigationDots';

const SCROLL_COOLDOWN = 900;

const MarketingPortal: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [runnerProgress, setRunnerProgress] = useState(0);
  const [runnerDirection, setRunnerDirection] = useState<'right' | 'left'>('right');
  const lastScrollTime = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigateTo = useCallback(
    (targetIndex: number) => {
      const now = Date.now();
      if (now - lastScrollTime.current < SCROLL_COOLDOWN) return;
      if (targetIndex < 0 || targetIndex >= sections.length) return;
      if (targetIndex === currentSection) return;

      lastScrollTime.current = now;
      const dir = targetIndex > currentSection ? 1 : -1;
      setDirection(dir);
      setRunnerDirection(dir > 0 ? 'right' : 'left');
      setIsRunning(true);

      // Animate runner across screen, then change section
      const startProgress = dir > 0 ? 0 : 1;
      const endProgress = dir > 0 ? 1 : 0;
      setRunnerProgress(startProgress);

      const runDuration = 600;
      const startTime = performance.now();

      const animateRunner = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(elapsed / runDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setRunnerProgress(startProgress + (endProgress - startProgress) * eased);

        if (t < 0.5) {
          requestAnimationFrame(animateRunner);
        } else if (t >= 0.5 && t < 1) {
          setCurrentSection(targetIndex);
          requestAnimationFrame(animateRunner);
        } else {
          setTimeout(() => setIsRunning(false), 300);
        }
      };

      requestAnimationFrame(animateRunner);
    },
    [currentSection]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      if (Math.abs(delta) < 10) return;

      if (delta > 0) {
        navigateTo(currentSection + 1);
      } else {
        navigateTo(currentSection - 1);
      }
    },
    [currentSection, navigateTo]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        navigateTo(currentSection + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateTo(currentSection - 1);
      }
    },
    [currentSection, navigateTo]
  );

  // Touch support
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          navigateTo(currentSection + 1);
        } else {
          navigateTo(currentSection - 1);
        }
      }
    },
    [currentSection, navigateTo]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleWheel, handleKeyDown, handleTouchStart, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: colors.bgDeep,
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
        cursor: 'default',
      }}
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Background particles */}
      <ParticleField />

      {/* Top bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 40px',
          background: `linear-gradient(180deg, ${colors.bgDeep}ee 0%, transparent 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: colors.gradientPrimary,
              borderRadius: 6,
              transform: 'rotate(45deg)',
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 300,
              color: colors.textPrimary,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            Cognizant
          </span>
        </div>

        <div style={{ display: 'flex', gap: 32 }}>
          {['Services', 'Insights', 'Careers', 'About'].map((item) => (
            <span
              key={item}
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSecondary)}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Section content */}
      <AnimatePresence mode="wait" custom={direction}>
        {sections.map(
          (section, index) =>
            index === currentSection && (
              <Section
                key={section.id}
                {...section}
                isActive={true}
                index={index}
                direction={direction}
              />
            )
        )}
      </AnimatePresence>

      {/* Running character */}
      <RunnerCharacter
        progress={runnerProgress}
        direction={runnerDirection}
        isRunning={isRunning}
      />

      {/* Navigation dots */}
      <NavigationDots currentSection={currentSection} onNavigate={navigateTo} />

      {/* Bottom section indicator */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: colors.textMuted,
        }}
      >
        <span>
          {String(currentSection + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
        </span>
        <div
          style={{
            width: 100,
            height: 2,
            background: `${colors.textMuted}30`,
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((currentSection + 1) / sections.length) * 100}%`,
              height: '100%',
              background: colors.gradientPrimary,
              borderRadius: 1,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketingPortal;
