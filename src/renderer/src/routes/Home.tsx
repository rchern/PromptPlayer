import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Wrench, Play } from 'lucide-react'
import { ModeCard } from '../components/home/ModeCard'
import { RecentFiles } from '../components/home/RecentFiles'
import { usePlaybackStore } from '../stores/playbackStore'
import { useAppStore } from '../stores/appStore'

export function Home(): React.JSX.Element {
  const navigate = useNavigate()
  const loadPresentation = usePlaybackStore((s) => s.loadPresentation)
  const setRecentFiles = useAppStore((s) => s.setRecentFiles)
  const addRecentFile = useAppStore((s) => s.addRecentFile)

  // Load persisted recent files on mount
  useEffect(() => {
    window.electronAPI.getRecentFiles().then((files) => {
      setRecentFiles(files)
    })
  }, [setRecentFiles])

  const handleRecentFileOpen = async (filePath: string): Promise<void> => {
    try {
      const data = await window.electronAPI.readPromptPlayFile(filePath)
      loadPresentation(data.presentation, data.sessions)
      addRecentFile(filePath)
      navigate('/player')
    } catch (err) {
      console.error('Failed to open recent file:', err)
    }
  }

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
        <RecentFiles onOpenFile={handleRecentFileOpen} />
      </div>
    </div>
  )
}
