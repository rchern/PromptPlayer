import { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

/**
 * Set up electron-updater with a VS Code-like UX:
 * - Downloads updates silently in the background
 * - Installs on next app quit
 * - Notifies renderer of update availability via IPC
 * - Errors are logged but never shown to the user
 *
 * In dev mode, the auto-update check is skipped entirely because
 * electron-updater throws when there is no published release feed.
 */
export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:downloading', info.version)
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update:ready', info.version)
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })

  // Check for updates after a short delay so the app can finish initializing
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)
}
