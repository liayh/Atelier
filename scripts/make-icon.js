/* Rend build/icon.svg en build/icon.png (512 px, icône de l'app) et build/icon.ico
   (16→256 px, icône des fichiers .atelier dans l'Explorateur Windows).
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
  // ICO à entrées PNG (format accepté depuis Windows Vista).
  const pngs = [16, 24, 32, 48, 64, 128, 256].map((n) => [n, img.resize({ width: n, height: n, quality: 'best' }).toPNG()]);
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([n, png], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(n % 256, e); head.writeUInt8(n % 256, e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(off, e + 12); off += png.length;
  });
  fs.writeFileSync(path.join(root, 'build', 'icon.ico'), Buffer.concat([head, ...pngs.map((p) => p[1])]));
  console.log('build/icon.png et build/icon.ico générés');
  app.quit();
});
