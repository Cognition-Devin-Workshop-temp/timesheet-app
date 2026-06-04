import { createContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('calendar-todo-theme') === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    try {
      localStorage.setItem('calendar-todo-theme', dark ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }, [dark])

  const toggle = () => setDark((d) => !d)

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export { ThemeContext }
