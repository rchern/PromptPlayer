import React, { useEffect } from 'react'
import { createHashRouter, RouterProvider, Outlet, useNavigate } from 'react-router'
import { Titlebar } from './components/Titlebar/Titlebar'
import { Home } from './routes/Home'
import { Builder } from './routes/Builder'
import { Player } from './routes/Player'
import { useTheme } from './hooks/useTheme'
import { usePlaybackStore } from './stores/playbackStore'

function RootLayout(): React.JSX.Element {
  useTheme()
  const navigate = useNavigate()
  const loadPresentation = usePlaybackStore((s) => s.loadPresentation)

  // Listen for open-file events from the main process (OS file association).
  // When a .promptplay file is opened via double-click or second-instance,
  // read its contents, load into the playback store, and navigate to Player.
  useEffect(() => {
    const cleanup = window.electronAPI.onOpenFile(async (filePath) => {
      try {
        const data = await window.electronAPI.readPromptPlayFile(filePath)
        loadPresentation(data.presentation, data.sessions)
        navigate('/player')
      } catch (err) {
        console.error('Failed to open .promptplay file:', err)
      }
    })
    return cleanup
  }, [navigate, loadPresentation])

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
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
