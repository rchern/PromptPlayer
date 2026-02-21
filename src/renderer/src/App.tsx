import React from 'react'
import { createHashRouter, RouterProvider } from 'react-router'
import { Titlebar } from './components/Titlebar/Titlebar'
import { Home } from './routes/Home'
import { Builder } from './routes/Builder'
import { Player } from './routes/Player'
import { useTheme } from './hooks/useTheme'

const router = createHashRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/builder',
    element: <Builder />
  },
  {
    path: '/player',
    element: <Player />
  }
])

function App(): React.JSX.Element {
  useTheme()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Titlebar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <RouterProvider router={router} />
      </main>
    </div>
  )
}

export default App
