---
phase: 01-app-shell
plan: 01
subsystem: app-shell
tags: [electron, react, typescript, electron-vite, tailwindcss, zustand, react-router, ipc, theme, frameless-window]

requires:
  - phase: none
    provides: first phase - no prior dependencies
provides:
  - Running Electron + React + TypeScript application scaffold
  - Frameless window with IPC-based window controls
  - CSS custom properties theme system with teal accent and dark mode
  - HashRouter with three placeholder routes (home, builder, player)
  - Zustand state management store
  - Window bounds persistence between launches
affects:
  - 01-02 (home screen, custom titlebar refinement)
  - All subsequent phases (build on this scaffold)

tech-stack:
  added:
    - electron ^40.0.0
    - react ^19.0.0
    - react-dom ^19.0.0
    - electron-vite ^3.0.0
    - vite ^6.0.0
    - typescript ^5.7.0
    - react-router ^7.13.0
    - zustand ^5.0.11
    - lucide-react ^0.575.0
    - electron-store ^11.0.2 (installed but unused - ESM incompatibility with CJS main process)
    - tailwindcss ^4.2.0
    - "@tailwindcss/vite ^4.2.0"
    - "@electron-toolkit/utils ^4.0.0"
    - "@electron-toolkit/preload ^3.0.2"
    - "@electron-toolkit/tsconfig ^1.0.1"
    - "@vitejs/plugin-react ^4.3.4"
  patterns:
    - "IPC pattern: main process handlers + preload contextBridge + renderer API"
    - "CSS custom properties for all colors, spacing, typography tokens"
    - "data-theme attribute for light/dark switching"
    - "HashRouter for Electron file:// protocol compatibility"
    - "Zustand for client-side state management"
    - "JSON file persistence fallback when ESM-only packages conflict with CJS build"

key-files:
  created:
    - package.json
    - electron.vite.config.ts
    - tsconfig.json
    - tsconfig.node.json
    - tsconfig.web.json
    - .gitignore
    - src/main/index.ts
    - src/preload/index.ts
    - src/renderer/index.html
    - src/renderer/src/env.d.ts
    - src/renderer/src/main.tsx
    - src/renderer/src/App.tsx
    - src/renderer/src/types/electron.d.ts
    - src/renderer/src/styles/theme.css
    - src/renderer/src/styles/global.css
    - src/renderer/src/stores/appStore.ts
    - src/renderer/src/hooks/useTheme.ts
    - src/renderer/src/components/Titlebar/Titlebar.tsx
    - src/renderer/src/routes/Home.tsx
    - src/renderer/src/routes/Builder.tsx
    - src/renderer/src/routes/Player.tsx
  modified: []

key-decisions:
  - "Used electron-vite 3.x (not 5.x) -- v5 requires Node 20.19+ or 22.12+, system has Node 23.7.0 but electron-vite 3.x resolved from npm"
  - "JSON file persistence instead of electron-store -- electron-store v11 is ESM-only but electron-vite 3.x compiles main process to CJS"
  - "React.JSX.Element return types -- React 19 removed global JSX namespace"
  - "moduleResolution: bundler in tsconfig.node.json -- required for @tailwindcss/vite .mts type declarations"

patterns-established:
  - "IPC channel naming: 'window:minimize', 'window:maximize', 'window:close', 'window:isMaximized', 'theme:get', 'theme:changed'"
  - "Preload API shape: window.electronAPI.{method}() -- never expose raw ipcRenderer"
  - "Theme detection: nativeTheme.shouldUseDarkColors -> IPC -> data-theme attribute on documentElement"
  - "CSS variable theming: all colors via --color-*, spacing via --space-*, typography via --font-* and --text-*"
  - "Route structure: createHashRouter with / (Home), /builder (Builder), /player (Player)"

duration: 11min
completed: 2026-02-20
---

# Phase 1 Plan 1: Electron + React + TypeScript Scaffold Summary

**Electron-vite scaffold with frameless window, IPC controls, CSS custom property theme system (teal accent, light/dark), HashRouter, and Zustand store**

## Performance

- **Duration:** 11min
- **Started:** 2026-02-21T03:51:00Z
- **Completed:** 2026-02-21T04:02:05Z
- **Tasks:** 2
- **Files created:** 21

## Accomplishments

- Scaffolded complete Electron + React + TypeScript project with electron-vite build tooling
- Configured frameless BrowserWindow (frame: false) with 800x600 minimum size, 80% screen default
- Implemented full IPC communication: window controls (minimize/maximize/close) and theme detection
- Built preload script with secure contextBridge API (never exposes raw ipcRenderer)
- Created comprehensive CSS custom properties theme system with teal accent and complete dark mode overrides
- Set up Tailwind CSS v4 with @tailwindcss/vite plugin for rapid layout development
- Configured HashRouter with three routes (home, builder, player) with placeholder content
- Created Zustand store for app state management (isDarkMode, recentFiles)
- Implemented useTheme hook that detects system theme via nativeTheme IPC and sets data-theme attribute
- Built functional Titlebar component with minimize/maximize/close buttons and hover states
- Window bounds persist between launches via JSON file in app userData directory
- Both `npm run dev` and `npm run build` succeed without errors
- TypeScript type checking passes for both node and web configs

## Task Commits

1. **Task 1: Scaffold Electron + React + TypeScript project and install dependencies** - `6b49b5a` (feat)
2. **Task 2: Configure frameless window with IPC, theme system, Zustand store, and HashRouter** - `e203e49` (feat)

## Files Created/Modified

