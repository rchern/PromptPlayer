import React, { useEffect, useRef, useState } from 'react'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => void
  className?: string
  inputClassName?: string
}

export function InlineEdit({
  value,
  onSave,
  className,
  inputClassName
}: InlineEditProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [value, isEditing])

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commitEdit = (): void => {
    const trimmed = draft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
  }

  const cancelEdit = (): void => {
    setIsEditing(false)
    setDraft(value)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={inputClassName}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitEdit()
          } else if (e.key === 'Escape') {
            cancelEdit()
          }
        }}
        style={{
          background: 'transparent',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-sm)',
          padding: '0 var(--space-1)',
          font: 'inherit',
          color: 'inherit',
          outline: 'none',
          width: '100%'
        }}
      />
    )
  }

  return (
    <span
      className={className}
      onClick={() => setIsEditing(true)}
      style={{
        cursor: 'text',
        borderBottom: '1px dashed transparent',
        transition: 'border-color 150ms ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderBottomColor = 'var(--color-text-muted)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderBottomColor = 'transparent'
      }}
    >
      {value}
    </span>
  )
}
