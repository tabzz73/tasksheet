const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const persistence = require('./persistence.cjs');

const APP_ID = 'com.softvibesolutions.tasksheet';

app.setAppUserModelId(APP_ID);

ipcMain.handle('db:load', () => persistence.load(app.getPath('userData')));
ipcMain.handle('db:save', (_event, state) => persistence.save(app.getPath('userData'), state));

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    title: `TaskSheet ${app.getVersion()}`,
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: '#f8fafc',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.removeMenu();
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