- `package.json` - Project manifest with all dependencies
- `electron.vite.config.ts` - Build config for main, preload, renderer with Tailwind plugin
- `tsconfig.json` - Root config with project references
- `tsconfig.node.json` - TypeScript config for main/preload (bundler moduleResolution)
- `tsconfig.web.json` - TypeScript config for renderer
- `.gitignore` - Ignore node_modules, out, dist
- `src/main/index.ts` - Electron main process: frameless window, IPC, theme, bounds persistence
- `src/preload/index.ts` - contextBridge with electronAPI (window controls + theme)
- `src/renderer/index.html` - HTML entry with CSP headers
- `src/renderer/src/env.d.ts` - Vite client type reference
- `src/renderer/src/main.tsx` - React entry point with global CSS import
- `src/renderer/src/App.tsx` - Root component with HashRouter and useTheme
- `src/renderer/src/types/electron.d.ts` - ElectronAPI interface and Window augmentation
- `src/renderer/src/styles/theme.css` - Complete CSS custom properties (colors, spacing, typography, dark mode)
- `src/renderer/src/styles/global.css` - Tailwind import, base styles, titlebar drag regions
- `src/renderer/src/stores/appStore.ts` - Zustand store (isDarkMode, recentFiles)
- `src/renderer/src/hooks/useTheme.ts` - System theme detection hook
- `src/renderer/src/components/Titlebar/Titlebar.tsx` - Custom titlebar with window controls
- `src/renderer/src/routes/Home.tsx` - Home page placeholder with nav to Builder/Player
- `src/renderer/src/routes/Builder.tsx` - Builder mode placeholder
- `src/renderer/src/routes/Player.tsx` - Player mode placeholder

## Decisions Made

1. **electron-vite 3.x instead of 5.x** - npm resolved v3.1.0. The research mentioned v5.0.0 but it was not available via npm at the versions requested. v3.x works correctly with Electron 40 and Vite 6.
2. **JSON file persistence instead of electron-store** - electron-store v11+ is ESM-only. electron-vite 3.x compiles the main process to CommonJS (`require()`), making ESM-only imports fail at runtime. Used `fs.readFileSync/writeFileSync` with a JSON file in `app.getPath('userData')` as a reliable fallback. electron-store remains in package.json for potential future use if the build config changes.
3. **React.JSX.Element return types** - React 19 removed the global `JSX` namespace. All component return types use `React.JSX.Element` with explicit `import React from 'react'`.
4. **moduleResolution: bundler** - Added to tsconfig.node.json because @tailwindcss/vite only provides `.mts` type declarations, which the default `"node"` resolution cannot find.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Manual project scaffold instead of interactive CLI**
- **Found during:** Task 1
- **Issue:** `npm create @quick-start/electron@latest` and `npx create-electron-vite` both require interactive terminal input (package name, template selection) which cannot be automated in this environment.
- **Fix:** Manually created the electron-vite react-ts template structure based on known template output. All config files, directory structure, and entry points match the official template.
- **Files created:** All scaffold files
- **Commit:** 6b49b5a

**2. [Rule 3 - Blocking] electron-store ESM/CJS incompatibility**
- **Found during:** Task 2
- **Issue:** electron-store v11 is ESM-only but electron-vite 3.x compiles main process to CommonJS. `import Store from 'electron-store'` would compile to `require('electron-store')` causing ERR_REQUIRE_ESM at runtime.
- **Fix:** Implemented simple JSON file read/write for window bounds persistence using Node.js `fs` module. Same functionality, no ESM dependency.
- **Files modified:** src/main/index.ts
- **Commit:** e203e49

**3. [Rule 1 - Bug] React 19 JSX namespace removal**
- **Found during:** Task 2
- **Issue:** TypeScript error `Cannot find namespace 'JSX'` in all component files. React 19 types no longer export a global `JSX` namespace.
- **Fix:** Changed all `JSX.Element` return types to `React.JSX.Element` and added explicit `import React from 'react'` where needed.
- **Files modified:** App.tsx, Titlebar.tsx, Home.tsx, Builder.tsx, Player.tsx
- **Commit:** e203e49

**4. [Rule 3 - Blocking] tsconfig moduleResolution for @tailwindcss/vite**
- **Found during:** Task 2
- **Issue:** TypeScript error `Cannot find module '@tailwindcss/vite'` because the package only provides `.mts` type declarations, incompatible with `"moduleResolution": "node"`.
- **Fix:** Added `"moduleResolution": "bundler"` to tsconfig.node.json.
- **Files modified:** tsconfig.node.json
- **Commit:** e203e49

## Issues Encountered

- **npm audit reports 10 high severity vulnerabilities** - These appear to be in the eslint dependency chain (eslint-visitor-keys engine warning). Not blocking for development; should be reviewed before any production packaging.
- **Node.js version engine warning** - eslint-visitor-keys@5.0.1 requires Node ^20.19.0 or ^22.13.0, system has Node 23.7.0. No functional impact observed.

## Next Phase Readiness

Plan 01-02 (Home screen with Builder/Player mode cards, custom titlebar, recent files) can proceed immediately. All prerequisites are in place:
- Working Electron app with `npm run dev`
- Frameless window with custom titlebar (basic version, to be refined in 01-02)
- HashRouter with three routes ready for real content
- CSS theme system active and ready for component styling
- Zustand store available for state management
- Lucide icons installed and working (used in Titlebar)

## Self-Check: PASSED

---
*Phase: 01-app-shell*
*Completed: 2026-02-20*
