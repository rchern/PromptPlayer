# Phase 3: Message Rendering - Research

**Researched:** 2026-02-21
**Domain:** React markdown rendering, syntax highlighting, presentation typography
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Must be optimized for projector readability -- clear at 10+ feet
- Must also work well for screen share (Teams/Zoom viewers on their own monitors)
- Must look clean and professional for a demo audience
- The classifier from Phase 2 already categorizes tools as plumbing/narrative/unknown -- this phase consumes that classification
- **Projector-first design** -- primary viewing context is conference room / large screen at 10+ feet

### Claude's Discretion
- **Message layout & visual distinction** -- layout approach (chat bubbles vs full-width blocks), role indicators (labels, icons, color), visual distinction strategy
- **Long messages and thinking blocks** -- how to handle very long Claude responses, whether thinking blocks are hidden entirely or available as collapsed toggle
- **Markdown & code block presentation** -- markdown fidelity level, code block styling (line numbers, language badges, copy buttons), file path treatment, long code block handling
- **Tool call display** -- how plumbing tools appear (invisible/collapsed/dimmed), how visible tool calls render, whether runtime toggle is Phase 3 or Phase 7, how much tool results to show
- **Presentation typography** -- font choices, content density, content width, base font size and scale

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase renders parsed conversation messages as a visually distinct, presentation-quality conversation view optimized for projector and screen-share readability. The core technology stack is react-markdown 10.x for markdown rendering with remark-gfm for GitHub Flavored Markdown support, and @shikijs/rehype (from shiki 3.x) for syntax highlighting integrated directly into the rehype pipeline. Tailwind CSS (already in the project) handles layout and typography.

The research confirmed that react-markdown 10.1.0 is fully compatible with React 19, supports custom components via the `components` prop for fine-grained control over code blocks and other elements, and integrates cleanly with rehype plugins including @shikijs/rehype for syntax highlighting. Shiki 3.22.0 provides VS Code-quality syntax highlighting with dual-theme support (light/dark), fine-grained bundling to control bundle size, and a rehype plugin that operates at the AST level -- meaning no `dangerouslySetInnerHTML` is needed.

For presentation typography, the research recommends a minimum 20px base font size (equivalent to ~15pt), with code blocks at 18px minimum. Content should be constrained to a max-width column (800-900px) centered on screen for optimal readability at distance. The design should use full-width blocks (not chat bubbles) for Claude responses to maximize content area, with compact user message styling that visually separates turns.

