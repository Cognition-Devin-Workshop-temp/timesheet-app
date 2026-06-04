import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function CalendarHeader({ currentDate, onPrev, onNext, view, onViewChange }) {
  const { dark, toggle } = useTheme()

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPrev}
          className="p-2 rounded-xl backdrop-blur-md
            bg-[var(--color-glass)] dark:bg-[var(--color-glass-dark)]
            border border-[var(--color-glass-border)] dark:border-[var(--color-glass-border-dark)]
            shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </motion.button>

        <motion.h1
          key={format(currentDate, 'yyyy-MM')}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl font-bold tracking-tight
            text-white drop-shadow-lg select-none min-w-[200px] text-center"
        >
          {format(currentDate, 'MMMM yyyy')}
        </motion.h1>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onNext}
          className="p-2 rounded-xl backdrop-blur-md
            bg-[var(--color-glass)] dark:bg-[var(--color-glass-dark)]
            border border-[var(--color-glass-border)] dark:border-[var(--color-glass-border-dark)]
            shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* View toggles */}
        <div className="hidden sm:flex rounded-xl overflow-hidden backdrop-blur-md
          bg-[var(--color-glass)] dark:bg-[var(--color-glass-dark)]
          border border-[var(--color-glass-border)] dark:border-[var(--color-glass-border-dark)]
          shadow-lg"
        >
          {['month', 'week'].map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer
                ${view === v
                  ? 'bg-white/30 dark:bg-white/10 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Dark mode toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggle}
          className="p-2 rounded-xl backdrop-blur-md
            bg-[var(--color-glass)] dark:bg-[var(--color-glass-dark)]
            border border-[var(--color-glass-border)] dark:border-[var(--color-glass-border-dark)]
            shadow-lg hover:shadow-xl transition-shadow text-white cursor-pointer"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
      </div>
    </header>
  )
}
