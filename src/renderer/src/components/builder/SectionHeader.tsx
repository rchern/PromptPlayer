import React from 'react'
import { Layers } from 'lucide-react'
import type { PresentationSection } from '../../types/presentation'
import { InlineEdit } from './InlineEdit'

interface SectionHeaderProps {
  section: PresentationSection
  isSelected: boolean
  onToggleSelect: (sectionId: string) => void
  onRename: (sectionId: string, name: string) => void
}

export const SectionHeader = React.memo(function SectionHeader({
  section,
  isSelected,
  onToggleSelect,
  onRename
}: SectionHeaderProps): React.JSX.Element {
  const sessionCount = section.sessionRefs.length

  return (
    <div
      className="flex items-center"
      style={{
        padding: 'var(--space-2) var(--space-3)',
        gap: 'var(--space-3)',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        borderLeft: isSelected ? '3px solid var(--color-accent)' : '3px solid transparent'
      }}
    >
      {/* Merge selection checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(section.id)}
        style={{
          accentColor: 'var(--color-accent)',
          width: '15px',
          height: '15px',
          cursor: 'pointer',
          flexShrink: 0
        }}
      />

      {/* Section icon */}
      <Layers
        size={16}
        style={{ color: 'var(--color-accent)', flexShrink: 0 }}
      />

      {/* Section name (editable) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineEdit
          value={section.name}
          onSave={(name) => onRename(section.id, name)}
          className=""
        />
      </div>

      {/* Session count badge */}
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {sessionCount} session{sessionCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
})
