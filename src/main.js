/* Atelier d'implantation — application de bureau (Electron).
   Sert web/ via app://atelier (origine stable → le projet en cours reste dans IndexedDB,
   dans le profil utilisateur), menus natifs, exports via « Enregistrer sous ». */
const { app, BrowserWindow, Menu, protocol, net, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const SCHEME = 'app';
const HOST = 'atelier';
const START_URL = `${SCHEME}://${HOST}/index.html`;
const WEB_ROOT = path.join(__dirname, '..', 'web');
const TITLE = "Atelier d'implantation";

let mainWindow = null;
let pendingFile = null;   // projet .atelier passé au lancement (double-clic dans l'Explorateur)
let reportPage = '';      // HTML du rapport en cours de conversion en PDF

const PROJECT_EXT = /\.(atelier|json)$/i;
const projectArg = (argv) => argv.slice(1).find((a) => PROJECT_EXT.test(a) && fs.existsSync(a)) || null;

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (!mainWindow) return;
    const file = projectArg(argv);
    if (file) sendProjectFile(file);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(onReady);
}
app.on('window-all-closed', () => app.quit());

const docsDir = () => path.join(app.getPath('documents'), TITLE);
const windowStateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function onReady() {
  if (process.platform === 'win32') app.setAppUserModelId('fr.devben.atelierimplantation');

  protocol.handle(SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    if (pathname === '/__report.html') {
      return new Response(reportPage, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    const filePath = path.normalize(path.join(WEB_ROOT, decodeURIComponent(pathname)));
    if (!filePath.startsWith(WEB_ROOT + path.sep) || !fs.existsSync(filePath)) {
      return new Response('Introuvable', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  ipcMain.handle('save-file', async (_e, filename, data) => {
    const name = path.basename(String(filename || 'export'));
    const ext = path.extname(name).slice(1).toLowerCase();
    const label = { json: 'Projet Atelier', csv: 'Tableau CSV', png: 'Image PNG' }[ext] || 'Fichier';
    fs.mkdirSync(docsDir(), { recursive: true });
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Enregistrer',
      defaultPath: path.join(docsDir(), name),
      filters: ext ? [{ name: label, extensions: [ext] }] : [],
    });
    if (canceled || !filePath) return null;
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    await fs.promises.writeFile(filePath, buf);
    return filePath;
  });

  ipcMain.handle('save-project', async (_e, currentPath, suggested, text) => {
    let target = typeof currentPath === 'string' && /\.atelier$/i.test(currentPath)
      && fs.existsSync(path.dirname(currentPath)) ? currentPath : null;
    if (!target) {
      fs.mkdirSync(docsDir(), { recursive: true });
      const r = await dialog.showSaveDialog(mainWindow, {
        title: 'Enregistrer le projet',
        defaultPath: path.join(docsDir(), path.basename(String(suggested || 'projet.atelier'))),
        filters: [{ name: "Projet Atelier d'implantation", extensions: ['atelier'] }],
      });
      if (r.canceled || !r.filePath) return null;
      target = /\.atelier$/i.test(r.filePath) ? r.filePath : r.filePath + '.atelier';
    }
    // Écriture atomique : un fichier temporaire puis renommage, pour ne jamais laisser un projet tronqué.
    const tmp = target + '.tmp';
    await fs.promises.writeFile(tmp, String(text), 'utf8');
    await fs.promises.rename(tmp, target);
    app.addRecentDocument(target);
    return target;
  });

  ipcMain.handle('open-project', async () => {
    fs.mkdirSync(docsDir(), { recursive: true });
    const r = await dialog.showOpenDialog(mainWindow, {
      title: 'Ouvrir un projet', defaultPath: docsDir(), properties: ['openFile'],
      filters: [{ name: "Projet Atelier d'implantation", extensions: ['atelier', 'json'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return readProject(r.filePaths[0]);
  });

  ipcMain.handle('save-pdf', async (_e, filename, html) => {
    fs.mkdirSync(docsDir(), { recursive: true });
    const r = await dialog.showSaveDialog(mainWindow, {
      title: 'Enregistrer le rapport',
      defaultPath: path.join(docsDir(), path.basename(String(filename || 'rapport.pdf'))),
      filters: [{ name: 'Document PDF', extensions: ['pdf'] }],
    });
    if (r.canceled || !r.filePath) return null;
    const target = /\.pdf$/i.test(r.filePath) ? r.filePath : r.filePath + '.pdf';
    reportPage = String(html);
    const win = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true, contextIsolation: true } });
    try {
      await win.loadURL(`${SCHEME}://${HOST}/__report.html`);
      await win.webContents.executeJavaScript('document.fonts.ready', true).catch(() => {});
      const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
      await fs.promises.writeFile(target, pdf);
    } finally {
      win.destroy();
      reportPage = '';
    }
    shell.openPath(target);
    return target;
  });

  pendingFile = projectArg(process.argv);
  Menu.setApplicationMenu(buildMenu());
  createWindow();
}

/* ------------------------------ fenêtre ------------------------------ */

function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(windowStateFile(), 'utf8')); }
  catch { return { width: 1440, height: 900, maximized: true }; }
}
function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    fs.writeFileSync(windowStateFile(), JSON.stringify({ ...mainWindow.getNormalBounds(), maximized: mainWindow.isMaximized() }));
  } catch { /* non bloquant */ }
}

