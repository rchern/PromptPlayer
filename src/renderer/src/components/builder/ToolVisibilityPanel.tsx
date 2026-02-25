import React from 'react'
import { ChevronRight, ChevronDown, Eye, EyeOff } from 'lucide-react'
import type { ToolCategoryConfig } from '../../types/presentation'

interface ToolVisibilityPanelProps {
  toolVisibility: ToolCategoryConfig[]
  onToggleCategory: (categoryName: string, visible: boolean) => void
  onToggleExpanded: (categoryName: string) => void
  onToggleTool: (categoryName: string, toolName: string, visible: boolean) => void
}

/**
 * Two-level tool visibility toggles: categories with expand-to-individual overrides.
 *
 * Each category row shows a chevron (expand), name, tool count badge, and toggle.
 * Expanding a category reveals individual tool toggles underneath. Per-tool overrides
 * take precedence over the category-level setting.
 */
export function ToolVisibilityPanel({
  toolVisibility,
  onToggleCategory,
  onToggleExpanded,
  onToggleTool
}: ToolVisibilityPanelProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {toolVisibility.map((category) => (
        <div key={category.categoryName}>
          {/* Category row */}
          <div
            className="flex items-center"
            style={{
              gap: 'var(--space-2)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'default'
            }}
          >
            {/* Expand chevron (only if category has tools to expand) */}
            {category.tools.length > 0 ? (
              <button
                onClick={() => onToggleExpanded(category.categoryName)}
                className="flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '2px',
                  color: 'var(--color-text-muted)',
                  flexShrink: 0
                }}
                title={category.expanded ? 'Collapse' : 'Expand individual tools'}
              >
                {category.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span style={{ width: 18, flexShrink: 0 }} />
            )}

            {/* Category name */}
            <span
              style={{
                flex: 1,
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-primary)'
              }}
            >
              {category.categoryName}
            </span>

            {/* Tool count badge */}
            {category.tools.length > 0 && (
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                {category.tools.length} tool{category.tools.length !== 1 ? 's' : ''}
              </span>
            )}

            {/* Category toggle */}
            <ToggleSwitch
              checked={category.visible}
              onChange={(checked) => onToggleCategory(category.categoryName, checked)}
              label={`Toggle ${category.categoryName} visibility`}
            />
          </div>

          {/* Expanded individual tools */}
          {category.expanded && category.tools.length > 0 && (
            <div
              style={{
                paddingLeft: 'var(--space-8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px'
              }}
            >
              {category.tools.map((toolName) => {
                const isVisible = category.toolOverrides[toolName] ?? category.visible
                return (
                  <div
                    key={toolName}
                    className="flex items-center"
                    style={{
                      gap: 'var(--space-2)',
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {/* Tool visibility icon */}
                    {isVisible ? (
                      <Eye size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    ) : (
                      <EyeOff size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    )}

                    {/* Tool name */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 'var(--text-xs)',
                        color: isVisible ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'
                      }}
                    >
                      {toolName}
                    </span>

                    {/* Per-tool toggle */}
                    <ToggleSwitch
                      checked={isVisible}
                      onChange={(checked) => onToggleTool(category.categoryName, toolName, checked)}
                      label={`Toggle ${toolName} visibility`}
                      small
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle Switch (compact CSS-only toggle)
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  small?: boolean
}

function ToggleSwitch({ checked, onChange, label, small }: ToggleSwitchProps): React.JSX.Element {
  const width = small ? 28 : 34
  const height = small ? 16 : 20
  const dotSize = small ? 12 : 16

  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="cursor-pointer"
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: height / 2,
        border: 'none',
        backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
        transition: 'background-color 150ms ease',
        flexShrink: 0,
        padding: 0
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: (height - dotSize) / 2,
          left: checked ? width - dotSize - (height - dotSize) / 2 : (height - dotSize) / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: 'white',
          transition: 'left 150ms ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}
      />
    </button>
  )
}
