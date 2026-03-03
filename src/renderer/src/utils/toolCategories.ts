// Tool category definitions and default settings factory.
//
// TOOL_CATEGORIES maps all classified tools from src/main/pipeline/classifier.ts
// into user-friendly groups for the settings panel. Tool names must exactly match
// the PLUMBING_TOOLS and NARRATIVE_TOOLS sets in the classifier.
//
// The "Other" category (empty tools array) acts as a catch-all for unknown tools.
// Per decision 02-01: unknown tools default to shown (safe behavior).

import type { PresentationSettings, ToolCategoryConfig } from '../types/presentation'

// ---------------------------------------------------------------------------
// Tool Category Definitions
// ---------------------------------------------------------------------------

/**
 * Categories derived from classifier.ts PLUMBING_TOOLS and NARRATIVE_TOOLS.
 *
 * Plumbing tools (defaultVisible: false):
 *   Read, Grep, Glob, Write, Edit, Bash, Task, TaskOutput, TaskStop,
 *   Skill, EnterPlanMode, ExitPlanMode, EnterWorktree, NotebookEdit,
 *   WebFetch, WebSearch
 *
 * Narrative tools (defaultVisible: true):
 *   AskUserQuestion, TaskCreate, TaskUpdate, TaskList
 *
 * Note: Task Management groups both plumbing (Task, TaskOutput, TaskStop) and
 * narrative (TaskCreate, TaskUpdate, TaskList) tools. Category defaults to hidden
 * because the majority are plumbing. Users can expand and override individual tools.
 */
export const TOOL_CATEGORIES: Array<{
  name: string
  tools: string[]
  defaultVisible: boolean
}> = [
  {
    name: 'File Operations',
    tools: ['Read', 'Write', 'Edit', 'Glob', 'NotebookEdit'],
    defaultVisible: false
  },
  {
    name: 'Search',
    tools: ['Grep', 'WebSearch', 'WebFetch'],
    defaultVisible: false
  },
  {
    name: 'Shell',
    tools: ['Bash'],
    defaultVisible: false
  },
  {
    name: 'Task Management',
    tools: ['Task', 'TaskOutput', 'TaskStop', 'TaskCreate', 'TaskUpdate', 'TaskList'],
    defaultVisible: false
  },
  {
    name: 'User Interaction',
    tools: ['AskUserQuestion'],
    defaultVisible: true
  },
  {
    name: 'Planning',
    tools: ['Skill', 'EnterPlanMode', 'ExitPlanMode', 'EnterWorktree'],
    defaultVisible: false
  },
  {
    name: 'Other',
    tools: [],
    defaultVisible: true
  }
]

// ---------------------------------------------------------------------------
// Default Settings Factory
// ---------------------------------------------------------------------------

/**
 * Generate default PresentationSettings from TOOL_CATEGORIES.
 *
 * Plumbing categories start hidden, narrative categories start visible.
 * The "Other" catch-all defaults to visible (unknown tools shown by default).
 * All categories start collapsed (expanded: false) with no per-tool overrides.
 */
export function getDefaultSettings(): PresentationSettings {
  return {
    toolVisibility: TOOL_CATEGORIES.map(
      (cat): ToolCategoryConfig => ({
        categoryName: cat.name,
        tools: [...cat.tools],
        defaultVisible: cat.defaultVisible,
        visible: cat.defaultVisible,
        expanded: false,
        toolOverrides: {}
      })
    ),
    showTimestamps: false,
    theme: 'system'
  }
}
