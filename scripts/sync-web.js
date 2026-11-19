/* Copie Atelier_implantation.html dans web/index.html et l'adapte au bureau :
   - polices IBM Plex locales (@fontsource) au lieu de Google Fonts ;
   - pdf.js 6 local (pdfjs-dist : modules, worker, polices standard, CMaps, décodeurs wasm) au lieu du CDN ;
   - exports via la boîte « Enregistrer sous » de Windows (window.desktop, cf. src/preload.js).
   Le fichier source n'est jamais modifié. Chaque remplacement est vérifié : si le HTML
   change au point qu'un motif ne correspond plus, le script échoue au lieu de produire
   une app à moitié hors-ligne. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.resolve(process.env.ATELIER_SOURCE || path.join(root, 'Atelier_implantation.html'));
const out = path.join(root, 'web');
const nm = path.join(root, 'node_modules');

if (!fs.existsSync(src)) { console.error(`Source introuvable : ${src}`); process.exit(1); }

/* CSP de la version navigateur (dans le fichier source) : empreinte recalculée si le script a changé. */
const { withBrowserCsp, META_RE } = require('./csp');
{
  const r = withBrowserCsp(fs.readFileSync(src, 'utf8'));
  if (r.changed) { fs.writeFileSync(src, r.html); console.log('CSP du fichier source mise à jour (empreinte du script)'); }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'fonts', 'files'), { recursive: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });

/* polices */
const FONTS = [{ pkg: 'ibm-plex-sans', variants: ['400', '500', '600', '700'] }, { pkg: 'ibm-plex-mono', variants: ['500'] }];
let fontsCss = '';
for (const { pkg, variants } of FONTS) {
  const dir = path.join(nm, '@fontsource', pkg);
  for (const subset of ['latin', 'latin-ext']) for (const v of variants) {
    const css = fs.readFileSync(path.join(dir, `${subset}-${v}.css`), 'utf8');
    for (const [, file] of css.matchAll(/url\(\.\/files\/([^)]+)\)/g)) fs.copyFileSync(path.join(dir, 'files', file), path.join(out, 'fonts', 'files', file));
    fontsCss += css + '\n';
  }
}
fs.writeFileSync(path.join(out, 'fonts', 'fonts.css'), fontsCss);

/* pdf.js 6 : modules + ressources chargées à la demande (vendor/pdfjs/ reproduit l'arborescence du paquet) */
const pj = path.join(nm, 'pdfjs-dist'), pjOut = path.join(out, 'vendor', 'pdfjs');
const pjVersion = require(path.join(pj, 'package.json')).version;
for (const f of ['build/pdf.min.mjs', 'build/pdf.worker.min.mjs']) {
  fs.mkdirSync(path.dirname(path.join(pjOut, f)), { recursive: true });
  fs.copyFileSync(path.join(pj, f), path.join(pjOut, f));
}
for (const d of ['wasm', 'standard_fonts', 'cmaps']) fs.cpSync(path.join(pj, d), path.join(pjOut, d), { recursive: true });

/* HTML */
let html = fs.readFileSync(src, 'utf8');
function patch(re, repl, label) {
  if (!re.test(html)) { console.error(`Motif introuvable (${label}) — le HTML source a changé, adapter scripts/sync-web.js`); process.exit(1); }
  html = html.replace(re, repl);
}
patch(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/, '', 'preconnect');
patch(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">', 'Google Fonts');
// même version de pdf.js côté navigateur (CDN) et côté bureau (copie locale)
const cdn = html.match(/const PDFJS = "https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@([0-9.]+)\/";/);
if (!cdn) { console.error('Motif introuvable (pdf.js) — adapter scripts/sync-web.js'); process.exit(1); }
if (cdn[1] !== pjVersion) { console.error(`pdf.js : le HTML utilise ${cdn[1]}, node_modules contient ${pjVersion} — aligner les deux`); process.exit(1); }
patch(/const PDFJS = "https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[0-9.]+\/";/, 'const PDFJS = "vendor/pdfjs/";', 'pdf.js');
patch(/dl = window\.claude \? await window\.claude\.use\("downloads"\) : null;/,
  'dl = window.desktop ? {save: async ({filename, data}) => { const buf = data instanceof Blob ? await data.arrayBuffer() : data; const r = await window.desktop.saveFile(filename, buf); if (!r) throw {code:"declined"}; dlPath = r; }} : null;',
  'exports');
patch(/let dl = null;/, 'let dl = null, dlPath = "";', 'exports (variable)');
patch(/msg\("Fichier proposé : " \+ name\);/, 'msg("Fichier enregistré : " + dlPath);', 'exports (message)');
patch(/Configuration copiée\. Colle-la dans le chat\./, 'Configuration copiée dans le presse-papiers.', 'message copie');
patch(/Le projet se garde seul dans ce navigateur\./, 'Le projet se garde seul sur cet ordinateur.', 'message sauvegarde');
/* Politique de sécurité (CSP) : seul le script du logiciel, identifié par son empreinte SHA-256,
   peut s'exécuter (tout code injecté, gestionnaire d'événement ou eval est bloqué) ; aucune connexion
   vers l'extérieur. Calculée en dernier, sur le script final. */
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) { console.error(`CSP : 1 script intégré attendu, ${scripts.length} trouvé(s)`); process.exit(1); }
const hash = require('crypto').createHash('sha256').update(scripts[0][1], 'utf8').digest('base64');
const csp = ["default-src 'self'", `script-src 'self' 'sha256-${hash}'`, "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "font-src 'self' data:", "worker-src 'self' blob:", "connect-src 'self' data: blob:",
  "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'"].join('; ');
patch(META_RE, '', 'CSP navigateur (remplacée)');
patch(/<meta charset="utf-8">/, `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`, 'CSP');
fs.writeFileSync(path.join(out, 'index.html'), html);

console.log(`web/ prêt depuis ${src}`);