**Primary recommendation:** Use react-markdown 10.x + remark-gfm + @shikijs/rehype for the rendering pipeline, with full-width block layout, 20px+ base font, and high-contrast dual themes (github-light/github-dark).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | ^10.1.0 | Markdown-to-React rendering | De facto React markdown renderer; 4,800+ dependents; React 19 compatible; safe (no dangerouslySetInnerHTML); plugin-extensible via remark/rehype |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown | Tables, strikethrough, task lists, autolinks -- all common in Claude's output |
| @shikijs/rehype | ^3.22.0 | Syntax highlighting via rehype plugin | Official shiki rehype integration; operates at AST level; dual-theme support; fine-grained bundling |
| shiki | ^3.22.0 | Syntax highlighting engine | VS Code's engine; 150+ languages; best-in-class code rendering; all audiences know VS Code themes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @shikijs/langs/* | ^3.22.0 | Individual language grammars | Fine-grained bundle: import only languages Claude Code commonly outputs |
| @shikijs/themes/* | ^3.22.0 | Individual themes | Fine-grained bundle: import only the 2-4 themes we need |
| lucide-react | ^0.575.0 (already installed) | Icons | Role indicators, collapse/expand toggles, tool call badges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @shikijs/rehype (rehype plugin) | react-shiki (React component) | react-shiki (v0.9.1) wraps shiki as a React component used in the `code` custom component. Simpler setup but v0.x maturity. @shikijs/rehype is official shiki team, v3.x, operates at AST level before React rendering. **Use @shikijs/rehype.** |
| @shikijs/rehype | rehype-pretty-code (v0.14.1) | rehype-pretty-code adds line highlighting, word highlighting, titles. Nice features but v0.x maturity and adds complexity. Our use case is display-only, not interactive. **Use @shikijs/rehype.** |
| shiki | highlight.js | highlight.js is smaller bundle but worse output quality. Shiki produces VS Code-identical output. For a presentation tool, quality > bundle size. **Use shiki.** |
| react-markdown | markdown-to-jsx | markdown-to-jsx is lighter but less plugin ecosystem. react-markdown's remark/rehype plugin system is critical for shiki integration. **Use react-markdown.** |

**Installation:**
```bash
npm install react-markdown remark-gfm @shikijs/rehype shiki
```

Note: shiki is a dependency of @shikijs/rehype, but listing it explicitly ensures we can import fine-grained bundles directly.

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
  components/
    message/
      MessageBubble.tsx       # Single message container (role-aware styling)
      MessageList.tsx          # Renders array of messages with filtering
      UserMessage.tsx          # User message presentation
      ClaudeMessage.tsx        # Claude message with markdown rendering
      ThinkingBlock.tsx        # Collapsed thinking block toggle
      ToolCallBlock.tsx        # Tool call display (visible tools)
      ToolCallSummary.tsx      # Collapsed plumbing tool summary
      CodeBlock.tsx            # Custom code block with language badge
      MarkdownRenderer.tsx     # react-markdown wrapper with all plugins configured
    message/index.ts          # Barrel export
  styles/
    message.css               # Message-specific CSS variables and styles
    code-highlight.css        # Shiki dual-theme CSS overrides
```

### Pattern 1: Centralized Markdown Renderer Component
**What:** A single `MarkdownRenderer` component that wraps react-markdown with all plugins and custom components pre-configured. All markdown rendering goes through this component.
**When to use:** Every time Claude's text content needs rendering.
**Example:**
```typescript
// Source: react-markdown docs + @shikijs/rehype docs
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'

interface MarkdownRendererProps {
  content: string
}

const shikiOptions = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  }
}

export function MarkdownRenderer({ content }: MarkdownRendererProps): React.JSX.Element {
  return (
    <div className="markdown-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeShiki, shikiOptions]]}
        components={{
          // Custom code block with language badge
          pre: ({ children, ...props }) => (
            <pre {...props} className="code-block-wrapper">
              {children}
            </pre>
          ),
          // Table wrapper for horizontal scroll on narrow screens
          table: ({ children, ...props }) => (
            <div className="table-wrapper">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
```

### Pattern 2: Content Block Dispatcher
**What:** A component that takes a ParsedMessage and dispatches each content block to the appropriate renderer based on block type. Handles the text/thinking/tool_use/tool_result discrimination.
**When to use:** Rendering a single message's content blocks.
**Example:**
```typescript
import type { ContentBlock, ToolVisibility } from '../../types/pipeline'

interface ContentBlockRendererProps {
  block: ContentBlock
  toolVisibility: ToolVisibility | null
  showPlumbing: boolean
}

export function ContentBlockRenderer({
  block,
  toolVisibility,
  showPlumbing
}: ContentBlockRendererProps): React.JSX.Element | null {
  switch (block.type) {
    case 'text':
      return <MarkdownRenderer content={block.text} />
    case 'thinking':
      return <ThinkingBlock content={block.thinking} />
    case 'tool_use':
      if (toolVisibility === 'plumbing' && !showPlumbing) return null
      return <ToolCallBlock name={block.name} input={block.input} />
    case 'tool_result':
      if (toolVisibility === 'plumbing' && !showPlumbing) return null
      return <ToolResultBlock content={block.content} isError={block.is_error} />
    case 'image':
      return null // Images not rendered in v1
    default:
      return null
  }
}
```

### Pattern 3: Message-Level Visibility Filtering
**What:** Filter messages at the list level based on toolVisibility before rendering. Plumbing messages are excluded entirely from the rendered list. Messages with mixed content (text + plumbing tool_use) still show the text.
**When to use:** Building the message list for display.
**Example:**
```typescript
function filterVisibleMessages(
  messages: ParsedMessage[],
  showPlumbing: boolean
): ParsedMessage[] {
  return messages.filter((msg) => {
    // Always show messages without tool classification (pure text, user messages)
    if (msg.toolVisibility === null) return true
    // Always show narrative tools
    if (msg.toolVisibility === 'narrative') return true
    // Show unknown tools (safe default from Phase 2)
    if (msg.toolVisibility === 'unknown') return true
    // Plumbing: only show if toggle is on
    if (msg.toolVisibility === 'plumbing') return showPlumbing
    return true
  })
}
```

### Pattern 4: Dual-Theme CSS for Shiki
**What:** Shiki's dual-theme output uses CSS variables. The app already uses `data-theme="dark"` on the root element. Map shiki's CSS variables to the app's theme system.
**When to use:** Always -- this is the CSS that makes shiki's syntax highlighting respond to the app's dark/light mode.
**Example:**
```css
/* Source: shiki.style/guide/dual-themes */

