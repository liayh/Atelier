/* Politique de sécurité (CSP) de la version navigateur, écrite dans Atelier_implantation.html.
   Seul le script du logiciel (empreinte SHA-256) peut s'exécuter : un code injecté, un gestionnaire
   d'événement ou eval sont bloqués. Sont autorisés : pdf.js sur jsDelivr, Google Fonts.
   L'empreinte change à chaque modification du script : `npm run csp` la recalcule
   (scripts/sync-web.js le fait aussi avant chaque compilation de la version de bureau).
   Usage : node scripts/csp.js [--check]   (--check : signale sans modifier, code 1 si périmée) */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE = path.resolve(process.env.ATELIER_SOURCE || path.join(__dirname, '..', 'Atelier_implantation.html'));
const CDN = 'https://cdn.jsdelivr.net';

function browserCsp(hash) {
  return [
    "default-src 'self'",
    `script-src 'sha256-${hash}' ${CDN} 'wasm-unsafe-eval'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `font-src 'self' data: https://fonts.gstatic.com ${CDN}`,   // + polices standard des PDF (pdf.js)
    "img-src 'self' data: blob:",
    `worker-src blob: ${CDN}`,
    `connect-src ${CDN} data: blob:`,
    "object-src 'none'", "base-uri 'none'", "form-action 'none'",
  ].join('; ');
}

const scriptHash = (html) => {
  const s = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (s.length !== 1) throw new Error(`CSP : 1 script intégré attendu, ${s.length} trouvé(s)`);
  return crypto.createHash('sha256').update(s[0][1], 'utf8').digest('base64');
};
const META_RE = /<meta http-equiv="Content-Security-Policy" content="[^"]*">\n?/;

// Renvoie le HTML avec la CSP à jour, et indique si elle a changé.
function withBrowserCsp(html) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${browserCsp(scriptHash(html))}">\n`;
  if (META_RE.test(html)) {
    const next = html.replace(META_RE, meta);
    return { html: next, changed: next !== html };
  }
  if (!/<meta charset="utf-8">\n/.test(html)) throw new Error('CSP : balise <meta charset="utf-8"> introuvable');
  return { html: html.replace(/<meta charset="utf-8">\n/, (m) => m + meta), changed: true };
}

module.exports = { withBrowserCsp, scriptHash, META_RE };

if (require.main === module) {
  const html = fs.readFileSync(SOURCE, 'utf8');
  const r = withBrowserCsp(html);
  if (process.argv.includes('--check')) {
    console.log(r.changed ? 'CSP du fichier source périmée : lancer « npm run csp ».' : 'CSP du fichier source à jour.');
    process.exit(r.changed ? 1 : 0);
  }
  if (r.changed) fs.writeFileSync(SOURCE, r.html);
  console.log(r.changed ? `CSP mise à jour dans ${path.basename(SOURCE)}` : 'CSP déjà à jour');
}
