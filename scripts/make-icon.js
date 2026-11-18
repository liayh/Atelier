/* Rend build/icon.svg en build/icon.png (512 px) ; electron-builder en tire l'icône Windows.
   Lancer avec : electron scripts/make-icon.js */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(root, 'build', 'icon.svg'), 'utf8');
  const win = new BrowserWindow({ width: 512, height: 512, show: false, frame: false, transparent: true, webPreferences: { offscreen: true } });
  const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', '<svg width="512" height="512" ')}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 400));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  fs.writeFileSync(path.join(root, 'build', 'icon.png'), img.resize({ width: 512, height: 512, quality: 'best' }).toPNG());
  console.log('build/icon.png généré');
  app.quit();
});
