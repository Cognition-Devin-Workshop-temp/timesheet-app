import { createContext, useReducer, useEffect } from 'react'

const TaskContext = createContext(null)
const TaskDispatchContext = createContext(null)

const STORAGE_KEY = 'calendar-todo-tasks'

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // Storage full or unavailable
  }
}

let nextId = Date.now()

function taskReducer(state, action) {
  switch (action.type) {
    case 'ADD_TASK': {
      const { date, text } = action.payload
      const existing = state[date] || []
      return {
        ...state,
        [date]: [...existing, { id: nextId++, text, completed: false }],
      }
    }
    case 'EDIT_TASK': {
      const { date, taskId, text } = action.payload
      return {
        ...state,
        [date]: (state[date] || []).map((t) =>
          t.id === taskId ? { ...t, text } : t
        ),
      }
    }
    case 'DELETE_TASK': {
      const { date, taskId } = action.payload
      const filtered = (state[date] || []).filter((t) => t.id !== taskId)
      if (filtered.length === 0) {
        const newState = { ...state }
        delete newState[date]
        return newState
      }
      return { ...state, [date]: filtered }
    }
    case 'TOGGLE_TASK': {
      const { date, taskId } = action.payload
      return {
        ...state,
        [date]: (state[date] || []).map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        ),
      }
    }
    case 'MOVE_TASK': {
      const { fromDate, toDate, taskId } = action.payload
      const task = (state[fromDate] || []).find((t) => t.id === taskId)
      if (!task) return state
      const fromFiltered = (state[fromDate] || []).filter(
        (t) => t.id !== taskId
      )
      const toTasks = [...(state[toDate] || []), task]
      const newState = { ...state, [toDate]: toTasks }
      if (fromFiltered.length === 0) {
        delete newState[fromDate]
      } else {
        newState[fromDate] = fromFiltered
      }
      return newState
    }
    default:
      return state
  }
}

export function TaskProvider({ children }) {
  const [tasks, dispatch] = useReducer(taskReducer, null, loadTasks)

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  return (
    <TaskContext.Provider value={tasks}>
      <TaskDispatchContext.Provider value={dispatch}>
        {children}
      </TaskDispatchContext.Provider>
    </TaskContext.Provider>
  )
}

export { TaskContext, TaskDispatchContext }
