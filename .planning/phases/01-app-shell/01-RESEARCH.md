# Phase 1: App Shell - Research

**Researched:** 2026-02-20
**Domain:** Electron + React + TypeScript scaffold, custom window chrome, home screen routing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two large side-by-side cards for Builder and Player modes (horizontally arranged, not stacked)
- Each card contains: icon, title, and one-line description of what the mode does
- Recent files list below the cards for quick access to previously opened .promptplay files
- Custom titlebar (frameless window with custom minimize/maximize/close controls)
- Titlebar includes app name and logo -- branded feel
- Default theme follows system light/dark setting
- Clean and minimal aesthetic with a subtle developer edge
- Teal accent color for buttons, active states, and highlights
- All colors defined as CSS variable theme tokens for easy developer-side changes
- User's favorite color is teal -- use as primary accent
- Colors should be trivially swappable via CSS variables (developer configurable, not user-facing settings)
- App is for presenting Claude Code workflows to dev teams -- content should be the star, not the UI

### Claude's Discretion
- Navigation architecture (full-screen modes vs persistent nav -- recommendation: full-screen for focus)
- Player chrome behavior during presentations (recommendation: auto-hide on idle)
- Fullscreen toggle support (recommendation: yes, F11-style for presentations)
- Window size defaults (recommendation: 80% of screen first launch, remember after)
- All detailed visual design decisions (spacing, radii, shadows, typography scale)
- Icon selection for Builder/Player cards (recommendation: simple, clean SVG icons)
- How users return to home from Builder/Player (home button vs menu)
- Specific font choices (clean sans-serif for UI, good monospace for code)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase scaffolds a new Electron + React + TypeScript application using electron-vite 5.0, creates a custom frameless window with branded titlebar controls, implements a home screen with two-mode routing (Builder and Player), and establishes the CSS variable theming system. The stack is well-established and all core libraries have current, stable releases.

