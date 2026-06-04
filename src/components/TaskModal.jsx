import { useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, CalendarDays } from 'lucide-react'
import { useTasks, useTaskDispatch } from '../hooks/useTasks'
import TaskItem from './TaskItem'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
}

export default function TaskModal({ selectedDate, onClose }) {
  const tasks = useTasks()
  const dispatch = useTaskDispatch()
  const [newTask, setNewTask] = useState('')

  if (!selectedDate) return null

  const dateKey = format(selectedDate, 'yyyy-MM-dd')
  const dayTasks = tasks[dateKey] || []

  const handleAdd = () => {
    if (newTask.trim()) {
      dispatch({
        type: 'ADD_TASK',
        payload: { date: dateKey, text: newTask.trim() },
      })
      setNewTask('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') onClose()
  }

  const completedCount = dayTasks.filter((t) => t.completed).length

  return (
    <AnimatePresence>
      {selectedDate && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Side panel */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] z-50
              backdrop-blur-xl bg-white/20 dark:bg-[#1a1a3e]/80
              border-l border-white/20 dark:border-white/10
              shadow-2xl flex flex-col"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <CalendarDays size={14} />
                  <span>{format(selectedDate, 'EEEE')}</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </h2>
                {dayTasks.length > 0 && (
                  <p className="text-xs text-white/50 mt-1">
                    {completedCount} of {dayTasks.length} completed
                  </p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20
                  text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Add task input */}
            <div className="p-4 border-b border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a new task..."
                  className="flex-1 bg-white/10 dark:bg-white/5 text-white
                    placeholder-white/40 rounded-xl px-4 py-2.5
                    border border-white/15 focus:border-white/30
                    outline-none text-sm backdrop-blur-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAdd}
                  disabled={!newTask.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600
                    text-white font-medium text-sm shadow-lg shadow-indigo-500/25
                    disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Plus size={18} />
                </motion.button>
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {dayTasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-white/30"
                  >
                    <CalendarDays size={48} strokeWidth={1} />
                    <p className="mt-3 text-sm">No tasks for this day</p>
                    <p className="text-xs mt-1">Add a task above to get started</p>
                  </motion.div>
                ) : (
                  dayTasks.map((task) => (
                    <TaskItem key={task.id} task={task} dateKey={dateKey} />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            {dayTasks.length > 0 && (
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                  <span>Progress</span>
                  <span>{Math.round((completedCount / dayTasks.length) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(completedCount / dayTasks.length) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
