import React, { useCallback, useState } from 'react'
import { Merge } from 'lucide-react'
import { usePresentationStore } from '../../stores/presentationStore'
import { InlineEdit } from './InlineEdit'
import { SectionHeader } from './SectionHeader'
import { SessionEntry } from './SessionEntry'

export function PresentationOutline(): React.JSX.Element {
  const {
    getActivePresentation,
    renamePresentation,
    renameSection,
    renameSessionRef,
    removeSession,
    mergeSections
  } = usePresentationStore()

  const presentation = getActivePresentation()

  // Local state for merge selection (not in global store)
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set())

  const handleToggleSelect = useCallback((sectionId: string): void => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const handleMerge = useCallback((): void => {
    if (selectedSectionIds.size < 2) return
    mergeSections(Array.from(selectedSectionIds))
    setSelectedSectionIds(new Set())
  }, [selectedSectionIds, mergeSections])

  // Empty state
  if (!presentation) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          flex: 1,
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-base)'
        }}
      >
        No presentation selected
      </div>
    )
  }

  return (
    <div
      className="flex flex-col"
      style={{ flex: 1, overflow: 'hidden', gap: 'var(--space-3)' }}
    >
      {/* Presentation name (editable, large) */}
      <div style={{ flexShrink: 0 }}>
        <InlineEdit
          value={presentation.name}
          onSave={(name) => renamePresentation(presentation.id, name)}
          className=""
          inputClassName=""
        />
      </div>

      {/* Merge toolbar */}
      <div
        className="flex items-center"
        style={{ gap: 'var(--space-2)', flexShrink: 0 }}
      >
        <button
          onClick={handleMerge}
          disabled={selectedSectionIds.size < 2}
          className="flex items-center cursor-pointer"
          style={{
            backgroundColor: selectedSectionIds.size >= 2
              ? 'var(--color-accent)'
              : 'var(--color-bg-tertiary)',
            border: '1px solid ' + (selectedSectionIds.size >= 2
              ? 'var(--color-accent)'
              : 'var(--color-border)'),
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-1) var(--space-3)',
            fontSize: 'var(--text-sm)',
            color: selectedSectionIds.size >= 2
              ? 'white'
              : 'var(--color-text-muted)',
            gap: 'var(--space-2)',
            transition: 'all 150ms ease',
            opacity: selectedSectionIds.size < 2 ? 0.6 : 1
          }}
        >
          <Merge size={14} />
          Merge Selected
        </button>
        {selectedSectionIds.size > 0 && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)'
            }}
          >
            {selectedSectionIds.size} section{selectedSectionIds.size !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* Section list */}
      <div
        className="flex flex-col"
        style={{ flex: 1, overflowY: 'auto', minHeight: 0, gap: 'var(--space-2)' }}
      >
        {presentation.sections.map((section) => (
          <div
            key={section.id}
            className="flex flex-col"
            style={{ gap: 'var(--space-1)' }}
          >
            <SectionHeader
              section={section}
              isSelected={selectedSectionIds.has(section.id)}
              onToggleSelect={handleToggleSelect}
              onRename={renameSection}
            />
            {section.sessionRefs.map((ref) => (
              <SessionEntry
                key={ref.sessionId}
                sessionRef={ref}
                sectionId={section.id}
                onRename={renameSessionRef}
                onRemove={removeSession}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