The standard approach is: scaffold with `npm create @quick-start/electron@latest` using the `react-ts` template, configure a frameless `BrowserWindow` with `frame: false` and custom HTML/CSS window controls, use `react-router` v7 with `createHashRouter` for in-app routing (required for Electron's `file://` protocol), and implement CSS custom properties for the teal-accent theme with automatic light/dark detection via Electron's `nativeTheme` API.

Key recommendations for discretionary areas: use full-screen mode replacement (not persistent tabs) for Builder/Player navigation, default window to 80% of screen dimensions on first launch and persist size/position with `electron-store`, use Inter as the UI font and JetBrains Mono for code, and provide a home button in the titlebar for returning from Builder/Player modes.

**Primary recommendation:** Scaffold with electron-vite 5.0 react-ts template, use `frame: false` with fully custom titlebar, route with react-router v7 HashRouter, theme with CSS custom properties + nativeTheme detection.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | ^40.0.0 | Desktop app runtime | Latest stable (v40.6.0 as of 2026-02-20). Chromium M144, Node 22. Three latest majors supported (38, 39, 40). |
| React | ^19.0.0 | UI framework | Stable release, hooks-only. Best ecosystem for markdown rendering (needed in later phases). |
| TypeScript | ^5.7.0 | Type safety | Non-negotiable for JSONL parsing with discriminated unions. |
| electron-vite | ^5.0.0 | Build tooling | v5.0.0 released Dec 2024. Unified config for main/preload/renderer. Requires Node 20.19+ or 22.12+ and Vite 5.0+. |
| Vite | ^6.0.0 | Bundler/dev server | Fastest HMR. electron-vite 5 is compatible with Vite 5+ (Vite 6 works). |
| react-router | ^7.13.0 | Client-side routing | v7 unifies react-router and react-router-dom into single `react-router` package. Use `createHashRouter` for Electron. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-store | ^10.0.0 | Persist settings (window size, recent files) | Store window bounds, recent file paths. Requires Electron 30+. Native ESM. |
| zustand | ^5.0.11 | State management | App-level state: current mode (home/builder/player), theme, recent files list. |
| lucide-react | ^0.575.0 | Icon library | Builder/Player card icons, titlebar icons, navigation icons. Clean SVG icons, MIT licensed. |
| @tailwindcss/vite | ^4.2.0 | Utility CSS framework | Rapid layout prototyping. v4 uses CSS-first config (no tailwind.config.js). Includes `@theme` directive for design tokens. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `frame: false` (full custom) | `titleBarStyle: 'hidden'` + `titleBarOverlay: true` | titleBarOverlay gives native Windows controls with less code, but user wants fully branded custom controls. Use `frame: false` per user requirement. |
| react-router HashRouter | MemoryRouter | MemoryRouter works but loses URL state for debugging. HashRouter is the community standard for Electron. |
| electron-store | electron-window-state | electron-window-state is 7 years old (v5.0.3). electron-store is actively maintained and handles more than just window state. |
| Tailwind CSS v4 | Plain CSS with custom properties | Tailwind v4's `@theme` directive integrates naturally with CSS custom properties. Faster to prototype the home screen layout. |

**Installation:**
```bash
# Scaffold the project
npm create @quick-start/electron@latest prompt-player -- --template react-ts

# Navigate into project
cd prompt-player

# Install additional dependencies
npm install react-router zustand lucide-react electron-store

# Install Tailwind CSS v4 with Vite plugin
npm install tailwindcss @tailwindcss/vite
```

## Architecture Patterns

### Recommended Project Structure
```
prompt-player/
  src/
    main/                    # Electron main process
      index.ts               # App entry, BrowserWindow creation, IPC handlers
      window-state.ts        # Window size/position persistence with electron-store
      theme.ts               # nativeTheme detection, IPC to renderer
    preload/
      index.ts               # contextBridge: expose window controls + theme API
    renderer/
      src/
        App.tsx              # Router setup, theme provider
        main.tsx             # React entry point
        routes/
          Home.tsx           # Home screen with Builder/Player cards
          Builder.tsx        # Builder placeholder (Phase 1: just a shell)
          Player.tsx         # Player placeholder (Phase 1: just a shell)
        components/
          Titlebar/
            Titlebar.tsx     # Custom titlebar with app name, logo, nav, window controls
            WindowControls.tsx  # Minimize/maximize/close buttons
          home/
            ModeCard.tsx     # Builder or Player selection card
            RecentFiles.tsx  # Recent .promptplay files list
        hooks/
          useTheme.ts        # System theme detection hook
        stores/
          appStore.ts        # Zustand: current mode, theme, recent files
        styles/
          theme.css          # CSS custom properties (color tokens, spacing, typography)
          global.css         # Tailwind import + base styles
        types/
          electron.d.ts      # Type declarations for preload API
      index.html             # Renderer entry HTML
  electron.vite.config.ts    # electron-vite config (main, preload, renderer sections)
  package.json
  tsconfig.json
  tsconfig.node.json
  tsconfig.web.json
```

### Pattern 1: Frameless Window with Custom Controls (IPC Pattern)
**What:** Create a fully custom titlebar using `frame: false`, expose window control methods via contextBridge, wire up minimize/maximize/close from React components.
**When to use:** Always for this app -- user decided on custom titlebar with branded feel.
**Architecture:**
1. Main process: `BrowserWindow({ frame: false })`, register `ipcMain.on` handlers for `window:minimize`, `window:maximize`, `window:close`
2. Preload: `contextBridge.exposeInMainWorld('electronAPI', { minimize, maximize, close, isMaximized, onMaximizeChange })`
3. Renderer: React component calls `window.electronAPI.minimize()` etc.

### Pattern 2: HashRouter for Electron Routing
**What:** Use `createHashRouter` from react-router v7 for client-side navigation between Home, Builder, and Player views.
**When to use:** Always in Electron apps that load from `file://` protocol.
**Why:** `BrowserRouter` does not work when loading the page with `mainWindow.loadURL('file://path-on-disk.html')`. HashRouter uses `#/path` which works with file protocol.

### Pattern 3: CSS Custom Properties Theme System
**What:** Define all colors, spacing, and typography as CSS custom properties on `:root`, with a `[data-theme="dark"]` override selector. Detect system theme via Electron `nativeTheme.shouldUseDarkColors` and set the `data-theme` attribute on the document element.
**When to use:** This app -- user requires CSS variable tokens for easy swapping.
**Why:** CSS custom properties are live (browser recalculates instantly), work with Tailwind v4's `@theme` directive, and are trivially swappable by changing variable values.

### Pattern 4: Full-Screen Mode Replacement (Recommended for Discretion)
**What:** Home, Builder, and Player are full-screen routes that replace each other entirely. No persistent tab bar or sidebar. A home button in the titlebar provides the "back to home" affordance.
**When to use:** Focus-oriented apps where each mode deserves full attention.
**Why:** Builder and Player are deeply different workflows. Persistent navigation would waste space and add cognitive load. A presentation tool benefits from maximum content area.

### Anti-Patterns to Avoid
- **Exposing raw `ipcRenderer` to renderer:** Never pass `ipcRenderer.send` or `ipcRenderer.on` directly. Always wrap in specific named methods via `contextBridge`.
- **Using `sendSync()` for IPC:** Blocks the entire renderer. Use `ipcRenderer.invoke()` (async) or `ipcRenderer.send()` (fire-and-forget) instead.
- **Using `nodeIntegration: true`:** Security risk. Always use `contextIsolation: true` (default) with preload scripts.
- **Using BrowserRouter in Electron:** Will fail when loading from `file://`. Use HashRouter.
- **Hardcoding colors in components:** All colors must go through CSS custom properties per user requirement. Never use raw hex values in component styles.
- **Mixing theme logic across many files:** Centralize all theme definitions in one CSS file (`theme.css`). Components reference variables only.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window size persistence | Manual localStorage + resize listeners | `electron-store` with bounds tracking | Edge cases: multi-monitor, display disconnect, window off-screen after resolution change |
| System theme detection | Manual `matchMedia('prefers-color-scheme')` polling | Electron `nativeTheme.shouldUseDarkColors` + `updated` event | Works reliably on Windows, detects system-level changes, not just browser-level |
| Icon library | Custom SVG files | `lucide-react` | 1500+ consistent icons, tree-shakeable, TypeScript support, MIT licensed |
| CSS utility framework | Custom utility classes | Tailwind CSS v4 | Responsive design, consistent spacing scale, `@theme` integrates with CSS custom properties |
| Hash-based routing | Manual `window.location.hash` parsing | `react-router` v7 `createHashRouter` | Nested routes, route guards, lazy loading, community standard |
| Simple key-value persistence | Manual JSON file read/write | `electron-store` | Atomic writes (no corruption on crash), JSON Schema validation, migration support |

**Key insight:** Electron apps have unique constraints (IPC boundary, file:// protocol, multi-process architecture) that make web-only solutions unreliable. Use Electron-aware libraries.

## Common Pitfalls

### Pitfall 1: Forgetting `-webkit-app-region: no-drag` on Interactive Elements
**What goes wrong:** Buttons, links, and inputs inside the custom titlebar become unclickable because the entire titlebar is marked as a drag region.
**Why it happens:** `-webkit-app-region: drag` on the titlebar container makes ALL children draggable too.
**How to avoid:** Apply `-webkit-app-region: no-drag` to all interactive elements (buttons, inputs, links) inside the drag region. Do this with a CSS rule like `.titlebar a, .titlebar button { -webkit-app-region: no-drag; }`.
**Warning signs:** Can't click the minimize/maximize/close buttons or any titlebar navigation.

### Pitfall 2: BrowserRouter Fails Silently in Electron
**What goes wrong:** Routes don't load, app shows blank screen or 404-like state in production builds.
**Why it happens:** Electron loads the renderer from `file://` protocol. BrowserRouter expects a web server to handle URL paths. In production, `file:///C:/path/to/app/index.html/builder` is not a valid file path.
**How to avoid:** Use `createHashRouter` from react-router v7. URLs will be `file:///path/index.html#/builder` which works correctly.
**Warning signs:** Routes work in dev (Vite dev server) but break in production (packaged app).

### Pitfall 3: IPC Security -- Exposing Too Much
**What goes wrong:** Renderer gets access to arbitrary Node.js APIs, creating a security surface.
**Why it happens:** Developers expose `ipcRenderer` directly or use `nodeIntegration: true` for convenience.
**How to avoid:** Use `contextBridge.exposeInMainWorld` with specific, named methods. One method per action: `minimize()`, `maximize()`, `close()`, `getTheme()`. Never expose generic `send()` or `invoke()`.
**Warning signs:** Preload script contains `ipcRenderer.send` or `ipcRenderer.invoke` without wrapping.

### Pitfall 4: Window Maximize State Tracking
**What goes wrong:** The maximize/restore button icon doesn't update when user double-clicks the titlebar or snaps the window.
**Why it happens:** Window can be maximized via keyboard shortcuts, system gestures, or snapping -- not just the custom button click.
**How to avoid:** Listen to `BrowserWindow` `maximize` and `unmaximize` events in the main process. Send updates to renderer via IPC. The renderer should track `isMaximized` state reactively.
**Warning signs:** Maximize button shows wrong icon after window snap or keyboard shortcut.

### Pitfall 5: CSS Custom Properties Not Cascading in Electron
**What goes wrong:** Theme variables don't apply, components show wrong colors.
**Why it happens:** Electron's Content Security Policy (CSP) can block inline styles, or variables are defined on wrong scope.
**How to avoid:** Define variables on `:root` in a CSS file (not inline). Set CSP to allow `style-src 'self' 'unsafe-inline'` (acceptable for local Electron app). Verify with DevTools (Ctrl+Shift+I in Electron).
**Warning signs:** Variables show as undefined in DevTools computed styles.

### Pitfall 6: electron-store ESM Import Issues
**What goes wrong:** `require('electron-store')` fails. App crashes on startup.
**Why it happens:** electron-store v10+ is native ESM only, no CommonJS export.
**How to avoid:** Ensure your main process TypeScript compiles to ESM (electron-vite handles this by default). Use `import Store from 'electron-store'` not `require`.
**Warning signs:** `ERR_REQUIRE_ESM` error at startup.

## Code Examples

Verified patterns from official sources:

### BrowserWindow Configuration (Main Process)
```typescript
// Source: Electron docs - Window Customization + Custom Title Bar tutorial
// src/main/index.ts
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

const store = new Store()

function createWindow(): void {
  // Restore saved bounds or use defaults
  const savedBounds = store.get('windowBounds') as {
    width: number; height: number; x?: number; y?: number
  } | undefined

  const { screen } = require('electron')
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const defaultWidth = Math.round(screenW * 0.8)
  const defaultHeight = Math.round(screenH * 0.8)

  const mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? defaultWidth,
    height: savedBounds?.height ?? defaultHeight,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 800,
    minHeight: 600,
    frame: false,                    // Fully custom titlebar
    backgroundColor: '#ffffff',
    show: false,                     // Prevent flash of white
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,        // Security: always true
      nodeIntegration: false,        // Security: always false
      sandbox: false                 // Required for preload contextBridge
    }
  })

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Save window bounds on close
  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds())
  })

  // IPC: Window controls
  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow.close())
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized())

  // Notify renderer of maximize state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximizeChanged', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximizeChanged', false)
  })

  // IPC: Theme
  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)
  nativeTheme.on('updated', () => {
    mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
  })

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
```

### Preload Script (Context Bridge)
```typescript
// Source: Electron docs - Context Isolation + contextBridge
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value)
    ipcRenderer.on('window:maximizeChanged', handler)
    return () => ipcRenderer.removeListener('window:maximizeChanged', handler)
  },

  // Theme
  getTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeChange: (callback: (isDark: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value)
    ipcRenderer.on('theme:changed', handler)
    return () => ipcRenderer.removeListener('theme:changed', handler)
  }
})
```

### TypeScript Declarations for Preload API
```typescript
// src/renderer/src/types/electron.d.ts
export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  getTheme: () => Promise<boolean>
  onThemeChange: (callback: (isDark: boolean) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### Router Setup with createHashRouter
```typescript
// Source: react-router v7 docs + Electron community best practice
// src/renderer/src/App.tsx
import { createHashRouter, RouterProvider } from 'react-router'
import { Home } from './routes/Home'
import { Builder } from './routes/Builder'
import { Player } from './routes/Player'
import { Titlebar } from './components/Titlebar/Titlebar'

const router = createHashRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/builder',
    element: <Builder />
  },
  {
    path: '/player',
    element: <Player />
  }
])

