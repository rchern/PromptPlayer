# Stack Research: PromptPlayer

> **Research date**: 2026-02-20
> **Researcher**: Claude Opus 4.6 (agent)
> **Status**: Complete — versions marked with (*) need verification (web search unavailable during research)

---

## 1. Executive Summary

**Recommended stack**: Electron + React + TypeScript

PromptPlayer is a single-user Windows desktop tool that reads JSONL files and renders markdown-heavy conversation content for presentation. The stack must optimize for: (1) excellent markdown rendering, (2) fast development velocity, (3) rock-solid filesystem access, and (4) presentation-quality visuals. Electron + React is the clear winner because the web rendering engine is the best platform for rich markdown/code display, the ecosystem for this exact use case is mature, and the tradeoffs Electron carries (bundle size, memory) are irrelevant for a single-user presenter tool.

---

## 2. Candidates Evaluated

| Option | Verdict | Confidence |
|--------|---------|------------|
| **Electron + React** | **RECOMMENDED** | 96% |
| Tauri v2 + React | Viable but adds friction | 88% |
| Local web server + browser | Works but feels unprofessional | 82% |
| Pure Node CLI (Ink/terminal UI) | Insufficient for presentation | 70% |
| .NET MAUI / WPF | Wrong ecosystem for markdown rendering | 75% |

---

## 3. Detailed Analysis

### 3.1 Electron + React (RECOMMENDED)

**Confidence: 96%**

#### Why Electron wins for this project

1. **Markdown rendering is a solved problem in the browser.** Libraries like `react-markdown`, `remark`, and `rehype` have years of maturity. Code syntax highlighting via `shiki` or `highlight.js` works perfectly. No other platform comes close to the quality and flexibility of HTML/CSS for rendering rich text.

2. **Filesystem access is trivial.** Node.js `fs` module reads JSONL files natively. No bridge, no IPC complexity for simple file reads.

3. **Presentation-quality visuals.** CSS gives you full control over typography, spacing, animations, and responsive layout. For a projector/screen-share scenario, you can fine-tune font sizes, contrast, and transitions in ways that native toolkits make painful.

4. **Development velocity.** You are primarily a C#/T-SQL developer, but you know JavaScript/TypeScript. The React ecosystem has the most tutorials, examples, and StackOverflow answers. Hot-reload via Vite makes iteration fast.

5. **Single-user, not distributed.** Electron's main downsides (200MB+ bundle, high memory usage) are irrelevant. This app runs on the presenter's machine, not distributed to end users who would care about download size.

6. **Mature tooling.** Electron Forge handles building, packaging, and code signing. No need to wrangle complex build pipelines.

#### Why not Electron

- **Bundle size ~200MB+** — irrelevant for this use case (single machine, not distributed)
- **Memory usage ~150-300MB** — irrelevant for a presenter machine with 16GB+ RAM
- **"Electron is bloated" reputation** — a cultural objection, not a technical one for this project

#### Specific libraries

| Layer | Library | Version* | Rationale |
|-------|---------|----------|-----------|
| Runtime | **Electron** | ^34.0.0* | Latest stable as of early 2025. LTS support, Chromium 132+. |
| Framework | **React** | ^19.0.0* | React 19 is stable. Hooks-only, no class components needed. |
| Language | **TypeScript** | ^5.7.0* | Type safety for JSONL parsing and message type discrimination. Non-negotiable. |
| Bundler | **Vite** | ^6.0.0* | Fastest dev server. Electron-Vite plugin integrates cleanly. |
| Electron tooling | **electron-vite** | ^3.0.0* | Official Vite integration for Electron. Handles main/renderer/preload builds. |
| Packaging | **Electron Forge** | ^7.6.0* | Official packaging tool. SQUIRREL.WINDOWS for installer. |
| Markdown rendering | **react-markdown** | ^9.0.0* | Renders markdown to React components. Extensible via remark/rehype plugins. |
| Markdown parsing | **remark-gfm** | ^4.0.0* | GitHub Flavored Markdown: tables, strikethrough, task lists. |
| Code highlighting | **shiki** | ^1.24.0* | VS Code's syntax highlighter. Best-in-class code rendering. Supports all languages. |
| JSON handling | Built-in | — | `JSON.parse()` per line. No library needed for JSONL. |
| State management | **Zustand** | ^5.0.0* | Minimal, TypeScript-friendly. Perfect for "current step index" + "loaded sessions" state. |
| Styling | **Tailwind CSS** | ^4.0.0* | Utility-first CSS. Fast to prototype presentation layouts. |
| Keyboard shortcuts | **mousetrap** or **hotkeys-js** | ^1.6.5 / ^3.13.0* | Bind arrow keys, spacebar for step navigation. |
| Icons | **Lucide React** | ^0.460.0* | Clean, consistent icon set. MIT licensed. |

