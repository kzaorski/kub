import { Dashboard } from './components/Dashboard'
import { TooltipProvider } from './components/ui/tooltip'
import './index.css'

function App() {
  return (
    <TooltipProvider>
      <Dashboard />
    </TooltipProvider>
  )
}

export default App
