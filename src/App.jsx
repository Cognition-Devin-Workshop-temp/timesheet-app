import { TaskProvider } from './context/TaskContext'
import { ThemeProvider } from './context/ThemeContext'
import CalendarContainer from './components/CalendarContainer'

export default function App() {
  return (
    <ThemeProvider>
      <TaskProvider>
        <CalendarContainer />
      </TaskProvider>
    </ThemeProvider>
  )
}