export function App(): JSX.Element {
  return (
    <div className="app-container">
      <Titlebar />
      <main className="app-content">
        <RouterProvider router={router} />
      </main>
    </div>
  )
}
```

### CSS Custom Properties Theme System
```css
/* Source: CSS custom properties + light-dark() function best practices
   src/renderer/src/styles/theme.css */

/* ==============================
   COLOR TOKENS
   Change these values to re-theme the entire app.
   ============================== */
:root {
  /* Primary accent: teal */
  --color-accent: #0d9488;
  --color-accent-hover: #0f766e;
  --color-accent-light: #ccfbf1;
  --color-accent-subtle: #f0fdfa;

  /* Neutral palette */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-bg-elevated: #ffffff;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-border-subtle: #f1f5f9;

  /* Titlebar */
  --color-titlebar-bg: #f8fafc;
  --color-titlebar-text: #334155;
  --color-titlebar-btn-hover: #e2e8f0;
  --color-titlebar-close-hover: #ef4444;
  --color-titlebar-close-text: #ffffff;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Titlebar height */
  --titlebar-height: 36px;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --color-accent: #14b8a6;
  --color-accent-hover: #2dd4bf;
  --color-accent-light: #134e4a;
  --color-accent-subtle: #042f2e;

  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  --color-bg-elevated: #1e293b;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-border: #334155;
  --color-border-subtle: #1e293b;

  --color-titlebar-bg: #0f172a;
  --color-titlebar-text: #cbd5e1;
  --color-titlebar-btn-hover: #334155;
  --color-titlebar-close-hover: #ef4444;
  --color-titlebar-close-text: #ffffff;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);

  color-scheme: dark;
}
```

### Custom Titlebar Component
```tsx
// Source: Electron docs + DoltHub blog post pattern
// src/renderer/src/components/Titlebar/Titlebar.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { Minus, Square, X, Copy, Home } from 'lucide-react'

