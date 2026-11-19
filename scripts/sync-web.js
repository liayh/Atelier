/* Copie Atelier_implantation.html dans web/index.html et l'adapte au bureau :
   - polices IBM Plex locales (@fontsource) au lieu de Google Fonts ;
   - pdf.js local (pdfjs-dist) au lieu du CDN, eval désactivé (CVE-2024-4367) ;
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

/* pdf.js */
for (const f of ['pdf.min.js', 'pdf.worker.min.js']) fs.copyFileSync(path.join(nm, 'pdfjs-dist', 'build', f), path.join(out, 'vendor', f));

/* HTML */
let html = fs.readFileSync(src, 'utf8');
function patch(re, repl, label) {
  if (!re.test(html)) { console.error(`Motif introuvable (${label}) — le HTML source a changé, adapter scripts/sync-web.js`); process.exit(1); }
  html = html.replace(re, repl);
}
patch(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/, '', 'preconnect');
patch(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">', 'Google Fonts');
patch(/s\.src = "https:\/\/cdnjs[^"]*\/pdf\.min\.js"/, 's.src = "vendor/pdf.min.js"', 'pdf.js');
patch(/URL\.createObjectURL\(new Blob\(\['importScripts\("https:\/\/cdnjs[^"]*"\);'\], \{type:"text\/javascript"\}\)\)/,
  'new URL("vendor/pdf.worker.min.js", location.href).href', 'pdf.js worker');
patch(/getDocument\(\{data:buf\}\)/, 'getDocument({data:buf, isEvalSupported:false})', 'pdf.js eval');
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
patch(/<meta charset="utf-8">/, `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`, 'CSP');
fs.writeFileSync(path.join(out, 'index.html'), html);

console.log(`web/ prêt depuis ${src}`);
