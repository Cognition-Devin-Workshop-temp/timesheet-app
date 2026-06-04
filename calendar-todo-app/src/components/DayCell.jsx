import { format, isToday, isSameMonth } from 'date-fns'
import { motion } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'

export default function DayCell({ date, currentMonth, isSelected, onClick }) {
  const tasks = useTasks()
  const dateKey = format(date, 'yyyy-MM-dd')
  const dayTasks = tasks[dateKey] || []
  const today = isToday(date)
  const sameMonth = isSameMonth(date, currentMonth)
  const completedCount = dayTasks.filter((t) => t.completed).length
  const totalCount = dayTasks.length

  return (
    <motion.button
      layout
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(date)}
      className={`
        relative flex flex-col p-1.5 sm:p-2 rounded-2xl min-h-[80px] sm:min-h-[100px]
        backdrop-blur-md border transition-all duration-200 cursor-pointer text-left w-full
        ${isSelected
          ? 'bg-white/40 dark:bg-white/15 border-white/60 dark:border-white/30 shadow-xl ring-2 ring-white/40'
          : 'bg-[var(--color-glass)] dark:bg-[var(--color-glass-dark)] border-[var(--color-glass-border)] dark:border-[var(--color-glass-border-dark)] shadow-lg hover:shadow-xl'
        }
        ${!sameMonth ? 'opacity-40' : ''}
      `}
    >
      {/* Day number */}
      <span
        className={`
          text-xs sm:text-sm font-semibold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full
          ${today
            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
            : sameMonth
              ? 'text-white/90'
              : 'text-white/40'
          }
        `}
      >
        {format(date, 'd')}
      </span>

      {/* Task previews */}
      <div className="mt-1 flex-1 space-y-0.5 overflow-hidden">
        {dayTasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className={`
              text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded-md
              ${task.completed
                ? 'line-through text-white/40 bg-white/5'
                : 'text-white/80 bg-white/10 dark:bg-white/5'
              }
            `}
          >
            {task.text}
          </div>
        ))}
        {dayTasks.length > 3 && (
          <span className="text-[10px] text-white/50 px-1.5">
            +{dayTasks.length - 3} more
          </span>
        )}
      </div>

      {/* Task count badge */}
      {totalCount > 0 && (
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5">
          <span
            className={`
              text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full
              ${completedCount === totalCount
                ? 'bg-emerald-500/80 text-white'
                : 'bg-indigo-500/80 text-white'
              }
            `}
          >
            {completedCount}/{totalCount}
          </span>
        </div>
      )}
    </motion.button>
  )
}