/* Light mode is default -- shiki outputs light theme colors as inline styles */

/* Dark mode -- switch to shiki's dark CSS variables */
[data-theme="dark"] .shiki,
[data-theme="dark"] .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

### Anti-Patterns to Avoid
- **Rendering markdown per-block instead of per-message:** Do NOT split a single text block into paragraphs and render each separately. The markdown parser needs the full text to resolve cross-references, lists, and nested structures.
- **Creating shiki highlighter instances per-component:** The highlighter is expensive to create. When using @shikijs/rehype, it manages its own internal instance. Do NOT create additional instances. If you need direct shiki access, use a singleton.
- **Using dangerouslySetInnerHTML for markdown:** react-markdown exists to avoid this. Never bypass it.
- **Chat bubble layout for Claude's long responses:** Chat bubbles waste horizontal space. Claude's responses can be 100+ lines of markdown. Use full-width blocks.
- **Small font sizes for "more content per screen":** This is a presentation tool, not a code editor. Readability at distance trumps information density.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown to React | Custom regex-based parser | react-markdown | Markdown has hundreds of edge cases (nested lists, reference links, HTML entities). Custom parsers break on real-world content. |
| GitHub Flavored Markdown | Custom table/strikethrough parser | remark-gfm plugin | GFM spec is complex (table alignment, task list checkboxes, autolinks). Plugin is spec-compliant. |
| Syntax highlighting | Custom token coloring | shiki via @shikijs/rehype | 150+ language grammars, VS Code theme compatibility, proper scope resolution. Custom highlighting handles maybe 5% of edge cases. |
| Code language detection | Regex on first line | shiki's language parameter | The language is already in the markdown fence (```typescript). react-markdown extracts it as className. |
| Dark/light theme switching for code | Manual color mapping | shiki dual themes | Shiki outputs CSS variables for both themes simultaneously. Just toggle one CSS selector. |
| Inline code vs block code detection | Custom heuristic | react-markdown's component props | react-markdown passes `inline` prop (pre v10) or you detect by checking if code is inside a `pre` element |

**Key insight:** Markdown rendering and syntax highlighting are mature, thoroughly-tested domains. The combination of react-markdown + remark/rehype plugins + shiki has been battle-tested by thousands of projects. Any custom solution will have worse edge-case handling and maintenance burden.

## Common Pitfalls

### Pitfall 1: @shikijs/rehype Async Loading and First-Render Flash
**What goes wrong:** Shiki loads language grammars and themes asynchronously. On first render, code blocks may flash unstyled before shiki processes them.
**Why it happens:** @shikijs/rehype initializes its internal highlighter lazily. The first code block triggers async loading.
**How to avoid:** Pre-load the highlighter by configuring @shikijs/rehype with fine-grained imports that are bundled at build time. Alternatively, add a CSS rule that styles `pre code` with a monospace font and background color before shiki processes it, so the flash is minimal.
**Warning signs:** Code blocks appearing as plain text momentarily, then snapping to highlighted.

### Pitfall 2: Shiki Bundle Size Bloat
**What goes wrong:** Importing `shiki` or `shiki/bundle/full` bundles ALL 150+ language grammars (~6.4MB minified, ~1.2MB gzipped). This is unnecessary overhead for a desktop app.
**Why it happens:** Default shiki import includes everything for convenience.
**How to avoid:** Use fine-grained bundling via `@shikijs/rehype/core` with explicit language and theme imports. Only import languages Claude Code commonly outputs: typescript, javascript, python, bash, json, css, html, markdown, csharp, go, rust, yaml, toml, sql, diff, jsx, tsx. That covers 95%+ of real usage.
**Warning signs:** Initial load time > 2 seconds, or Electron app memory usage unexpectedly high.

