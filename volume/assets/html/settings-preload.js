const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onInitVolume: (callback) => ipcRenderer.on('onInit-volume', (_event, value) => callback(value)),
  setVolume: (value) => ipcRenderer.invoke('set-volume', value),
  getVolume: () => ipcRenderer.invoke('get-volume'),
  setMute: () => ipcRenderer.invoke('set-mute'),
  setUnmute: () => ipcRenderer.invoke('set-unmute'),
  volumeMsg: (value) => ipcRenderer.invoke('volume-msg', value),
  quit: () => ipcRenderer.send('volume-quit'),
});
