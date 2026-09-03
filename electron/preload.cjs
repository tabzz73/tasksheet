const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tasksheetAPI', {
  load: () => ipcRenderer.invoke('db:load'),
  save: (state) => ipcRenderer.invoke('db:save', state),
});
