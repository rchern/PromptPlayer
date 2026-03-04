import React from 'react'
import { Search, LayoutGrid, List } from 'lucide-react'
import type { DateFilter, DatePreset } from '../../utils/sessionFiltering'

interface SearchFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
  viewMode: 'grouped' | 'chronological'
  onViewModeChange: (mode: 'grouped' | 'chronological') => void
  totalCount: number
  filteredCount: number
}

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'last-7-days' },
  { label: 'Last 30 days', value: 'last-30-days' },
  { label: 'Older', value: 'older' },
  { label: 'Custom', value: 'custom' }
]

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount
}: SearchFilterBarProps): React.JSX.Element {
  const isFiltered = searchQuery !== '' || dateFilter.preset !== 'all'

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
      {/* Main bar */}
      <div
        className="flex items-center"
        style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}
      >
        {/* Search input */}
        <div
          className="flex items-center"
          style={{
            flex: '1 1 200px',
            minWidth: '180px',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0 var(--space-3)',
            gap: 'var(--space-2)',
            height: '34px'
          }}
        >
          <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search sessions..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>

        {/* Date preset buttons (segmented control) */}
        <div
          className="flex items-center"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '2px',
            gap: '1px',
            flexShrink: 0
          }}
        >
          {DATE_PRESETS.map((preset) => {
            const isActive = dateFilter.preset === preset.value
            return (
              <button
                key={preset.value}
                onClick={() => onDateFilterChange({ preset: preset.value })}
                className="cursor-pointer"
                style={{
                  backgroundColor: isActive ? 'var(--color-bg-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-1) var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  transition: 'all 150ms ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* View toggle */}
        <div
          className="flex items-center"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '2px',
            gap: '1px',
            flexShrink: 0
          }}
        >
          <button
            onClick={() => onViewModeChange('grouped')}
            className="flex items-center justify-center cursor-pointer"
            title="Project-grouped view"
            style={{
              backgroundColor: viewMode === 'grouped' ? 'var(--color-bg-elevated)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-1)',
              color: viewMode === 'grouped' ? 'var(--color-accent)' : 'var(--color-text-muted)',
              transition: 'all 150ms ease',
              width: '28px',
              height: '28px'
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => onViewModeChange('chronological')}
            className="flex items-center justify-center cursor-pointer"
            title="Chronological view"
            style={{
              backgroundColor: viewMode === 'chronological' ? 'var(--color-bg-elevated)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-1)',
              color: viewMode === 'chronological' ? 'var(--color-accent)' : 'var(--color-text-muted)',
              transition: 'all 150ms ease',
              width: '28px',
              height: '28px'
            }}
          >
            <List size={14} />
          </button>
        </div>

        {/* Result count */}
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {isFiltered
            ? `${filteredCount} of ${totalCount} sessions`
            : `${totalCount} sessions`}
        </span>
      </div>

      {/* Custom date range row */}
      {dateFilter.preset === 'custom' && (
        <div className="flex items-center" style={{ gap: 'var(--space-2)', paddingLeft: 'var(--space-1)' }}>
          <label
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)'
            }}
          >
            From
          </label>
          <input
            type="date"
            value={dateFilter.customStart ?? ''}
            onChange={(e) =>
              onDateFilterChange({
                ...dateFilter,
                customStart: e.target.value || undefined
              })
            }
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-1) var(--space-2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)'
            }}
          />
          <label
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)'
            }}
          >
            To
          </label>
          <input
            type="date"
            value={dateFilter.customEnd ?? ''}
            onChange={(e) =>
              onDateFilterChange({
                ...dateFilter,
                customEnd: e.target.value || undefined
              })
            }
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-1) var(--space-2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>
      )}
    </div>
  )
}