function createWindow() {
  const state = loadWindowState();
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  mainWindow = new BrowserWindow({
    x: state.x, y: state.y, width: state.width, height: state.height,
    minWidth: 900, minHeight: 600,
    title: TITLE,
    backgroundColor: '#f3f4f6',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false,
    },
  });
  if (state.maximized) mainWindow.maximize();
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingFile) { sendProjectFile(pendingFile); pendingFile = null; }
  });
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });
  secureWebContents(mainWindow.webContents);
  mainWindow.loadURL(START_URL);
}

function secureWebContents(contents) {
  const session = contents.session;
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // Bloque toute navigation (ex. fichier lâché hors de la zone du plan).
  contents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${SCHEME}://${HOST}/`)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });
  const allowed = new Set(['clipboard-sanitized-write']);
  session.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));
  session.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
  // Repli si un téléchargement passe quand même par le navigateur.
  session.on('will-download', (_event, item) => {
    fs.mkdirSync(docsDir(), { recursive: true });
    item.setSaveDialogOptions({ title: 'Enregistrer', defaultPath: path.join(docsDir(), item.getFilename()) });
  });
}

/* ------------------------------ projets ------------------------------ */

async function readProject(file) {
  const text = await fs.promises.readFile(file, 'utf8');
  app.addRecentDocument(file);
  return { path: /\.atelier$/i.test(file) ? file : '', text };   // un .json s'enregistre ensuite en .atelier
}

function sendProjectFile(file) {
  readProject(file)
    .then((d) => mainWindow && mainWindow.webContents.send('open-file', d))
    .catch((err) => dialog.showErrorBox('Ouverture impossible', String(err)));
}

/* ------------------------------ menu ------------------------------ */

// Commande exécutée par la page (window.atelierCmd). Les raccourcis marqués `page: true`
// sont gérés par la page elle-même (Ctrl+Z dans un champ texte doit rester natif) :
// le menu les affiche sans les intercepter.
const cmd = (name) => () => {
  if (!mainWindow) return;
  mainWindow.webContents.executeJavaScript(`window.atelierCmd && window.atelierCmd(${JSON.stringify(name)})`, true);
};
const item = (label, name, accelerator, page) => ({ label, click: cmd(name), accelerator, registerAccelerator: !page });

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'Fichier',
      submenu: [
        item('Nouveau projet', 'new', 'CmdOrCtrl+N'),
        item('Ouvrir un projet…', 'open', 'CmdOrCtrl+O', true),
        item('Ajouter un plan (PDF, image)…', 'addplan', 'CmdOrCtrl+P'),
        { type: 'separator' },
        item('Enregistrer', 'save', 'CmdOrCtrl+S', true),
        item('Enregistrer sous…', 'saveas', 'CmdOrCtrl+Shift+S', true),
        { type: 'separator' },
        item('Rapport PDF…', 'pdf', 'CmdOrCtrl+E'),
        item('Exporter les liaisons (.csv)…', 'csv'),
        item('Exporter ce plan (.png)…', 'png'),
        { type: 'separator' },
        { label: 'Ouvrir le dossier des projets', click: () => { fs.mkdirSync(docsDir(), { recursive: true }); shell.openPath(docsDir()); } },
        { type: 'separator' },
        { label: 'Quitter', role: 'quit', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        item('Annuler', 'undo', 'CmdOrCtrl+Z', true), item('Rétablir', 'redo', 'CmdOrCtrl+Y', true), { type: 'separator' },
        item("Dupliquer l'élément", 'dup', 'CmdOrCtrl+D', true), { type: 'separator' },
        { label: 'Couper', role: 'cut' }, { label: 'Copier', role: 'copy' }, { label: 'Coller', role: 'paste' },
        { label: 'Tout sélectionner', role: 'selectAll' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', role: 'reload' }, { type: 'separator' },
        { label: 'Agrandir l\'interface', role: 'zoomIn' }, { label: 'Réduire l\'interface', role: 'zoomOut' },
        { label: 'Taille normale', role: 'resetZoom' }, { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ label: 'Outils de développement', role: 'toggleDevTools' }]),
      ],
    },
    {
      label: 'Aide',
      submenu: [{
        label: `À propos`,
        click: () => dialog.showMessageBox(mainWindow, {
          type: 'info', title: 'À propos', message: `${TITLE} ${app.getVersion()}`,
          detail: 'Implantation réseau sur plans : bornes WiFi, caméras, prises RJ45, baie, fibre, longueurs de câble.\n\n'
            + `Le projet en cours est gardé automatiquement, même sans l'enregistrer.\nProjets et exports : ${docsDir()}`,
        }),
      }],
    },
  ]);
}