### Pitfall 3: react-markdown v10 className Removal
**What goes wrong:** Code from react-markdown v9 examples that uses `<Markdown className="...">` silently fails to apply the class.
**Why it happens:** react-markdown v10 removed the `className` prop. You must wrap in your own element.
**How to avoid:** Always wrap: `<div className="markdown-body"><Markdown>{content}</Markdown></div>`
**Warning signs:** Markdown content renders but has no wrapper styling.

### Pitfall 4: Inline Code vs Block Code Discrimination in v10
**What goes wrong:** The `inline` prop on the `code` component changed between react-markdown versions. In v10, the approach for detecting inline vs block code may differ from v9 examples found online.
**Why it happens:** react-markdown v10 changed how props are passed to custom components.
**How to avoid:** When using @shikijs/rehype, this is handled automatically -- the rehype plugin only processes code blocks inside `<pre>` elements. Inline code passes through unchanged. If you need custom code component logic, check if the parent node is a `pre` element.
**Warning signs:** Inline code snippets getting syntax-highlighted when they should be plain.

### Pitfall 5: Shiki Dual-Theme CSS Not Applied
**What goes wrong:** Code blocks always show light theme colors even in dark mode.
**Why it happens:** Shiki's dual-theme output embeds light theme colors as inline styles and dark theme colors as CSS variables (--shiki-dark). Without the CSS rule to activate the dark variables, only light theme shows.
**How to avoid:** Add the CSS shown in Pattern 4 above. Must use `!important` because shiki's inline styles have high specificity.
**Warning signs:** Code blocks look correct in light mode but wrong in dark mode.

### Pitfall 6: Long Code Blocks Breaking Presentation Layout
**What goes wrong:** A 200-line code block pushes all subsequent content far below the fold, making the presentation feel broken.
**Why it happens:** Code blocks render at full height by default.
**How to avoid:** Apply max-height with overflow-y: auto to code block containers. Recommended: 400-500px max-height for presentation mode. The audience can see the code structure without scrolling through every line.
**Warning signs:** Single code blocks consuming the entire viewport.

### Pitfall 7: Tool Call Filtering Leaves Empty Messages
**What goes wrong:** After filtering out plumbing tool calls, some messages have no visible content (e.g., an assistant message that only contained a Read tool call).
**Why it happens:** The message itself is shown, but all its content blocks are hidden.
**How to avoid:** Filter at the message level first (Pattern 3), not just at the block level. If a message's only content blocks are plumbing, hide the entire message.
**Warning signs:** Empty message bubbles/blocks in the conversation view.

### Pitfall 8: Thinking-Only Messages Not Hidden
**What goes wrong:** Messages that contain only thinking blocks (no text, no tools) appear as empty or confusing entries.
**Why it happens:** Phase 2 classifies thinking-only messages as `plumbing`, but the renderer might not check `toolVisibility` for messages without tool_use blocks.
**How to avoid:** The visibility filter (Pattern 3) already handles this correctly because Phase 2's classifier sets `toolVisibility: 'plumbing'` on thinking-only messages.
**Warning signs:** Empty or mysterious entries between real conversation messages.

## Code Examples

Verified patterns from official sources:

### Basic react-markdown with GFM and Shiki
```typescript
// Source: react-markdown GitHub README + @shikijs/rehype docs
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'

const SHIKI_OPTIONS = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
}

export function MarkdownRenderer({ content }: { content: string }): React.JSX.Element {
  return (
    <div className="markdown-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeShiki, SHIKI_OPTIONS]]}
      >
        {content}
      </Markdown>
    </div>
  )
}
```

### Message Component with Role Distinction
```typescript
// Recommendation based on project types and presentation requirements
import type { ParsedMessage } from '../../types/pipeline'

interface MessageBubbleProps {
  message: ParsedMessage
  showPlumbing: boolean
}

export function MessageBubble({ message, showPlumbing }: MessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        padding: 'var(--space-6) var(--space-8)',
        backgroundColor: isUser ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* Role indicator */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: isUser ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          marginBottom: 'var(--space-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {isUser ? 'You' : 'Claude'}
      </div>

      {/* Content blocks */}
      {message.contentBlocks.map((block, i) => (
        <ContentBlockRenderer
          key={i}
          block={block}
          toolVisibility={message.toolVisibility}
          showPlumbing={showPlumbing}
        />
      ))}
    </div>
  )
}
```

