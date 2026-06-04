import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import DayCell from './DayCell'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
}

export default function CalendarGrid({
  currentDate,
  selectedDate,
  onSelectDate,
  direction,
  view,
}) {
  let days
  if (view === 'week') {
    const weekStart = startOfWeek(selectedDate || currentDate)
    days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  } else {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    days = eachDayOfInterval({ start: calStart, end: calEnd })
  }

  return (
    <div className="px-4 sm:px-8 pb-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-semibold text-white/70 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentDate.toISOString() + view}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`grid grid-cols-7 gap-1.5 sm:gap-2 ${
            view === 'week' ? '' : ''
          }`}
        >
          {days.map((day) => (
            <DayCell
              key={day.toISOString()}
              date={day}
              currentMonth={currentDate}
              isSelected={
                selectedDate &&
                day.toDateString() === selectedDate.toDateString()
              }
              onClick={onSelectDate}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
