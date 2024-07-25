const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getLevels: (type) => ipcRenderer.invoke('get-levels', type),
  openLevel: (levelPath) => ipcRenderer.invoke('open-level', levelPath),
  saveLevel: (levelPath, newContent) => ipcRenderer.invoke('save-level', levelPath, newContent),
  deleteLevel: (levelPath) => ipcRenderer.invoke('delete-level', levelPath),
  moveLevel: (levelPath, targetDir) => ipcRenderer.invoke('move-level', levelPath, targetDir),
  copyLevel: (levelPath, targetDir) => ipcRenderer.invoke('copy-level', levelPath, targetDir),
  installLevel: () => ipcRenderer.invoke('install-level'),
  process: {
    env: {
      APPDATA: process.env.APPDATA,
    },
  },
});
