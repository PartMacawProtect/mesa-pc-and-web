const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();

let mainWindow;

// The Electron client connects directly to the server (default to Railway or dynamic local address)
const startUrl = process.env.APP_URL || "https://ais-pre-yaprjj4f7u2ixp42cb3cvy-485371740836.europe-west2.run.app";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#090d16',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-electron.js')
    }
  });

  mainWindow.setMenu(null);

  mainWindow.loadURL(startUrl).catch((err) => {
    console.error("[Electron Window] Failed to connect to server:", err.message);
    mainWindow.loadFile(path.join(__dirname, 'index.html')).catch((fileErr) => {
      console.error("[Electron Window] Failed to load offline fallback index.html:", fileErr);
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window controls IPC listeners
ipcMain.on('window-control-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-control-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-control-close', () => {
  if (mainWindow) mainWindow.close();
});
