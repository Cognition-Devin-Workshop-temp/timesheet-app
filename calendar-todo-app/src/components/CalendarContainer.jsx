import { useState, useCallback, useEffect } from 'react'
import { addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'
import TaskModal from './TaskModal'

export default function CalendarContainer() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [direction, setDirection] = useState(0)
  const [view, setView] = useState('month')

  const navigate = useCallback(
    (dir) => {
      setDirection(dir)
      if (view === 'week') {
        setCurrentDate((d) => (dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1)))
      } else {
        setCurrentDate((d) => (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)))
      }
    },
    [view]
  )

  const handlePrev = useCallback(() => navigate(-1), [navigate])
  const handleNext = useCallback(() => navigate(1), [navigate])

  const handleSelectDate = useCallback((date) => {
    setSelectedDate(date)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedDate(null)
  }, [])

  const handleViewChange = useCallback((v) => {
    setView(v)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedDate) return // Don't navigate when modal is open
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDate, handlePrev, handleNext])

  return (
    <div className="min-h-screen flex flex-col">
      <CalendarHeader
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        view={view}
        onViewChange={handleViewChange}
      />
      <CalendarGrid
        currentDate={currentDate}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        direction={direction}
        view={view}
      />
      <TaskModal
        selectedDate={selectedDate}
        onClose={handleCloseModal}
      />
    </div>
  )
}
