/* Signature Authenticode des .exe Windows, appelée par electron-builder pour chaque fichier
   (application, installateur, désinstallateur). Utilise jsign (/opt/jsign.jar, image
   build/signing.Dockerfile), qui fonctionne sous Linux.

   Sans ATELIER_SIGN, rien n'est signé (build de test). Si ATELIER_SIGN est défini et que la
   signature échoue, la compilation s'arrête : on ne publie jamais un build censé être signé
   qui ne l'est pas.

   ATELIER_SIGN=pfx    certificat en fichier .pfx / .p12
                       ATELIER_PFX (chemin), ATELIER_PFX_PASSWORD
   ATELIER_SIGN=azure  Azure Artifact Signing (ex-Trusted Signing), pour une entreprise
                       ATELIER_AZURE_ENDPOINT (ex. weu.codesigning.azure.net),
                       ATELIER_AZURE_ACCOUNT, ATELIER_AZURE_PROFILE,
                       ATELIER_AZURE_TOKEN (az account get-access-token --resource https://codesigning.azure.net)
   ATELIER_SIGN=jsign  options jsign brutes dans ATELIER_JSIGN_ARGS (carte / PKCS#11, ex. Certum)
   ATELIER_TSA         serveur d'horodatage (défaut : http://timestamp.digicert.com) */
const { spawnSync } = require('child_process');
const fs = require('fs');

const JSIGN = process.env.ATELIER_JSIGN_JAR || '/opt/jsign.jar';

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Signature : variable ${name} manquante`);
  return v;
}

function keystoreArgs(mode) {
  if (mode === 'pfx') {
    const pfx = need('ATELIER_PFX');
    if (!fs.existsSync(pfx)) throw new Error(`Signature : certificat introuvable (${pfx})`);
    return ['--storetype', 'PKCS12', '--keystore', pfx, '--storepass', need('ATELIER_PFX_PASSWORD')];
  }
  if (mode === 'azure') {
    return ['--storetype', 'TRUSTEDSIGNING', '--keystore', need('ATELIER_AZURE_ENDPOINT'),
      '--storepass', need('ATELIER_AZURE_TOKEN'),
      '--alias', `${need('ATELIER_AZURE_ACCOUNT')}/${need('ATELIER_AZURE_PROFILE')}`];
  }
  if (mode === 'jsign') return need('ATELIER_JSIGN_ARGS').split(/\s+/).filter(Boolean);
  throw new Error(`Signature : ATELIER_SIGN="${mode}" inconnu (pfx, azure ou jsign)`);
}

exports.default = async function sign(config) {
  const mode = process.env.ATELIER_SIGN;
  const file = config.path;
  if (!mode) {
    console.log(`  • signature ignorée (ATELIER_SIGN non défini) : ${file}`);
    return;
  }
  if (!fs.existsSync(JSIGN)) throw new Error(`Signature : jsign introuvable (${JSIGN}) — compiler via scripts/build-win.sh`);
  const args = ['-jar', JSIGN, ...keystoreArgs(mode),
    '--alg', 'SHA-256',
    '--tsaurl', process.env.ATELIER_TSA || 'http://timestamp.digicert.com', '--tsmode', 'RFC3161', '--tsretries', '3',
    '--name', config.name || "Atelier d'implantation",
    '--replace', file];
  const r = spawnSync('java', args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  // Ne jamais afficher la ligne de commande : elle contient le mot de passe ou le jeton.
  if (r.status !== 0) {
    throw new Error(`Signature échouée pour ${file} :\n${(r.stderr || r.stdout || r.error || '').toString().trim()}`);
  }
  console.log(`  • signé : ${file}`);
};
