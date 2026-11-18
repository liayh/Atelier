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

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
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
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });
  // Le titre de la page reste celui de l'app.
  mainWindow.on('page-title-updated', (e) => e.preventDefault());
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

/* ------------------------------ menu ------------------------------ */

const clickInPage = (id) => () => {
  if (!mainWindow) return;
  mainWindow.webContents.executeJavaScript(`document.getElementById(${JSON.stringify(id)})?.click()`, true);
};

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'Fichier',
      submenu: [
        { label: 'Nouveau projet', accelerator: 'CmdOrCtrl+N', click: clickInPage('newproj') },
        { label: 'Ouvrir un projet…', accelerator: 'CmdOrCtrl+O', click: clickInPage('openproj') },
        { label: 'Ajouter un plan (PDF, image)…', accelerator: 'CmdOrCtrl+P', click: clickInPage('addplan') },
        { type: 'separator' },
        { label: 'Enregistrer le projet (.json)…', accelerator: 'CmdOrCtrl+S', click: clickInPage('x-json') },
        { label: 'Exporter les liaisons (.csv)…', click: clickInPage('x-csv') },
        { label: 'Exporter ce plan (.png)…', click: clickInPage('x-png') },
        { type: 'separator' },
        { label: 'Ouvrir le dossier des projets', click: () => { fs.mkdirSync(docsDir(), { recursive: true }); shell.openPath(docsDir()); } },
        { type: 'separator' },
        { label: 'Quitter', role: 'quit', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', role: 'undo' }, { label: 'Rétablir', role: 'redo' }, { type: 'separator' },
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
            + `Le projet en cours est gardé automatiquement.\nExports : ${docsDir()}`,
        }),
      }],
    },
  ]);
}
