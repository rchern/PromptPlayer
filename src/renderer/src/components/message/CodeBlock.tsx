import { useRef, useEffect, useState } from 'react'

/** Map common language identifiers to display names */
const LANG_DISPLAY: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  tsx: 'TSX',
  jsx: 'JSX',
  python: 'Python',
  py: 'Python',
  bash: 'Shell',
  shell: 'Shell',
  sh: 'Shell',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  csharp: 'C#',
  cs: 'C#',
  sql: 'SQL',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
  markdown: 'Markdown',
  md: 'Markdown',
  go: 'Go',
  rust: 'Rust',
  diff: 'Diff',
  plaintext: 'Text',
  text: 'Text'
}

function getLanguageDisplayName(lang: string): string {
  return LANG_DISPLAY[lang.toLowerCase()] ?? lang.charAt(0).toUpperCase() + lang.slice(1)
}

interface CodeBlockProps {
  language: string | undefined
  children: React.ReactNode
}

export function CodeBlock({ language, children }: CodeBlockProps): React.JSX.Element {
  const preRef = useRef<HTMLPreElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  useEffect(() => {
    const el = preRef.current
    if (!el) return

    const check = (): void => {
      setHasOverflow(el.scrollHeight > el.clientHeight)
    }

    check()

    // Re-check when shiki async highlighting completes and mutates the DOM
    const observer = new MutationObserver(check)
    observer.observe(el, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return (
    <div className={`code-block-wrapper${hasOverflow ? ' has-overflow' : ''}`}>
      {language && <span className="code-block-lang">{getLanguageDisplayName(language)}</span>}
      <pre ref={preRef}>{children}</pre>
    </div>
  )
}
