const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
require('dotenv').config();

let mainWindow;
let serverProcess = null;

const startUrl = process.env.APP_URL || "https://mesa2-production.up.railway.app/";
const isRemote = startUrl.startsWith("https://") || (startUrl.startsWith("http://") && !startUrl.includes("localhost") && !startUrl.includes("127.0.0.1"));

function startBackendServer() {
  if (isRemote) {
    console.log('[Electron Server Engine] Remote APP_URL configured. Skipping local database/server startup.');
    return;
  }
  console.log('[Electron Server Engine] Booting localized Express server...');
  const serverPath = path.join(__dirname, 'dist/server.cjs');

  try {
    // Spawn server.cjs as a background child process
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit' // forward standard output to Electron window console
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron Server Engine] Failed to start backend server process:', err);
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`[Electron Server Engine] Server process exited with code ${code} and signal ${signal}`);
    });
  } catch (err) {
    console.error('[Electron Server Engine] Critical error initiating server process:', err);
  }
}

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

  // Remove the default system menu bar
  mainWindow.setMenu(null);

  const finalUrl = startUrl;

  if (isRemote) {
    // Load remote server immediately without any local startup delay
    mainWindow.loadURL(finalUrl).catch((err) => {
      console.error("[Electron Window] Failed to connect to remote server:", err.message);
    });
  } else {
    // Wait 1.5 seconds for local Express server to bind to port 3000, then load
    setTimeout(() => {
      mainWindow.loadURL(finalUrl).catch((err) => {
        console.warn("[Electron Window] Server page load fell back to offline index.html:", err.message);
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html')).catch((fileErr) => {
          console.error("[Electron Window] Failed to load local fallback index.html:", fileErr);
        });
      });
    }, 1500);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start the Express server backend when app starts up
app.whenReady().then(() => {
  // Start server
  startBackendServer();
  // Start Window
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

// Ensure the Express backend process is cleanly terminated on Electron exit
app.on('will-quit', () => {
  if (serverProcess) {
    console.log('[Electron Server Engine] Sending SIGTERM termination request to Express server...');
    serverProcess.kill('SIGTERM');
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