### Shiki Dual-Theme CSS
```css
/* Source: shiki.style/guide/dual-themes
   Maps to existing app theme system using data-theme attribute */

/* Code block base styling -- visible before shiki loads */
pre code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  line-height: 1.6;
}

pre.shiki {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  overflow-x: auto;
  max-height: 450px;
  overflow-y: auto;
}

/* Dark mode -- activate shiki's dark CSS variables */
[data-theme="dark"] .shiki,
[data-theme="dark"] .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

### Tool Call Block for Visible Tools
```typescript
// Recommendation for narrative/unknown tool call rendering
interface ToolCallBlockProps {
  name: string
  input: Record<string, unknown>
}

export function ToolCallBlock({ name, input }: ToolCallBlockProps): React.JSX.Element {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        marginTop: 'var(--space-3)',
        marginBottom: 'var(--space-3)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {name}
      </div>
      {/* Show abbreviated input for context */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          marginTop: 'var(--space-1)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {summarizeToolInput(name, input)}
      </div>
    </div>
  )
}

function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  // Show the most relevant field for each tool type
  if (name === 'AskUserQuestion' && typeof input.question === 'string') {
    return input.question.slice(0, 100)
  }
  if (typeof input.description === 'string') {
    return input.description.slice(0, 100)
  }
  // Fallback: first string value
  for (const val of Object.values(input)) {
    if (typeof val === 'string') return val.slice(0, 80)
  }
  return ''
}
```

## Discretionary Design Recommendations

Based on the research and the constraint "projector-first, screen-share-compatible", here are prescriptive recommendations for the areas left to Claude's discretion:

### Message Layout: Full-Width Blocks (Not Chat Bubbles)
**Recommendation:** Full-width block layout with alternating background colors.
**Rationale:**
- Chat bubbles waste 30-40% of horizontal space with alignment offsets and max-width constraints
- Claude's responses are often 50-200+ lines of markdown with code blocks, tables, and lists
- At projector distance, every pixel of readable width matters
- Full-width blocks with a subtle background shift (user = slightly tinted, Claude = default) give clear role distinction without wasting space
- Role labels ("You" / "Claude") at the top of each block provide unambiguous identification

### Thinking Blocks: Hidden with Collapsed Toggle
**Recommendation:** Hidden by default. Show a small, dimmed "Thinking..." indicator that can be expanded if needed.
**Rationale:**
- Thinking blocks are internal reasoning, not presentation content
- Completely hiding them loses context for why Claude made certain decisions
- A collapsed toggle satisfies curiosity without cluttering the presentation
- Phase 2 already classifies thinking-only messages as plumbing

### Long Messages: Full Render with Scroll
**Recommendation:** Render the full message. The container (from Phase 4's navigation) will handle viewport positioning. Do NOT truncate.
**Rationale:**
- Truncation loses content and requires extra interaction to see it
- The navigation system (Phase 4) controls which message is in view
- Individual code blocks should have max-height with scroll (450px), but the message itself renders fully
- The presenter controls pacing via stepping, so long messages are shown in full at their step

### Markdown Fidelity: Full GFM
**Recommendation:** Standard GFM via remark-gfm (headings, lists, bold, italic, links, tables, strikethrough, task lists).
**Rationale:** Claude regularly outputs all of these. Tables and task lists are especially common in GSD workflows.

### Code Block Styling
**Recommendation:**
- Language badge: Yes -- show the language name (small, top-right or top-left) so the audience knows what they are looking at
- Line numbers: No -- they add visual noise without value in a presentation context (no one references "line 47")
- Copy button: No -- this is a viewer, not a code editor. No one copies from a projector.
- Max height: 450px with overflow-y: auto and a subtle gradient fade at the bottom to hint "more below"
- File paths in tool results: Show as a muted, monospace label above the code block

### Tool Call Display
**Recommendation:**
- Plumbing tools (Read, Grep, Glob, Write, Edit, Bash): **Completely hidden** by default. No collapsed summary, no dimmed indicator. They are noise in a presentation.
- Narrative tools (AskUserQuestion, TaskCreate, TaskUpdate, TaskList): Show tool name + key input summary. Phase 9 will add specialized rich renderers.
- Unknown tools: Show tool name + basic input summary (same as narrative, safe default).
- Runtime toggle: **Defer to Phase 7** (Builder config). Phase 3 implements the `showPlumbing` prop plumbing so the toggle is easy to add later, but the UI toggle itself is Phase 7.
- Tool results for visible tools: Show a brief summary (first 2-3 lines or 200 chars), not the full result.

### Presentation Typography
**Recommendation:**
- **Font:** System font stack (already configured as `--font-sans`). Inter/system-ui for body text, JetBrains Mono/Cascadia Code for code (already configured as `--font-mono`). No bundled fonts needed -- these system stacks are excellent.
- **Base font size:** 20px for presentation mode body text. Current `--text-base` is 16px (1rem). Add a presentation-specific override or new CSS variable `--text-presentation-base: 1.25rem` (20px).
- **Content width:** Max-width 900px centered. Full-width on screens < 1200px. This gives optimal line length for readability (60-75 characters per line at 20px).
- **Content density:** Generous spacing. `--space-6` (1.5rem) between messages. `--space-4` (1rem) between content blocks within a message. `line-height: 1.7` for body text.
- **Headings:** Scale from `--text-2xl` (1.5rem / 24px) for h1 down to `--text-lg` (1.125rem / 18px) for h4+. Relative to presentation base.
- **Contrast:** Current theme.css colors already have excellent contrast (dark slate text on white/near-white backgrounds). Verify WCAG AAA (7:1 ratio) for presentation use.

### Presentation Typography Size Scale
| Element | Size | CSS Variable | Notes |
|---------|------|-------------|-------|
| Body text | 20px | --text-presentation-base | Readable at 10+ feet on 1080p projector |
| Code (inline) | 18px | 0.9em relative | Slightly smaller than body |
| Code (block) | 18px | 0.9em relative | Same as inline for consistency |
| h1 | 32px | --text-3xl or calc | Clear section headers |
| h2 | 28px | --text-2xl | Subsection headers |
| h3 | 24px | - | Minor headers |
| Role label | 14px | --text-sm | Small, uppercase, doesn't compete with content |
| Tool call name | 16px | --text-base | Monospace, accent colored |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| highlight.js for code | shiki 3.x | Shiki v1 (2024), v3 current | VS Code-quality output, dual themes, fine-grained bundles |
| react-markdown v9 with className prop | react-markdown v10 (className removed) | v10.0 (2024) | Must wrap Markdown in own element for className |
| react-syntax-highlighter (Prism) | @shikijs/rehype as rehype plugin | 2024-2025 | Direct AST integration, no component wrapper needed for basic highlighting |
| Single theme switching (re-render) | Shiki dual-theme CSS variables | Shiki v1+ | Both theme colors embedded in one render, CSS toggles them instantly |
| shiki/bundle/full (6.4MB) | Fine-grained @shikijs/langs/* imports | Shiki v3 | Import only needed languages, dramatically smaller bundles |

**Deprecated/outdated:**
- `react-syntax-highlighter`: Still works but heavier and less integrated than shiki's rehype plugin approach
- `highlight.js`: Lower quality output than shiki; still maintained but shiki is the modern choice
- react-markdown v9's `className` prop: Removed in v10; migrate to wrapper element pattern
- `CodeProps` type from `react-markdown/lib/ast-to-react`: Import path may have changed in v10; verify during implementation

## Open Questions

1. **Fine-grained shiki bundle: exact language list**
   - What we know: Claude Code commonly outputs typescript, javascript, python, bash, json, css, html, markdown, and a few others
   - What's unclear: The exact set of languages needed to cover 95%+ of real Claude Code output. The user works in C# and T-SQL, so those should be included.
   - Recommendation: Start with a broad set (~15-20 languages), measure bundle size. Can trim later. Include: typescript, javascript, tsx, jsx, python, bash, shell, json, css, html, markdown, csharp, sql, yaml, toml, go, rust, diff, xml, plaintext.

2. **@shikijs/rehype async initialization behavior**
   - What we know: @shikijs/rehype manages its own highlighter internally. First use triggers async loading.
   - What's unclear: Whether this causes a visible flash of unstyled code in an Electron app where all assets are local (no network latency).
   - Recommendation: Test during implementation. If flash occurs, either pre-warm the highlighter on app start or add CSS fallback styling for `pre code` before shiki processes it.

3. **react-markdown v10 component typing**
   - What we know: v10 removed className prop and changed some component prop signatures
   - What's unclear: Exact TypeScript types for custom code/pre components in v10. Old import paths (`react-markdown/lib/ast-to-react`) may not work.
   - Recommendation: During implementation, check the actual exported types from `react-markdown`. Use the `Components` type from the package root if available. May need to reference `ExtraProps` for the `node` prop.

4. **Mixed-content messages (text + tool_use in same message)**
   - What we know: Some assistant messages contain both text blocks AND tool_use blocks. Phase 2 classifies the entire message by the tool.
   - What's unclear: Whether to show the text portion of a plumbing-classified message (e.g., Claude says "Let me read that file" then calls Read).
   - Recommendation: Show the text block, hide the tool_use block. Text is always valuable for narrative flow. The content block dispatcher (Pattern 2) handles this naturally -- it checks visibility per-block, not per-message.

## Sources

### Primary (HIGH confidence)
- npm registry (via `npm view`) -- react-markdown 10.1.0, shiki 3.22.0, remark-gfm 4.0.1, @shikijs/rehype 3.22.0 versions and peer dependencies verified
- [react-markdown GitHub README](https://github.com/remarkjs/react-markdown) -- components prop API, plugin system, v10 changes
- [shiki.style/guide/install](https://shiki.style/guide/install) -- installation, createHighlighter, singleton pattern
- [shiki.style/guide/dual-themes](https://shiki.style/guide/dual-themes) -- CSS variable approach for light/dark themes
- [shiki.style/guide/best-performance](https://shiki.style/guide/best-performance) -- singleton pattern, fine-grained bundling, bundle size data
- [shiki.style/guide/bundles](https://shiki.style/guide/bundles) -- fine-grained import pattern, bundle size comparison (full: 6.4MB/1.2MB gz, web: 3.8MB/695KB gz)
- [shiki.style/packages/rehype](https://shiki.style/packages/rehype) -- @shikijs/rehype configuration, theme options, unified integration
- [react-markdown changelog](https://github.com/remarkjs/react-markdown/blob/main/changelog.md) -- v10 breaking changes (className removal)

### Secondary (MEDIUM confidence)
- [react-shiki GitHub](https://github.com/AVGVSTVS96/react-shiki) -- alternative React integration approach, component API
- [shiki GitHub issue #829](https://github.com/shikijs/shiki/issues/829) -- @shikijs/rehype with react-markdown community usage
- [remarkjs discussion #1278](https://github.com/orgs/remarkjs/discussions/1278) -- rehypePlugins configuration pattern
- [Understanding react-markdown components prop](https://www.singlehanded.dev/blog/understanding-the-components-prop-in-react-markdown) -- code component props, language extraction pattern
- [beautiful.ai presentation font guide](https://www.beautiful.ai/blog/what-font-size-is-best-for-presentations) -- minimum 24pt for body text on projectors
- [BrightCarbon font size guide](https://www.brightcarbon.com/blog/presentation-font-size/) -- 24-30pt minimum for presentation content

### Tertiary (LOW confidence)
- Web search results for react-markdown v10 TypeScript component types -- conflicting information between v9 and v10 documentation. Verify during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all library versions verified via npm, peer dependencies confirmed compatible, integration patterns documented in official sources
- Architecture: HIGH -- patterns are well-established (react-markdown components, rehype plugins, content block dispatch) and verified against existing project structure
- Pitfalls: HIGH -- documented from official sources (shiki performance guide, react-markdown changelog) and confirmed community reports
- Typography: MEDIUM -- font size recommendations are from presentation design guides (PowerPoint-focused), translated to CSS. Exact px values need validation on actual projector.

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days -- these are stable, mature libraries)
