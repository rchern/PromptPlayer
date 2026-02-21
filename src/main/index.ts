import { app, BrowserWindow, ipcMain, nativeTheme, screen } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'

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

// ---------- Window creation ----------
function createWindow(): void {
  const savedBounds = loadWindowBounds()

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
    mainWindow.show()
  })

  // Save window bounds on close
  mainWindow.on('close', () => {
    saveWindowBounds(mainWindow.getBounds())
  })

  // ---------- IPC: Window controls ----------
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

  // ---------- IPC: Theme ----------
  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)
  nativeTheme.on('updated', () => {
    mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
  })

  // ---------- Load renderer ----------
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