### 3.2 Tauri v2 + React (RUNNER-UP)

**Confidence: 88%**

#### Why Tauri was considered

- **Tiny bundle (~5-10MB)** — impressive, but irrelevant for this use case.
- **Lower memory footprint (~30-50MB)** — nice, but irrelevant.
- **Rust backend** — powerful, but you'd be learning Rust for a tool that just reads files and serves JSON.

#### Why Tauri loses

1. **You don't know Rust.** Tauri v2's backend is Rust. For filesystem access, you'd need to write Rust commands or use Tauri's plugin system. For a senior C#/TS developer, this is unnecessary friction on a project where velocity matters.

2. **WebView2 rendering inconsistencies.** Tauri on Windows uses Microsoft's WebView2 (Edge/Chromium). While mostly compatible, there are subtle CSS rendering differences and debugging is harder than Electron's built-in DevTools.

3. **Smaller ecosystem.** Fewer examples, fewer tutorials, fewer StackOverflow answers. When you hit a wall at 11pm, Electron has 10x more community resources.

4. **IPC complexity.** Tauri requires explicit IPC commands between the Rust backend and the web frontend. Electron's contextBridge is simpler for "read a file and send it to the renderer."

5. **The benefits don't apply.** Tauri's advantages (small binary, low memory, security sandbox) solve problems PromptPlayer doesn't have.

### 3.3 Local Web Server + Browser

**Confidence: 82%**

#### Approach
Run a local Express/Fastify server, open `localhost:3000` in the presenter's browser.

#### Why it loses

1. **Unprofessional appearance.** A browser tab with `localhost:3000` in the URL bar, bookmarks visible, notification popups — this looks amateurish in a presentation.
2. **No kiosk mode control.** You can use `--kiosk` flags, but it's fragile and platform-dependent.
3. **Two processes to manage.** Start the server, then open the browser. More steps = more things to go wrong during a live demo.
4. **No tray icon, no window title control.** Minor, but presentation polish matters.

#### When this would be the right choice
If you wanted zero packaging overhead and were demoing to developers who wouldn't care about polish. Not this project.

### 3.4 Pure Node CLI / Terminal UI (Ink, Blessed)

**Confidence: 70%**

#### Why it loses

1. **Markdown rendering in terminals is terrible.** Terminal markdown libraries (`marked-terminal`, `cli-markdown`) produce mediocre output. No images, limited tables, no syntax highlighting themes.
2. **Font size / readability.** Terminal font size is hard to control for projector/screen-share scenarios. You'd be fighting the terminal emulator.
3. **No rich layout.** Can't do side-by-side panels, expandable sections, or smooth transitions.
4. **Audience perception.** Non-developer audience members (PMs, BAs) would find a terminal presentation intimidating.

#### When this would be the right choice
If the audience were exclusively terminal-native developers and you wanted maximum simplicity. Not this project.

### 3.5 .NET MAUI / WPF

**Confidence: 75%**

#### Why it was considered
You're a C# developer. Using your strongest language has appeal.

#### Why it loses

1. **Markdown rendering in WPF/MAUI is painful.** There's no equivalent to `react-markdown`. You'd use a WebView2 control anyway, which means you're embedding a browser — at which point, just use Electron.
2. **MAUI is still unstable on Windows.** Desktop MAUI has had persistent quality issues through 2024-2025.
3. **WPF is legacy.** Still works, but the ecosystem is shrinking. Finding modern WPF libraries for markdown/code rendering is increasingly difficult.
4. **You'd end up embedding a web view anyway.** For rich markdown + code highlighting, the web rendering engine is simply better.

---

## 4. Recommended Architecture

```
PromptPlayer/
  src/
    main/              # Electron main process
      index.ts         # App entry, window creation
      file-loader.ts   # JSONL file reading, session chain loading
    preload/
      index.ts         # contextBridge: expose file APIs to renderer
    renderer/          # React app
      App.tsx
      components/
        MessageView/   # Renders a single conversation message
        StepControls/  # Forward/back/position indicator
        SessionChain/  # Shows which session in the chain
        ToolCallView/  # Renders tool calls (AskUser, Task, etc.)
        MarkdownBlock/ # Markdown rendering wrapper
      hooks/
        useSession.ts  # Session loading and navigation logic
        useKeyboard.ts # Keyboard shortcut bindings
      stores/
        playerStore.ts # Zustand store: current position, loaded data
      types/
        conversation.ts # TypeScript types for JSONL message format
      styles/
        presentation.css # Projector-optimized typography
  electron.vite.config.ts
  package.json
  tsconfig.json
  tailwind.config.ts
```

### Data Flow

