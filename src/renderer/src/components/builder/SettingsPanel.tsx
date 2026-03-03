import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { usePresentationStore } from '../../stores/presentationStore'
import { ToolVisibilityPanel } from './ToolVisibilityPanel'
import type { PresentationSettings } from '../../types/presentation'

/**
 * Collapsible settings panel for the Builder assembly view.
 *
 * When collapsed: shows a one-line summary of current settings.
 * When expanded: shows tool visibility toggles, timestamp toggle, theme selector.
 * All changes auto-save immediately via the presentation store (no Apply button).
 */
export function SettingsPanel(): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  const activePresentation = usePresentationStore((s) => s.getActivePresentation())
  const updateSettings = usePresentationStore((s) => s.updateSettings)
  const updateToolCategoryVisibility = usePresentationStore((s) => s.updateToolCategoryVisibility)
  const updateToolOverride = usePresentationStore((s) => s.updateToolOverride)
  const toggleToolCategoryExpanded = usePresentationStore((s) => s.toggleToolCategoryExpanded)

  const settings = activePresentation?.settings
  if (!settings) return <></>

  // Build collapsed summary text
  const summary = useSummaryText(settings)

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-3)',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {/* Header (always visible) */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center cursor-pointer"
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          border: 'none',
          padding: 'var(--space-3) var(--space-4)',
          gap: 'var(--space-2)',
          textAlign: 'left'
        }}
      >
        {isExpanded ? (
          <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        ) : (
          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        )}
        <Settings size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginRight: 'var(--space-2)'
          }}
        >
          Settings
        </span>
        {!isExpanded && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {summary}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {/* Tool Visibility Section */}
          <div>
            <h4
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-2)'
              }}
            >
              Tool Visibility
            </h4>
            <ToolVisibilityPanel
              toolVisibility={settings.toolVisibility}
              onToggleCategory={updateToolCategoryVisibility}
              onToggleExpanded={toggleToolCategoryExpanded}
              onToggleTool={updateToolOverride}
            />
          </div>

          {/* Timestamps Section */}
          <div>
            <h4
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-2)'
              }}
            >
              Timestamps
            </h4>
            <label
              className="flex items-center cursor-pointer"
              style={{ gap: 'var(--space-2)', padding: 'var(--space-1) 0' }}
            >
              <input
                type="checkbox"
                checked={settings.showTimestamps}
                onChange={(e) => updateSettings({ showTimestamps: e.target.checked })}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                Show timestamps
              </span>
            </label>
          </div>

          {/* Theme Section */}
          <div>
            <h4
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-2)'
              }}
            >
              Preview Theme
            </h4>
            <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
              {(['light', 'dark', 'system'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => updateSettings({ theme: option })}
                  className="cursor-pointer"
                  style={{
                    backgroundColor:
                      settings.theme === option ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: settings.theme === option ? 'white' : 'var(--color-text-secondary)',
                    border:
                      settings.theme === option
                        ? '1px solid var(--color-accent)'
                        : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-1) var(--space-3)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: settings.theme === option ? 600 : 400,
                    transition: 'all 150ms ease'
                  }}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary text for collapsed state
// ---------------------------------------------------------------------------

function useSummaryText(settings: PresentationSettings): string {
  return useMemo(() => {
    const hiddenCount = settings.toolVisibility.filter((cat) => !cat.visible).length
    const parts: string[] = []

    if (hiddenCount > 0) {
      parts.push(`${hiddenCount} categor${hiddenCount === 1 ? 'y' : 'ies'} hidden`)
    } else {
      parts.push('all visible')
    }

    parts.push(settings.showTimestamps ? 'timestamps on' : 'timestamps off')
    parts.push(`${settings.theme} theme`)

    return parts.join(', ')
  }, [settings.toolVisibility, settings.showTimestamps, settings.theme])
}
