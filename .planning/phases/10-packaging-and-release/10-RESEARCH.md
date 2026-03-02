# Phase 10: Packaging and Release - Research

**Researched:** 2026-03-01
**Domain:** Electron packaging, Windows installer, CI/CD, file association
**Confidence:** HIGH

## Summary

Phase 10 covers three distinct domains: (1) packaging PromptPlayer as a Windows installer with auto-update using electron-builder + electron-updater, (2) setting up GitHub Actions CI/CD for PR checks and tag-triggered releases, and (3) registering `.promptplay` file association so double-clicking opens the app in Player mode.

The project uses electron-vite 3.x with Electron 40 and outputs to an `out/` directory (main, preload, renderer). electron-builder 26.x is the standard tool for packaging electron-vite apps and integrates cleanly. The main complexity lies in the file association plumbing: extracting the file path from `process.argv` on cold start and `commandLine` on second-instance, routing it to the renderer, and navigating to the Player route with the loaded presentation.

**Primary recommendation:** Use electron-builder 26.x with NSIS assisted installer (`oneClick: false`) for desktop shortcut opt-out, per-user install to `AppData/Local`, and file association via `fileAssociations` config. Use electron-updater with GitHub Releases as the publish provider. Auto-update works on Windows without code signing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Traditional .exe installer via electron-builder
- Per-user install (AppData/Local) -- no admin required
- Start menu + desktop shortcuts (desktop shortcut opt-out-able during install)
- Auto-update via electron-updater using GitHub Releases as update source
- No paid code signing certificate -- ship unsigned
- GitHub Actions with two workflows: PR checks (lint + build) and Release (tag-triggered, draft GitHub Release)
- Draft releases -- review before publishing
- Lint + build steps in CI (no test suite)
- No pre-commit hooks for v1
- Register .promptplay file type during installation
- Double-click .promptplay opens straight to Player mode
- Single shared icon for both app and .promptplay file type
- Use Electron default/placeholder icon for v1
- Ship unsigned -- document SmartScreen bypass in README/release notes

### Claude's Discretion
- Single-instance vs new window behavior when opening .promptplay files
- Versioning strategy (manual bump vs tag-derived)
- electron-builder target format (NSIS installer vs squirrel vs other)
- Exact auto-update UX (notification style, restart prompt)
- CI workflow naming and structure details

### Deferred Ideas (OUT OF SCOPE)
- Pre-commit hooks (husky/lint-staged) for local lint enforcement
- Test suite (unit tests, component tests, integration tests)
- Custom app icon -- user will provide when/if needed
- Free OSS code signing (e.g., SignPath)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHELL-03 | App can open `.promptplay` files directly (double-click or "Open with") | electron-builder `fileAssociations` config registers the extension in Windows registry; main process handles `process.argv` (cold start) and `second-instance` event (warm start) to extract file path and route to Player |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-builder | ^26.8.1 | Build Windows installer from electron-vite output | Official packaging tool for Electron; deeply integrated with NSIS, supports file associations, auto-update publish metadata |
| electron-updater | ^6.8.3 | Auto-update from GitHub Releases | Companion to electron-builder; handles download, verification, and install of updates; supports NSIS on Windows without code signing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-log | ^6.0.0 | Auto-update logging | Optional; wire to `autoUpdater.logger` for diagnosing update issues in production |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NSIS (assisted) | NSIS (one-click) | One-click is simpler but lacks desktop shortcut opt-out UI the user wants |
| NSIS | Squirrel.Windows | Squirrel does NOT support electron-updater auto-update; NSIS is required |
| electron-updater | electron/update-electron-app | update-electron-app is simpler but less configurable; electron-updater is the standard for electron-builder projects |

**Installation:**
```bash
npm install -D electron-builder
npm install electron-updater
```

Note: `electron-builder` is a devDependency (build tool). `electron-updater` is a runtime dependency (runs in the packaged app).

## Architecture Patterns

### Recommended Project Structure
```
/
├── electron-builder.yml          # electron-builder config (YAML preferred over package.json)
├── build/                        # Build resources (icons, installer assets)
│   └── icon.ico                  # App + file type icon (256x256 multi-res .ico)
├── dev-app-update.yml            # Local dev auto-update test config
├── .github/
│   └── workflows/
│       ├── ci.yml                # PR checks: lint + build
│       └── release.yml           # Tag-triggered: build + publish draft release
├── src/
│   └── main/
│       ├── index.ts              # Updated: single-instance lock, argv parsing, auto-updater
│       └── ...
└── out/                          # electron-vite build output (main/, preload/, renderer/)
```

