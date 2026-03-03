import React from 'react'
import { Wrench, Play } from 'lucide-react'
import { ModeCard } from '../components/home/ModeCard'
import { RecentFiles } from '../components/home/RecentFiles'

export function Home(): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        paddingTop: 'var(--space-16)',
        paddingBottom: 'var(--space-8)',
        paddingLeft: 'var(--space-8)',
        paddingRight: 'var(--space-8)',
        height: '100%'
      }}
    >
      {/* Mode cards - side by side */}
      <div
        className="flex"
        style={{
          gap: 'var(--space-8)',
          width: '100%',
          maxWidth: 700,
          justifyContent: 'center'
        }}
      >
        <ModeCard
          icon={Wrench}
          title="Builder"
          description="Import and curate Claude Code sessions into presentations"
          to="/builder"
        />
        <ModeCard
          icon={Play}
          title="Player"
          description="Step through presentations in a clean, focused view"
          to="/player"
        />
      </div>

      {/* Recent files */}
      <div style={{ width: '100%', maxWidth: 700 }}>
        <RecentFiles />
      </div>
    </div>
  )
}
