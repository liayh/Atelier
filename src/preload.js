const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  // data : chaîne ou ArrayBuffer. Renvoie le chemin enregistré, ou null si annulé.
  saveFile: (filename, data) => ipcRenderer.invoke('save-file', filename, data),
});
