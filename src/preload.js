const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  // Exports (csv, png) : data = chaîne ou ArrayBuffer. Renvoie le chemin, ou null si annulé.
  saveFile: (filename, data) => ipcRenderer.invoke('save-file', filename, data),
  // Projet : enregistre dans currentPath s'il est fourni, sinon demande où. Renvoie le chemin ou null.
  saveProject: (currentPath, suggestedName, text) => ipcRenderer.invoke('save-project', currentPath, suggestedName, text),
  openProject: () => ipcRenderer.invoke('open-project'),   // { path, text } ou null
  savePdf: (filename, html) => ipcRenderer.invoke('save-pdf', filename, html),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, d) => cb(d)),
});
