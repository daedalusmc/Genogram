import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { GenogramCanvas } from './components/canvas/GenogramCanvas'
import { Toolbar } from './components/toolbar/Toolbar'
import { PersonFormPanel } from './components/panels/PersonFormPanel'
import { PresentationMode } from './components/presentation/PresentationMode'
import { Legend } from './components/ui/Legend'
import { useGenogramStore } from './store/genogramStore'

function AppContent() {
  const ui = useGenogramStore((s) => s.ui)
  const loadFromLocalStorage = useGenogramStore((s) => s.loadFromLocalStorage)

  // Load saved data on mount
  useEffect(() => {
    loadFromLocalStorage()
  }, [loadFromLocalStorage])

  // Apply dark class to document root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', ui.isDarkMode)
  }, [ui.isDarkMode])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <Toolbar />

      {/* Relationship mode banner */}
      {ui.isAddingRelationship && (
        <div className="px-4 py-2 text-sm text-center"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', borderBottom: '1px solid var(--border)' }}>
          Click on another person to create the relationship. Press Escape or click the background to cancel.
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex relative min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative">
          <GenogramCanvas />
          <Legend />
          <PresentationMode />
        </div>

        {/* Side panel */}
        {ui.isPanelOpen && !ui.isPresentationMode && (
          <PersonFormPanel />
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  )
}
