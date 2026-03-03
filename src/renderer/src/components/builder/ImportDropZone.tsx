import React, { useState, useCallback } from 'react'
import { Upload } from 'lucide-react'

interface ImportDropZoneProps {
  onImportFiles: (filePaths: string[]) => void
  children: React.ReactNode
}

export function ImportDropZone({ onImportFiles, children }: ImportDropZoneProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only hide overlay when leaving the container itself, not child elements
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (!files || files.length === 0) return

      // Filter for .jsonl files
      const jsonlFiles: File[] = []
      for (let i = 0; i < files.length; i++) {
        if (files[i].name.endsWith('.jsonl')) {
          jsonlFiles.push(files[i])
        }
      }

      if (jsonlFiles.length === 0) return

      // Use Electron's webUtils to get real file paths
      const filePaths = window.electronAPI.getFilePaths(
        files as unknown as FileList
      )
      // Filter paths to only include .jsonl files
      const jsonlPaths = filePaths.filter((p) => p.endsWith('.jsonl'))
      if (jsonlPaths.length > 0) {
        onImportFiles(jsonlPaths)
      }
    },
    [onImportFiles]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative', flex: 1, overflow: 'hidden', minHeight: 0 }}
    >
      {children}

      {/* Drop overlay */}
      {isDragOver && (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(13, 148, 136, 0.08)',
            border: '2px dashed var(--color-accent)',
            borderRadius: 'var(--radius-lg)',
            zIndex: 50,
            gap: 'var(--space-3)',
            pointerEvents: 'none'
          }}
        >
          <Upload size={32} style={{ color: 'var(--color-accent)' }} />
          <span
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              color: 'var(--color-accent)'
            }}
          >
            Drop JSONL files to import
          </span>
        </div>
      )}
    </div>
  )
}
