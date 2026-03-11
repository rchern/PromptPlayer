import { MarkdownHooks } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'
import { getSingletonHighlighter } from 'shiki'
import { isValidElement } from 'react'
import { CodeBlock } from './CodeBlock'

/**
 * Languages to load for syntax highlighting.
 * Without this, @shikijs/rehype defaults to ALL ~200 bundled grammars,
 * causing an 8+ second initialization delay. This curated list covers
 * languages commonly seen in Claude Code sessions.
 */
const SHIKI_LANGS = [
  'typescript', 'javascript', 'tsx', 'jsx',
  'json', 'html', 'xml', 'css', 'scss',
  'bash', 'shell', 'powershell',
  'python', 'sql', 'csharp',
  'markdown', 'yaml', 'toml',
  'diff', 'plaintext'
]

/**
 * Shiki dual-theme configuration.
 * Module-level constant to avoid re-creation on every render.
 * Light theme is used as the default; dark theme colors are stored as
 * CSS variables (--shiki-dark) and activated via CSS selector.
 */
const SHIKI_OPTIONS = {
  themes: {
    light: 'github-light',
    dark: 'github-dark'
  },
  langs: SHIKI_LANGS
}

// Pre-warm shiki singleton at module load time.
// @shikijs/rehype uses the same getSingletonHighlighter internally,
// so this ensures the WASM engine + themes + grammars are ready before first render.
getSingletonHighlighter({ themes: ['github-light', 'github-dark'], langs: SHIKI_LANGS })

/**
 * Remark plugins list -- stable reference to avoid re-processing.
 */
const REMARK_PLUGINS = [remarkGfm] as const

/**
 * Rehype plugins list -- stable reference.
 * Array-in-array pattern passes options to the plugin.
 */
const REHYPE_PLUGINS = [[rehypeShiki, SHIKI_OPTIONS]] as const

/**
 * Extract the language from a code element's className.
 * react-markdown sets className="language-xxx" on code elements inside pre.
 */
function extractLanguage(codeElement: React.ReactElement): string | undefined {
  const className = (codeElement.props as { className?: string }).className
  if (!className) return undefined
  const match = className.match(/language-(\S+)/)
  return match?.[1]
}

/**
 * Custom component overrides for react-markdown.
 * Module-level to keep a stable reference.
 */
const COMPONENTS = {
  pre: (props: React.JSX.IntrinsicElements['pre']): React.JSX.Element => {
    const { children, ...rest } = props
    // Check if child is a <code> element with a language class
    if (isValidElement(children)) {
      const language = extractLanguage(children as React.ReactElement)
      return (
        <CodeBlock language={language}>
          {children}
        </CodeBlock>
      )
    }
    // Fallback for non-standard content
    return <pre {...rest}>{children}</pre>
  },

  table: (props: React.JSX.IntrinsicElements['table']): React.JSX.Element => {
    const { children, ...rest } = props
    return (
      <div className="table-wrapper">
        <table {...rest}>{children}</table>
      </div>
    )
  }
}

interface MarkdownRendererProps {
  content: string
}

/**
 * Centralized markdown renderer with GFM and shiki syntax highlighting.
 *
 * Uses MarkdownHooks (not the sync Markdown component) because @shikijs/rehype
 * is an async plugin -- it lazily loads language grammars and themes via
 * getSingletonHighlighter. The sync Markdown component would silently skip
 * async rehype transformers.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps): React.JSX.Element {
  return (
    <div className="markdown-body message-view">
      <MarkdownHooks
        remarkPlugins={REMARK_PLUGINS as unknown as Parameters<typeof MarkdownHooks>[0]['remarkPlugins']}
        rehypePlugins={REHYPE_PLUGINS as unknown as Parameters<typeof MarkdownHooks>[0]['rehypePlugins']}
        components={COMPONENTS}
      >
        {content}
      </MarkdownHooks>
    </div>
  )
}
