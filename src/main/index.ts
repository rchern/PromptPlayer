import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, screen } from 'electron'
import { join, basename, dirname } from 'path'
import { readFileSync, writeFileSync, mkdirSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { discoverSessions, extractSessionMetadata } from './pipeline/discovery'
import { parseJSONLFile } from './pipeline/parser'
import { stitchConversation } from './pipeline/stitcher'
import {
  getStoredSessions,
  saveStoredSession,
  removeStoredSession
} from './storage/sessionStore'
import { getRecentFiles, addRecentFile } from './storage/recentFileStore'
import {
  getPresentations,
  savePresentation,
  deletePresentation
} from './storage/presentationStore'
import type { PromptPlayFile } from './pipeline/types'
import { setupAutoUpdater } from './autoUpdater'

// ---------- Window bounds persistence (JSON file fallback) ----------
// electron-store v11+ is ESM-only and electron-vite 3.x compiles main to CJS,
// so we use a simple JSON file for window bounds persistence.
interface WindowBounds {
  width: number
  height: number
  x?: number
  y?: number
}

const STORE_PATH = join(app.getPath('userData'), 'window-state.json')

function loadWindowBounds(): WindowBounds | undefined {
  try {
    const data = readFileSync(STORE_PATH, 'utf-8')
    return JSON.parse(data) as WindowBounds
  } catch {
    return undefined
  }
}

function saveWindowBounds(bounds: WindowBounds): void {
  try {
    mkdirSync(join(app.getPath('userData')), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(bounds), 'utf-8')
  } catch (err) {
    console.error('Failed to save window bounds:', err)
  }
}

/**
 * Derive a project folder name from a file path by using the parent directory name.
 * For files imported from arbitrary locations, this gives a reasonable fallback name.
 */
function deriveProjectFolder(filePath: string): string {
  return basename(dirname(filePath))
}

/**
 * Extract a .promptplay file path from a command-line argument array.
 * Used for both cold-start (process.argv) and warm-start (second-instance commandLine).
 */
function extractPromptPlayPath(argv: string[]): string | null {
  return argv.find((arg) => arg.endsWith('.promptplay')) ?? null
}

// ---------- Single-instance lock ----------
// Ensures only one instance of PromptPlayer runs at a time.
// When a second instance is launched (e.g., double-clicking a .promptplay file),
// the first instance receives the file path and focuses itself.

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  // Handle second-instance launch: extract .promptplay path and dispatch to renderer
  app.on('second-instance', (_event, commandLine) => {
    const filePath = extractPromptPlayPath(commandLine)
    if (filePath && mainWindow) {
      mainWindow.webContents.send('open-file', filePath)
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.setAlwaysOnTop(true)
      mainWindow.setAlwaysOnTop(false)
      mainWindow.focus()
    }
  })

  // ---------- Window creation ----------
  function createWindow(): void {
    const savedBounds = loadWindowBounds()

    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
    const defaultWidth = Math.round(screenW * 0.8)
    const defaultHeight = Math.round(screenH * 0.8)

    mainWindow = new BrowserWindow({
      width: savedBounds?.width ?? defaultWidth,
      height: savedBounds?.height ?? defaultHeight,
      x: savedBounds?.x,
      y: savedBounds?.y,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      backgroundColor: '#ffffff',
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    // Show window when ready (prevents white flash)
    mainWindow.once('ready-to-show', () => {
      mainWindow!.show()
    })

    // ---------- Hidden Menu: Keyboard Shortcuts ----------
    const menu = Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          {
            label: 'Save',
            accelerator: 'CommandOrControl+S',
            click: () => mainWindow!.webContents.send('menu:save')
          },
          {
            label: 'Save As...',
            accelerator: 'CommandOrControl+Shift+S',
            click: () => mainWindow!.webContents.send('menu:saveAs')
          }
        ]
      }
    ])
    Menu.setApplicationMenu(menu)

    // Save window bounds on close
    mainWindow.on('close', () => {
      saveWindowBounds(mainWindow!.getBounds())
    })

    // ---------- IPC: Window controls ----------
    ipcMain.on('window:minimize', () => mainWindow!.minimize())
    ipcMain.on('window:maximize', () => {
      if (mainWindow!.isMaximized()) {
        mainWindow!.unmaximize()
      } else {
        mainWindow!.maximize()
      }
    })
    ipcMain.on('window:close', () => mainWindow!.close())
    ipcMain.handle('window:isMaximized', () => mainWindow!.isMaximized())

    // Notify renderer of maximize state changes
    mainWindow.on('maximize', () => {
      mainWindow!.webContents.send('window:maximizeChanged', true)
    })
    mainWindow.on('unmaximize', () => {
      mainWindow!.webContents.send('window:maximizeChanged', false)
    })

    // ---------- IPC: Theme ----------
    ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)
    nativeTheme.on('updated', () => {
      mainWindow!.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
    })

    // ---------- IPC: Pipeline ----------
    ipcMain.handle('pipeline:discoverSessions', async (_event, baseDir?: string) => {
      return discoverSessions(baseDir)
    })

    ipcMain.handle('pipeline:parseSession', async (_event, filePath: string) => {
      const result = await parseJSONLFile(filePath)
      return stitchConversation(result.messages, result.filteredUuidRedirects)
    })

    ipcMain.handle('pipeline:browseDirectory', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Claude Projects Directory'
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    })

    ipcMain.handle('pipeline:importFiles', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'JSONL Files', extensions: ['jsonl'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        title: 'Import Session Files'
      })
      if (result.canceled || result.filePaths.length === 0) return []

      const sessions = await Promise.all(
        result.filePaths.map((filePath) =>
          extractSessionMetadata(filePath, deriveProjectFolder(filePath))
        )
      )
      return sessions
    })

    ipcMain.handle(
      'pipeline:importFromPaths',
      async (_event, filePaths: string[]) => {
        const sessions = await Promise.all(
          filePaths.map((fp) => extractSessionMetadata(fp, deriveProjectFolder(fp)))
        )
        return sessions
      }
    )

    ipcMain.handle(
      'pipeline:searchSessionContent',
      async (_event, filePath: string, query: string) => {
        try {
          const q = query.toLowerCase()
          const rl = createInterface({
            input: createReadStream(filePath, { encoding: 'utf-8' }),
            crlfDelay: Infinity
          })

          for await (const line of rl) {
            if (line.toLowerCase().includes(q)) {
              rl.close()
              return true
            }
          }

          return false
        } catch {
          return false
        }
      }
    )

    // ---------- IPC: Session Storage ----------
    ipcMain.handle('pipeline:getStoredSessions', async () => {
      return getStoredSessions()
    })

    ipcMain.handle('pipeline:saveStoredSession', async (_event, session) => {
      saveStoredSession(session)
    })

    ipcMain.handle('pipeline:removeStoredSession', async (_event, sessionId: string) => {
      removeStoredSession(sessionId)
    })

    // ---------- IPC: Recent Files ----------
    ipcMain.handle('recentFiles:get', async () => {
      return getRecentFiles()
    })

    ipcMain.handle('recentFiles:add', async (_event, filePath: string) => {
      return addRecentFile(filePath)
    })

    // ---------- IPC: Presentation Storage ----------
    ipcMain.handle('presentation:getAll', async () => {
      return getPresentations()
    })

    ipcMain.handle('presentation:save', async (_event, presentation) => {
      savePresentation(presentation)
    })

    ipcMain.handle('presentation:delete', async (_event, id: string) => {
      deletePresentation(id)
    })

    // ---------- IPC: Presentation Export/Import ----------
    ipcMain.handle('presentation:export', async (_event, presentationId: string) => {
      const presentations = getPresentations()
      const presentation = presentations.find((p) => p.id === presentationId)
      if (!presentation) {
        throw new Error(`Presentation not found: ${presentationId}`)
      }

      // Collect all session IDs referenced in the presentation
      const referencedIds = new Set<string>()
      for (const section of presentation.sections) {
        for (const ref of section.sessionRefs) {
          referencedIds.add(ref.sessionId)
        }
      }

      // Read stored sessions and filter to only those referenced
      const allSessions = getStoredSessions()
      const sessions = allSessions.filter((s) => referencedIds.has(s.sessionId))

      // Warn if any referenced sessions are missing from storage
      const foundIds = new Set(sessions.map((s) => s.sessionId))
      const missingIds = [...referencedIds].filter((id) => !foundIds.has(id))
      if (missingIds.length > 0) {
        console.warn(`Export warning: ${missingIds.length} session(s) not found in storage: ${missingIds.join(', ')}`)
      }

      const exportData: PromptPlayFile = { presentation, sessions }

      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Export Presentation',
        defaultPath: `${presentation.name.replace(/[<>:"/\\|?*]/g, '_')}.promptplay`,
        filters: [
          { name: 'PromptPlay Presentations', extensions: ['promptplay'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { canceled: true }
      }

      writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
      return { filePath: result.filePath, canceled: false }
    })

    ipcMain.handle('presentation:import', async () => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Open Presentation',
        filters: [
          { name: 'PromptPlay Presentations', extensions: ['promptplay'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const data = readFileSync(result.filePaths[0], 'utf-8')
      const parsed = JSON.parse(data) as PromptPlayFile

      // Basic validation
      if (!parsed.presentation || !Array.isArray(parsed.sessions)) {
        throw new Error('Invalid .promptplay file: missing presentation or sessions')
      }

      return { ...parsed, filePath: result.filePaths[0] }
    })

    ipcMain.handle(
      'presentation:saveToPath',
      async (_event, presentationId: string, filePath: string) => {
        const presentations = getPresentations()
        const presentation = presentations.find((p) => p.id === presentationId)
        if (!presentation) {
          throw new Error(`Presentation not found: ${presentationId}`)
        }

        // Collect referenced session IDs
        const referencedIds = new Set<string>()
        for (const section of presentation.sections) {
          for (const ref of section.sessionRefs) {
            referencedIds.add(ref.sessionId)
          }
        }

        const allSessions = getStoredSessions()
        const sessions = allSessions.filter((s) => referencedIds.has(s.sessionId))

        // Warn if any referenced sessions are missing from storage
        const foundIds = new Set(sessions.map((s) => s.sessionId))
        const missingIds = [...referencedIds].filter((id) => !foundIds.has(id))
        if (missingIds.length > 0) {
          console.warn(`Export warning: ${missingIds.length} session(s) not found in storage: ${missingIds.join(', ')}`)
        }

        const exportData: PromptPlayFile = { presentation, sessions }
        writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8')

        return { success: true }
      }
    )

    // ---------- IPC: Read .promptplay file from path (for OS file association) ----------
    ipcMain.handle('presentation:readFile', async (_event, filePath: string) => {
      const data = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(data) as PromptPlayFile
      if (!parsed.presentation || !Array.isArray(parsed.sessions)) {
        throw new Error('Invalid .promptplay file: missing presentation or sessions')
      }
      return parsed
    })

    // ---------- IPC: Auto-update ----------
    ipcMain.on('update:installAndRestart', () => {
      autoUpdater.quitAndInstall()
    })

    // ---------- Auto-updater setup ----------
    setupAutoUpdater(mainWindow)

    // ---------- Load renderer ----------
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  app.whenReady().then(() => {
    createWindow()

    // Cold start: check process.argv for a .promptplay file path
    // (e.g., when launched by double-clicking a .promptplay file)
    const filePath = extractPromptPlayPath(process.argv)
    if (filePath && mainWindow) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow!.webContents.send('open-file', filePath)
      })
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
