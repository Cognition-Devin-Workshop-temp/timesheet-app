import { useContext } from 'react'
import { TaskContext, TaskDispatchContext } from '../context/TaskContext'

export function useTasks() {
  return useContext(TaskContext)
}

export function useTaskDispatch() {
  return useContext(TaskDispatchContext)
}