### Pattern 1: Single-Instance Lock with File Opening
**What:** Use `app.requestSingleInstanceLock()` to ensure only one app instance runs. When a second instance is launched (e.g., user double-clicks a .promptplay file while app is open), the second instance sends its argv to the first instance via the `second-instance` event, then quits.
**When to use:** Always -- prevents multiple window chaos and ensures file opens in the existing instance.
**Recommendation (Claude's Discretion):** Use single-instance pattern. Opening a new window per file is unnecessary complexity for a presentation tool.

```typescript
// Source: Electron docs (app API) + electron-builder file association pattern
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // commandLine is the argv of the second instance
    const filePath = extractPromptPlayPath(commandLine)
    if (filePath && mainWindow) {
      mainWindow.webContents.send('open-file', filePath)
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    // Cold start: check process.argv for a file path
    const filePath = extractPromptPlayPath(process.argv)
    if (filePath) {
      // Send to renderer after window is ready
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('open-file', filePath)
      })
    }
  })
}

function extractPromptPlayPath(argv: string[]): string | null {
  // argv contains electron flags, chromium flags, and the file path
  // The file path is the argument that ends with .promptplay
  const found = argv.find(arg => arg.endsWith('.promptplay'))
  return found ?? null
}
```

### Pattern 2: Auto-Update with VS Code-like UX
**What:** Check for updates on app launch, download in background, prompt user to restart.
**When to use:** After the app is ready and window is shown.
**Recommendation (Claude's Discretion):** Notification-style update UX. Check on launch, download silently, show a simple notification/banner when ready with a "Restart" button. No forced restarts.

```typescript
// Source: electron-builder auto-update docs
import { autoUpdater } from 'electron-updater'

function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // Don't auto-download -- we want to notify first
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    // Optionally notify renderer that an update is downloading
    mainWindow.webContents.send('update:downloading', info.version)
  })

  autoUpdater.on('update-downloaded', (info) => {
    // Notify renderer to show "Restart to update" prompt
    mainWindow.webContents.send('update:ready', info.version)
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err)
    // Silently fail -- don't bother user with update errors
  })

  // Check for updates after a short delay (don't block startup)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)
}
```

### Pattern 3: Renderer File Open Handler
**What:** Listen for `open-file` IPC events in the renderer, read the file, load into playback store, and navigate to Player route.
**When to use:** Both in preload (expose the listener) and in the renderer (App-level effect).

```typescript
// In preload/index.ts -- add to electronAPI:
onOpenFile: (callback: (filePath: string) => void): (() => void) => {
  const handler = (_event: Electron.IpcRendererEvent, filePath: string): void =>
    callback(filePath)
  ipcRenderer.on('open-file', handler)
  return () => ipcRenderer.removeListener('open-file', handler)
}

// In renderer App.tsx or a top-level hook:
useEffect(() => {
  const cleanup = window.electronAPI.onOpenFile(async (filePath) => {
    // Read the .promptplay file
    const data = readFileSync(filePath, 'utf-8')  // via IPC
    const parsed = JSON.parse(data)
    // Load into playback store and navigate to /player
    loadPresentation(parsed.presentation, parsed.sessions)
    navigate('/player')
  })
  return cleanup
}, [])
```

### Pattern 4: electron-builder.yml Configuration
**What:** Centralized build config in YAML format (cleaner than embedding in package.json).
**Recommendation (Claude's Discretion):** Use NSIS assisted installer (`oneClick: false`) for the opt-out desktop shortcut UX. Per-user install avoids admin UAC prompt.

```yaml
# electron-builder.yml
appId: com.promptplayer.app
productName: PromptPlayer
directories:
  buildResources: build
files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!.planning/*'
  - '!test-data/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml}'
  - '!{.env,.env.*,.npmrc,pnpm-lock.yaml}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
asarUnpack:
  - resources/**
win:
  executableName: PromptPlayer
  icon: build/icon.ico
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: PromptPlayer
  artifactName: ${name}-${version}-setup.${ext}
  uninstallDisplayName: ${productName}
fileAssociations:
  - ext: promptplay
    name: PromptPlay Presentation
    description: PromptPlayer Presentation File
    icon: build/icon.ico
publish:
  provider: github
  owner: OWNER
  repo: PromptPlayer
npmRebuild: false
```

### Pattern 5: Versioning Strategy
**Recommendation (Claude's Discretion):** Use manual `package.json` version bumping. Tag-derived versioning requires extra tooling (e.g., `electron-builder --version` overrides) and adds complexity. The workflow is simple:

1. Bump `version` in `package.json`
2. Commit: `chore: bump version to 1.0.0`
3. Tag: `git tag v1.0.0`
4. Push: `git push && git push --tags`
5. GitHub Actions detects the tag and builds/publishes

This approach keeps version as the single source of truth in `package.json` and requires no build-time version injection.

### Anti-Patterns to Avoid
- **Anti-pattern: Using `asar: false`** -- Disabling ASAR creates a folder-based install with thousands of files. Keep `asar: true` (default). Only `asarUnpack` specific resources if needed.
- **Anti-pattern: Embedding build config in package.json** -- Use a separate `electron-builder.yml` file. The config gets large and clutters package.json.
- **Anti-pattern: Using `--publish always` without draft** -- This publishes immediately, bypassing review. Use `--publish always` but configure the GitHub release to be a draft.
- **Anti-pattern: Checking for updates synchronously on startup** -- Use `setTimeout` or `app.whenReady().then()` to defer update checks; don't block window creation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Windows installer | Custom NSIS scripts | electron-builder NSIS target | Handles registry, shortcuts, uninstaller, UAC elevation, file associations automatically |
| Auto-update | Custom HTTP polling + download | electron-updater | Handles differential downloads, signature verification, atomic install, rollback |
| GitHub release publishing | Manual artifact upload scripts | electron-builder `--publish` flag | Generates `latest.yml` metadata, uploads artifacts, creates/updates GitHub release |
| File association registry | Manual Windows Registry writes | electron-builder `fileAssociations` config | Handles HKCU vs HKLM based on install scope, proper uninstall cleanup |
| CI workflow for Electron | Complex custom scripts | Standard `actions/setup-node` + `npx electron-builder` | Well-tested, caching, cross-platform support |

**Key insight:** electron-builder handles an enormous amount of Windows-specific complexity (registry entries, uninstaller registration, NSIS scripting, update metadata generation). Attempting to hand-roll any of this would take weeks and produce fragile results.

## Common Pitfalls

### Pitfall 1: electron-vite output directory mismatch
**What goes wrong:** electron-builder can't find the built files because it looks in the wrong directory.
**Why it happens:** electron-vite outputs to `out/` by default (with subdirs `main/`, `preload/`, `renderer/`), but some electron-builder configs expect `dist/` or `dist-electron/`.
**How to avoid:** The `files` config in electron-builder.yml implicitly includes everything not excluded. Since electron-vite's `main` field in package.json points to `./out/main/index.js`, and the `files` exclusions skip `src/*`, the `out/` directory is included automatically. Run `npm run build` (electron-vite build) before `electron-builder`.
**Warning signs:** "Application entry file does not exist" error during build.

### Pitfall 2: CSP blocks resources in production
**What goes wrong:** Shiki WASM loading fails in the packaged app; syntax highlighting breaks.
**Why it happens:** The CSP meta tag in index.html may use paths that work in dev but not in production (file:// protocol). The current CSP `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'` should work correctly with ASAR because `'self'` covers the app's own protocol.
**How to avoid:** The existing CSP already includes `wasm-unsafe-eval` for shiki. Test the packaged app specifically for syntax highlighting. If shiki fails, the fallback is to switch to shiki's JavaScript RegExp engine (`createJavaScriptRegexEngine()`) which doesn't need WASM at all.
**Warning signs:** Blank code blocks, console CSP violation errors.

### Pitfall 3: process.argv contains extra Chromium flags
**What goes wrong:** Naive `process.argv[1]` check for file path picks up Chromium/Electron internal flags instead.
**Why it happens:** Chromium appends flags like `--allow-file-access-from-files`, `--original-process-start-time`, etc. to argv.
**How to avoid:** Filter argv for entries ending with `.promptplay` rather than assuming positional index. Use the `extractPromptPlayPath()` helper pattern shown above.
**Warning signs:** File association "works sometimes" or opens wrong content.

### Pitfall 4: File association + per-user install conflict (RESOLVED)
**What goes wrong:** Old electron-builder versions threw an error requiring `perMachine: true` for file associations.
**Why it happens:** Historical limitation. PR #2861 (merged May 2018) fixed this by writing to `HKCU\Software\Classes` for per-user installs instead of requiring `HKLM`.
**How to avoid:** Use electron-builder 26.x. The validation check has been removed from the source. File associations work with `perMachine: false`.
**Warning signs:** If build fails with "file associations works on Windows only if installed for all users", update electron-builder.

### Pitfall 5: Auto-update fails silently
**What goes wrong:** Updates are never detected or downloaded.
**Why it happens:** Missing or misconfigured `publish` in electron-builder.yml; `latest.yml` not generated or not uploaded; `GH_TOKEN` not set in CI.
**How to avoid:** Ensure `publish.provider: github` is in config. Verify `latest.yml` exists in the build output after running `electron-builder`. Ensure the CI workflow passes `GH_TOKEN` as env var. Use `dev-app-update.yml` for local testing.
**Warning signs:** No `latest.yml` in the dist/ output folder after build.

### Pitfall 6: Draft release not picked up by auto-updater
**What goes wrong:** Published draft releases aren't detected by electron-updater.
**Why it happens:** Draft releases are invisible to the GitHub Releases API for unauthenticated requests. electron-updater checks the public releases endpoint.
**How to avoid:** This is actually the DESIRED behavior. Draft releases let you review before publishing. Only published releases trigger auto-updates. The workflow is: CI creates draft -> you review -> manually publish -> auto-update detects it.
**Warning signs:** None -- this is by design.

### Pitfall 7: Second instance overwrites the first window instead of sending file
**What goes wrong:** Double-clicking a .promptplay file while the app is open launches a new instance that immediately quits, but the file never opens in the existing window.
**Why it happens:** `second-instance` handler doesn't extract the file path from `commandLine` or doesn't send it to the renderer.
**How to avoid:** Implement the full single-instance pattern with `commandLine` parsing and IPC to renderer. Test by: (1) open app, (2) double-click a .promptplay file in Explorer, (3) verify it opens in existing window.
**Warning signs:** Second instance launches briefly then closes; nothing happens in the first window.

### Pitfall 8: Shiki bundle size in ASAR
**What goes wrong:** The installer is unexpectedly large (300MB+).
**Why it happens:** The Electron runtime is ~200MB (unavoidable baseline for any Electron app). Shiki adds ~800KB for language grammars (per STATE.md). The expected total installer size is ~200MB. If it balloons to 300MB+, something is pulling in extra shiki grammars/themes or other unexpected assets.
**How to avoid:** This is acceptable for v1. The renderer bundle at 810KB is reasonable. If size becomes a concern later, use fine-grained shiki imports (`@shikijs/langs-*`) to include only needed languages.
**Warning signs:** Installer exceeds 300MB (expected ~200MB baseline + ~1MB app code).

## Code Examples

### electron-builder.yml (Complete)
```yaml
# Source: electron-vite distribution guide + electron-builder docs
appId: com.promptplayer.app
productName: PromptPlayer

directories:
  buildResources: build

files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!.planning/*'
  - '!test-data/*'
  - '!.agents/*'
  - '!.claude/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml}'
  - '!{.env,.env.*,.npmrc}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
  - '!{*.tsbuildinfo}'
  - '!{package-lock.json}'

asarUnpack:
  - resources/**

win:
  executableName: PromptPlayer
  icon: build/icon.ico

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: PromptPlayer
  artifactName: ${name}-${version}-setup.${ext}
  uninstallDisplayName: ${productName}

fileAssociations:
  - ext: promptplay
    name: PromptPlayPresentation
    description: PromptPlayer Presentation File
    icon: build/icon.ico

publish:
  provider: github
  owner: OWNER_PLACEHOLDER
  repo: PromptPlayer

npmRebuild: false
```

### GitHub Actions: CI Workflow (ci.yml)
```yaml
# Source: Community patterns + electron-builder docs
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
```

### GitHub Actions: Release Workflow (release.yml)
```yaml
# Source: Community patterns + electron-builder docs
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build:
    runs-on: windows-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Build installer
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx electron-builder --win --publish always
        # --publish always with provider: github creates a draft release
        # and uploads the installer + latest.yml
```

Note: `--publish always` with `provider: github` creates a GitHub Release. To make it a draft, add `releaseType: draft` to the publish config in electron-builder.yml, or use the GitHub API after upload.

### package.json build scripts
```json
{
  "scripts": {
    "build:win": "npm run build && electron-builder --win --config",
    "build:unpackaged": "npm run build && electron-builder --win --dir"
  }
}
```

### Main Process File Opening (Complete Pattern)
```typescript
// Source: Electron docs + community patterns

// Before app.whenReady(), set up single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', (_event, commandLine) => {
    const filePath = commandLine.find(arg => arg.endsWith('.promptplay'))
    if (filePath && mainWindow) {
      mainWindow.webContents.send('open-file', filePath)
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    mainWindow = createWindow()

    // Check for file path in cold-start argv
    const filePath = process.argv.find(arg => arg.endsWith('.promptplay'))
    if (filePath) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow!.webContents.send('open-file', filePath)
      })
    }
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `perMachine: true` required for file associations | Per-user file associations via HKCU | PR #2861, May 2018 | No admin needed for file associations |
| samuelmeuli/action-electron-builder | Direct `npx electron-builder` in workflow | action archived Oct 2024 | Use standard npm commands; don't depend on archived action |
| electron-builder config in package.json | Separate `electron-builder.yml` | Best practice | Cleaner separation; YAML is more readable for complex configs |
| Squirrel.Windows auto-update | NSIS auto-update via electron-updater | Squirrel unsupported | NSIS is the only Windows target supporting electron-updater |

**Deprecated/outdated:**
- `samuelmeuli/action-electron-builder`: Archived Oct 2024. Use direct `npx electron-builder` commands instead.
- Squirrel.Windows: Not supported by electron-updater. Use NSIS target.
- `electron-store` v11+ in electron-vite CJS: Already known limitation in this project (using JSON file fallback).

## Open Questions

1. **GitHub repo owner for publish config**
   - What we know: electron-builder.yml needs `publish.owner` and `publish.repo` for GitHub Releases.
   - What's unclear: The repo owner/org name. Placeholder used in config.
   - Recommendation: Set during implementation based on actual GitHub repository URL.

2. **Draft release configuration**
   - What we know: `--publish always` creates a release and uploads. User wants draft releases.
   - What's unclear: Whether `releaseType: draft` in electron-builder.yml config or post-publish API call is more reliable.
   - Recommendation: Test with `releaseType: draft` in the publish config first. If electron-builder doesn't support it natively, use the `ncipollo/release-action` to create the draft release separately after artifact upload.

3. **Shiki WASM in production ASAR**
   - What we know: CSP has `wasm-unsafe-eval`. Dev mode works. Shiki loads WASM lazily.
   - What's unclear: Whether shiki's WASM loader can find the .wasm file inside ASAR. The `@shikijs/rehype` plugin uses the singleton highlighter which auto-resolves WASM.
   - Recommendation: Build and test the packaged app. If WASM fails, switch to `createJavaScriptRegexEngine()` which avoids WASM entirely.

## Sources

### Primary (HIGH confidence)
- [electron-builder official docs](https://www.electron.build/) - NSIS options, file associations, auto-update, common config
- [electron-builder FileAssociation interface](https://www.electron.build/electron-builder.interface.fileassociation) - ext, name, description, icon properties
- [electron-builder NsisOptions](https://www.electron.build/electron-builder.interface.nsisoptions) - oneClick, perMachine, createDesktopShortcut, etc.
- [electron-builder auto-update docs](https://www.electron.build/auto-update.html) - electron-updater setup, events, GitHub provider
- [Electron app API docs](https://www.electronjs.org/docs/latest/api/app) - requestSingleInstanceLock, second-instance event, process.argv
- [electron-vite distribution guide](https://electron-vite.org/guide/distribution) - electron-builder.yml template, build scripts, ASAR unpacking
- [electron-builder PR #2861](https://github.com/electron-userland/electron-builder/pull/2861) - Per-user file associations fix (HKCU)
- [electron-builder issue #1189](https://github.com/electron-userland/electron-builder/issues/1189) - Code signing NOT required for Windows auto-update

### Secondary (MEDIUM confidence)
- [Multi-OS Electron Build with GitHub Actions](https://dev.to/supersuman/multi-os-electron-build-release-with-github-actions-f3n) - Workflow YAML pattern
- [electron-builder NsisTarget.ts source](https://github.com/electron-userland/electron-builder/blob/master/packages/app-builder-lib/src/targets/nsis/NsisTarget.ts) - Confirmed perMachine validation removed

### Tertiary (LOW confidence)
- [electron-builder issue #2860](https://github.com/electron-userland/electron-builder/issues/2860) - Per-user file association support (closed as completed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - electron-builder + electron-updater are the only serious choice for this stack; versions verified on npm
- Architecture: HIGH - File association patterns well-documented in Electron docs and electron-builder; single-instance pattern is standard
- Pitfalls: HIGH - Most pitfalls drawn from official docs, GitHub issues, and project-specific knowledge (shiki CSP, electron-vite output dir)
- CI/CD: MEDIUM - GitHub Actions workflow patterns are community-sourced but well-established; the archived action-electron-builder is a real concern worth noting

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain; electron-builder releases are incremental)
