import React from 'react'
import { createHashRouter, RouterProvider, Outlet } from 'react-router'
import { Titlebar } from './components/Titlebar/Titlebar'
import { Home } from './routes/Home'
import { Builder } from './routes/Builder'
import { Player } from './routes/Player'
import { useTheme } from './hooks/useTheme'

function RootLayout(): React.JSX.Element {
  useTheme()

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