export function Titlebar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    // Get initial state
    window.electronAPI.isMaximized().then(setIsMaximized)
    // Listen for changes
    const cleanup = window.electronAPI.onMaximizeChange(setIsMaximized)
    return cleanup
  }, [])

  return (
    <div className="titlebar" style={{ appRegion: 'drag' } as React.CSSProperties}>
      <div className="titlebar-left" style={{ appRegion: 'no-drag' } as React.CSSProperties}>
        {/* App logo + name */}
        <span className="titlebar-brand">PromptPlayer</span>
        {!isHome && (
          <button onClick={() => navigate('/')} className="titlebar-nav-btn">
            <Home size={14} />
          </button>
        )}
      </div>

      <div className="titlebar-center">
        {/* Drag region -- intentionally empty for branded minimal look */}
      </div>

      <div className="titlebar-controls" style={{ appRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={() => window.electronAPI.minimize()} className="titlebar-btn">
          <Minus size={14} />
        </button>
        <button onClick={() => window.electronAPI.maximize()} className="titlebar-btn">
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button onClick={() => window.electronAPI.close()} className="titlebar-btn titlebar-btn-close">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
```

### Theme Detection Hook
```typescript
// src/renderer/src/hooks/useTheme.ts
import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

export function useTheme(): void {
  const setDarkMode = useAppStore((state) => state.setDarkMode)

  useEffect(() => {
    // Get initial system theme
    window.electronAPI.getTheme().then((isDark) => {
      setDarkMode(isDark)
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    })

    // Listen for system theme changes
    const cleanup = window.electronAPI.onThemeChange((isDark) => {
      setDarkMode(isDark)
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    })

    return cleanup
  }, [setDarkMode])
}
```

### Zustand App Store
```typescript
// src/renderer/src/stores/appStore.ts
import { create } from 'zustand'

interface RecentFile {
  path: string
  name: string
  lastOpened: number
}

interface AppState {
  isDarkMode: boolean
  recentFiles: RecentFile[]
  setDarkMode: (isDark: boolean) => void
  setRecentFiles: (files: RecentFile[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  recentFiles: [],
  setDarkMode: (isDark) => set({ isDarkMode: isDark }),
  setRecentFiles: (files) => set({ recentFiles: files })
}))
```

## Discretionary Recommendations

Based on research, here are specific recommendations for areas marked as Claude's Discretion:

### Navigation Architecture: Full-Screen Mode Replacement
Use full-screen route replacement (not persistent tabs). Each route (Home, Builder, Player) takes the full viewport below the titlebar. Include a small home icon button in the titlebar (visible only when not on home screen) for returning to home. This maximizes content area for both building and presenting.

### Window Size Defaults
- **First launch:** 80% of primary display work area (both width and height)
- **Subsequent launches:** Restore last saved bounds from `electron-store`
- **Minimum size:** 800x600 pixels
- Use `electron-store` directly (not electron-window-state which is unmaintained)

### F11 Fullscreen Support
Register `globalShortcut` for F11 to toggle `mainWindow.setFullScreen()`. In fullscreen, hide the custom titlebar entirely and show an auto-hiding control bar on mouse-to-top-edge. This is valuable for Player mode presentations.

### Player Chrome Auto-Hide
In Player mode, after 3 seconds of mouse inactivity, fade out the titlebar. Show it again on mouse movement toward the top of the window. Implement with a simple timer-based approach in the renderer using `mousemove` event and `setTimeout`.

### Font Choices
- **UI font:** Inter (clean sans-serif, excellent readability, widely available, free)
- **Monospace font:** JetBrains Mono (designed for developer tools, programming ligatures, free)
- Bundle both fonts with the app to avoid system font dependency. Include them as assets in the renderer.

### Icon Style for Mode Cards
Use Lucide icons: `Wrench` or `PenTool` for Builder, `Play` or `Presentation` for Player. Simple, clean, single-color SVG icons that match the minimal aesthetic.

### Typography Scale
Base size 16px, scale: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px). Mode card titles at 2xl, descriptions at base, recent files at sm.

### Border Radii
Cards: `0.75rem` (lg). Buttons: `0.5rem` (md). Small elements: `0.25rem` (sm). Keep it consistent and restrained.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| electron-builder for packaging | Electron Forge (official) | 2023+ | Forge is now the official recommendation |
| tailwind.config.js | Tailwind v4 CSS-first config with `@theme` | 2025 (v4.0) | No JS config file needed; design tokens are CSS custom properties |
| react-router-dom separate package | react-router v7 unified package | 2024 (v7.0) | Import everything from `react-router`, not `react-router-dom` |
| electron-store CommonJS | electron-store ESM-only (v10+) | 2024 | Must use ESM imports, requires Electron 30+ |
| CSS `prefers-color-scheme` media query | CSS `light-dark()` function + `color-scheme` property | 2024 (Chromium 123+) | Can use `light-dark()` in Electron 40 (Chromium M144) for simpler theme values |
| `-webkit-app-region` CSS property | `app-region` CSS property (unprefixed) | 2023+ (Chromium) | Both work in Electron 40, but Electron docs now show `app-region` |

**Deprecated/outdated:**
- `remote` module: Removed. Use IPC exclusively.
- `nodeIntegration: true`: Security risk. Always use `contextIsolation: true` + preload.
- `electron-builder`: Less maintained than Electron Forge. Forge is the official path.
- `react-router-dom` as separate install: In v7, use `react-router` directly (react-router-dom still works but is unnecessary).

## Open Questions

1. **electron-vite 5 + Electron 40 compatibility**
   - What we know: electron-vite 5.0 requires Node 20.19+ or 22.12+ and Vite 5+. No explicit Electron version requirement found.
   - What's unclear: Whether electron-vite 5.0 has been tested with Electron 40 specifically (it was released Dec 2024, Electron 40 came Jan 2026).
   - Recommendation: Scaffold with the template and verify it runs. If issues, pin to Electron 38 or 39 which are also supported. LOW risk -- electron-vite is a build tool that wraps Vite; it doesn't have deep Electron API dependencies.

2. **electron-store v10+ exact version**
   - What we know: electron-store requires Electron 30+ and is ESM-only.
   - What's unclear: The exact latest version number (npm search returned limited data).
   - Recommendation: `npm install electron-store@latest` during scaffold. Verify ESM import works with electron-vite config.

3. **Inter and JetBrains Mono font bundling in Electron**
   - What we know: Both fonts are free and redistributable.
   - What's unclear: Best practice for bundling custom fonts in electron-vite renderer assets.
   - Recommendation: Place `.woff2` files in `src/renderer/src/assets/fonts/`, import with `@font-face` in CSS. electron-vite should handle asset bundling automatically.

## Sources

### Primary (HIGH confidence)
- [Electron docs - Window Customization](https://www.electronjs.org/docs/latest/tutorial/window-customization) - Custom titlebar, frameless window, drag regions
- [Electron docs - Custom Title Bar](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar) - `titleBarStyle`, `titleBarOverlay`, code examples
- [Electron docs - nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme) - shouldUseDarkColors, themeSource, updated event
- [Electron docs - Release Timelines](https://www.electronjs.org/docs/latest/tutorial/electron-timelines) - v40 (Chromium M144), v39 (M142), v38 (M140) supported
- [electron-vite Getting Started](https://electron-vite.org/guide/) - v5.0, scaffolding command, project structure, config
- [electron-vite 5.0 Release](https://electron-vite.org/blog/) - Dec 7 2024 release, new features, breaking changes
- [react-router v7 createHashRouter](https://api.reactrouter.com/v7/functions/react_router.createHashRouter.html) - Hash routing for Electron
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) - CSS-first config, @theme directive, @tailwindcss/vite plugin

### Secondary (MEDIUM confidence)
- [DoltHub - Building a Custom Title Bar in Electron (Feb 2025)](https://www.dolthub.com/blog/2025-02-11-building-a-custom-title-bar-in-electron/) - Complete implementation pattern with React
- [react-router Discussion #10724](https://github.com/remix-run/react-router/discussions/10724) - BrowserRouter fails in Electron, HashRouter recommended
- [electron-store GitHub](https://github.com/sindresorhus/electron-store) - ESM-only, Electron 30+ requirement, atomic writes
- [Electron Security docs](https://www.electronjs.org/docs/latest/tutorial/security) - IPC best practices, nodeIntegration, contextIsolation

### Tertiary (LOW confidence)
- npm version numbers for supporting packages (lucide-react 0.575.0, zustand 5.0.11, @tailwindcss/vite 4.2.0) -- verified via WebSearch but npm pages returned 403 on direct fetch. Version numbers should be verified with `npm view` during scaffold.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All core libraries verified via official docs and recent releases. Electron 40, electron-vite 5, React 19, react-router 7 are all current stable.
- Architecture: HIGH - Frameless window + IPC pattern is well-documented officially. HashRouter for Electron is community-proven. CSS custom properties theming is a web standard.
- Pitfalls: HIGH - All pitfalls sourced from official Electron security docs, community discussions, and verified anti-patterns.
- Discretionary recommendations: MEDIUM - Font choices and visual design are subjective, but Inter and JetBrains Mono are industry standard. Layout recommendations follow common Electron app patterns.

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- stable libraries, no major releases expected)