```
JSONL files on disk
    |
    v
Main process (file-loader.ts)
    | reads files, parses JSONL, validates structure
    v
IPC via contextBridge (preload/index.ts)
    | exposes: loadSession(path), loadChain(config)
    v
Renderer (React)
    | Zustand store holds parsed messages + current index
    v
Components render current message
    | react-markdown + shiki for content
    | Custom components for tool calls
    v
Keyboard/click handlers advance index
```

---

## 5. What NOT to Use

| Technology | Why Not |
|------------|---------|
| **Next.js** | Server-side rendering framework. PromptPlayer has no server, no routes, no SEO. Pure overhead. |
| **Svelte/SvelteKit** | Smaller ecosystem than React. Your existing JS knowledge is React-shaped. |
| **Vue** | Same reasoning as Svelte — less ecosystem familiarity for you. |
| **Redux** | Overkill for this state complexity. Zustand does the same job in 1/10th the code. |
| **MobX** | More complex than needed. Zustand is simpler. |
| **Webpack** | Slower than Vite for development. No reason to use it in 2026. |
| **electron-builder** | Less maintained than Electron Forge. Forge is the official recommendation. |
| **Neutralino.js** | Tiny community, limited documentation, risky for anything beyond a toy project. |
| **NW.js** | Legacy. Electron won the desktop web app war. |
| **Marked** (for markdown) | `react-markdown` integrates with React's component model. `marked` outputs raw HTML strings, which means `dangerouslySetInnerHTML`. |
| **highlight.js** | Shiki produces better output with VS Code themes. highlight.js requires runtime processing; shiki can do build-time. |
| **Prettier** (for code display) | Prettier is a formatter, not a highlighter. Don't confuse them. |
| **Tailwind v3** | v4 is stable and has significant improvements. No reason to start on v3. |

---

## 6. Version Verification Needed

> **Important**: Web search and npm were unavailable during this research. The versions marked with (*) above are based on knowledge up to May 2025. Before starting development, verify the following:

```bash
# Run these commands to get current latest versions
npm view electron version
npm view react version
npm view typescript version
npm view vite version
npm view electron-vite version
npm view @electron-forge/cli version
npm view react-markdown version
npm view remark-gfm version
npm view shiki version
npm view zustand version
npm view tailwindcss version
npm view lucide-react version
npm view @tauri-apps/cli version   # for reference only
```

The specific major versions recommended (Electron 34+, React 19, Vite 6, TypeScript 5.7+) are likely still current, but minor/patch versions may have advanced.

---

## 7. Key Decision Rationale Summary

| Decision | Why |
|----------|-----|
| Electron over Tauri | You don't know Rust; Electron's downsides (size, memory) are irrelevant for a single-user presenter tool |
| Electron over local web server | Professional window chrome, single process, no URL bar visible |
| React over Svelte/Vue | Your existing familiarity; largest ecosystem for markdown rendering components |
| TypeScript over JavaScript | JSONL parsing with discriminated unions (`type: "user" \| "assistant" \| "progress"`) demands type safety |
| Vite over Webpack | 10-50x faster HMR; Webpack has no advantages for a greenfield project in 2026 |
| Zustand over Redux | Two pieces of state (loaded sessions, current index). Redux is 10x the boilerplate for 1/10th the complexity. |
| Shiki over highlight.js | VS Code theme compatibility. Your audience knows VS Code; code should look familiar. |
| react-markdown over marked | React component integration. No `dangerouslySetInnerHTML`. Plugin ecosystem (remark/rehype). |
| Tailwind over CSS Modules/Styled Components | Fast prototyping. Presentation layout needs rapid iteration on spacing, typography, colors. |
| Electron Forge over electron-builder | Official Electron team recommendation. Better maintained, better documented. |

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Electron version churn | Low | Pin major version. Electron's API surface for this app (window, file dialog, IPC) is stable. |
| JSONL format changes in Claude Code | Medium | Define TypeScript types strictly. Write a validation layer that warns on unknown message types rather than crashing. |
| Shiki bundle size (all languages) | Low | Import only needed languages (markdown, typescript, json, bash, python, csharp). |
| React 19 breaking changes | Low | React 19 is stable. This app uses basic hooks (useState, useEffect, useCallback). No exotic patterns. |
| Tailwind v4 migration pain | Low | Greenfield project, no migration. Start on v4 from day one. |

---

## 9. Development Environment Prerequisites

Before starting:

1. **Node.js**: LTS version (v22.x* recommended)
2. **npm** or **pnpm**: pnpm recommended for faster installs and disk efficiency
3. **Git**: Already initialized in the project
4. **VS Code extensions**: ESLint, Tailwind CSS IntelliSense, TypeScript, Prettier

---

*Last updated: 2026-02-20*
