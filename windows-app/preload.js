const { contextBridge } = require('electron');

// Expose safe Electron APIs to renderer window if needed
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform
});
