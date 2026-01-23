import { Dashboard } from './components/Dashboard'
import { TooltipProvider } from './components/ui/tooltip'
import { ThemeProvider } from './components/theme-provider'
import './index.css'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="kub-ui-theme">
      <TooltipProvider>
        <Dashboard />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
