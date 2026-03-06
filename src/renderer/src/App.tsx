import React, { useEffect, useState } from 'react'
import { createHashRouter, RouterProvider, Outlet, useNavigate } from 'react-router'
import { Titlebar } from './components/Titlebar/Titlebar'
import { Home } from './routes/Home'
import { Builder } from './routes/Builder'
import { Player } from './routes/Player'
import { useTheme } from './hooks/useTheme'
import { usePlaybackStore } from './stores/playbackStore'
import { useAppStore } from './stores/appStore'

// ---------------------------------------------------------------------------
// Auto-update banner styles (module-level constants)
// ---------------------------------------------------------------------------

const updateBannerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-4)',
  right: 'var(--space-4)',
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-3) var(--space-4)',
  backgroundColor: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-accent)',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
}

const updateBannerButtonStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-1) var(--space-3)',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  cursor: 'pointer',
}

const dismissButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
  padding: 'var(--space-1)',
  fontSize: 'var(--text-xs)',
}

const reminderStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-3)',
  right: 'var(--space-3)',
  zIndex: 100,
  backgroundColor: 'var(--color-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-1) var(--space-3)',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  cursor: 'pointer',
  opacity: 0.8,
}

function RootLayout(): React.JSX.Element {
  useTheme()
  const navigate = useNavigate()
  const loadPresentation = usePlaybackStore((s) => s.loadPresentation)
  const addRecentFile = useAppStore((s) => s.addRecentFile)

  // Auto-update notification state
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)

  // Listen for open-file events from the main process (OS file association).
  // When a .promptplay file is opened via double-click or second-instance,
  // read its contents, load into the playback store, and navigate to Player.
  useEffect(() => {
    const cleanup = window.electronAPI.onOpenFile(async (filePath) => {
      try {
        const data = await window.electronAPI.readPromptPlayFile(filePath)
        loadPresentation(data.presentation, data.sessions)
        addRecentFile(filePath)
        navigate('/player')
      } catch (err) {
        console.error('Failed to open .promptplay file:', err)
      }
    })
    return cleanup
  }, [navigate, loadPresentation, addRecentFile])

  // Listen for auto-update ready events from main process.
  // Shows a banner when an update is downloaded. Auto-dismisses after 30s.
  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | undefined
    const cleanup = window.electronAPI.onUpdateReady((version: string) => {
      setUpdateVersion(version)
      setUpdateDismissed(false)
      dismissTimer = setTimeout(() => setUpdateDismissed(true), 30_000)
    })
    return () => {
      cleanup()
      if (dismissTimer) clearTimeout(dismissTimer)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Auto-update notification banner */}
      {updateVersion && !updateDismissed && (
        <div style={updateBannerStyle}>
          <span>Update v{updateVersion} ready — restart to apply</span>
          <button
            style={updateBannerButtonStyle}
            onClick={() => window.electronAPI.installUpdate()}
          >
            Restart Now
          </button>
          <button
            style={dismissButtonStyle}
            onClick={() => setUpdateDismissed(true)}
          >
            Later
          </button>
        </div>
      )}

      {/* Reminder indicator after dismiss */}
      {updateVersion && updateDismissed && (
        <button
          style={reminderStyle}
          onClick={() => setUpdateDismissed(false)}
          title={`Update v${updateVersion} ready`}
        >
          Update available
        </button>
      )}
    </div>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'builder',
        element: <Builder />
      },
      {
        path: 'player',
        element: <Player />
      }
    ]
  }
])

function App(): React.JSX.Element {
  return <RouterProvider router={router} />
}

export default App
