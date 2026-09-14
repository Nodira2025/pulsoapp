import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'

type Theme = 'system' | 'light' | 'dark'
const ThemeContext = createContext<{ theme: Theme; setTheme: (value: Theme) => void }>({
  theme: 'system',
  setTheme: () => {},
})
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const value = localStorage.getItem('pulso-theme')
      return value === 'dark' || value === 'light' ? value : 'system'
    } catch {
      return 'system'
    }
  })
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#010819' : '#f5f6fa')
    }
    apply()
    try {
      localStorage.setItem('pulso-theme', theme)
    } catch {
      /* Device storage can be disabled. */
    }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export function ThemeControl({ full = false }: { full?: boolean }) {
  const { theme, setTheme } = useContext(ThemeContext)
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  return (
    <label className={`theme-control ${full ? 'theme-full' : ''}`}>
      <Icon size={18} />
      <select
        aria-label="Apariencia"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        <option value="system">Sistema</option>
        <option value="light">Modo día</option>
        <option value="dark">Modo noche</option>
      </select>
    </label>
  )
}
