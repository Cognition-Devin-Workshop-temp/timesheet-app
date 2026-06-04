import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Trash2, Pencil, X, Save } from 'lucide-react'
import { useTaskDispatch } from '../hooks/useTasks'

export default function TaskItem({ task, dateKey }) {
  const dispatch = useTaskDispatch()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)

  const handleToggle = () => {
    dispatch({ type: 'TOGGLE_TASK', payload: { date: dateKey, taskId: task.id } })
  }

  const handleDelete = () => {
    dispatch({ type: 'DELETE_TASK', payload: { date: dateKey, taskId: task.id } })
  }

  const handleSave = () => {
    if (editText.trim()) {
      dispatch({
        type: 'EDIT_TASK',
        payload: { date: dateKey, taskId: task.id, text: editText.trim() },
      })
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditText(task.text)
      setEditing(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex items-center gap-2 p-2.5 rounded-xl
        bg-white/10 dark:bg-white/5 backdrop-blur-sm
        border border-white/10 dark:border-white/5
        group hover:bg-white/15 dark:hover:bg-white/8 transition-colors"
    >
      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={handleToggle}
        className={`
          flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center
          transition-all duration-200 cursor-pointer
          ${task.completed
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-white/30 hover:border-white/60'
          }
        `}
      >
        {task.completed && <Check size={14} strokeWidth={3} />}
      </motion.button>

      {/* Text / Edit input */}
      {editing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 bg-white/10 dark:bg-white/5 text-white rounded-lg px-2.5 py-1
            border border-white/20 focus:border-white/40 outline-none text-sm"
        />
      ) : (
        <span
          className={`flex-1 text-sm transition-all duration-200 ${
            task.completed
              ? 'line-through text-white/40'
              : 'text-white/90'
          }`}
        >
          {task.text}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-400 cursor-pointer"
            >
              <Save size={14} />
            </button>
            <button
              onClick={() => { setEditText(task.text); setEditing(false) }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-white/10 text-red-400 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
