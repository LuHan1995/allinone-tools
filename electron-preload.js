const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Check if running inside Electron
  isElectron: true,

  // Serial assistant
  getSerialPath: () => ipcRenderer.invoke('get-serial-path'),
  openSerial: () => ipcRenderer.invoke('open-serial'),
  showSerialNotFound: () => ipcRenderer.invoke('show-serial-not-found')
});
