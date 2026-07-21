import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <AutoThemeManager />
      {children}
    </NextThemesProvider>
  )
}

function AutoThemeManager() {
  const { setTheme } = useTheme()
  const lastHourRef = React.useRef(new Date().getHours())
  const hasInitializedRef = React.useRef(false)

  React.useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      const hour = new Date().getHours()
      if (hour >= 19 || hour < 7) {
        setTheme('dark')
      } else {
        setTheme('light')
      }
    }

    const interval = setInterval(() => {
      const currentHour = new Date().getHours()
      const prevHour = lastHourRef.current
      lastHourRef.current = currentHour

      if (prevHour < 19 && currentHour >= 19) {
        setTheme('dark')
      } else if (prevHour < 7 && currentHour >= 7) {
        setTheme('light')
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [setTheme])

  return null
}
