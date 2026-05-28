const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.versions.node
  }),
  minimize: () => ipcRenderer.send('window-control-minimize'),
  maximize: () => ipcRenderer.send('window-control-maximize'),
  close: () => ipcRenderer.send('window-control-close')
});
