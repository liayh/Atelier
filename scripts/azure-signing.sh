# Fonctions communes pour la signature via Azure Artifact Signing (à sourcer, pas à exécuter).
# Les informations sont lues dans un fichier privé, hors du projet :
#   ${XDG_CONFIG_HOME:-~/.config}/atelier-signature/azure.env   (droits 600)
# créé par `npm run sign:setup`. Le secret n'est jamais affiché ni passé en argument
# de commande (invisible dans la liste des processus).

AZ_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/atelier-signature"
AZ_CONFIG="$AZ_CONFIG_DIR/azure.env"

azure_load() {
  if [[ ! -f "$AZ_CONFIG" ]]; then
    echo "Signature Azure non configurée : lancer d'abord « npm run sign:setup »." >&2
    return 1
  fi
  if [[ "$(stat -c %a "$AZ_CONFIG")" != 600 ]]; then chmod 600 "$AZ_CONFIG"; fi
  # shellcheck disable=SC1090
  set -a; source "$AZ_CONFIG"; set +a
  local v
  for v in AZ_TENANT AZ_CLIENT_ID AZ_CLIENT_SECRET AZ_ACCOUNT AZ_PROFILE AZ_ENDPOINT; do
    if [[ -z "${!v:-}" ]]; then echo "Configuration incomplète ($v manquant) : relancer « npm run sign:setup »." >&2; return 1; fi
  done
}

# Écrit sur la sortie standard un jeton d'accès Azure valable environ une heure.
azure_token() {
  node -e '
    const e = process.env;
    const body = new URLSearchParams({ grant_type: "client_credentials", client_id: e.AZ_CLIENT_ID,
      client_secret: e.AZ_CLIENT_SECRET, scope: "https://codesigning.azure.net/.default" });
    fetch(`https://login.microsoftonline.com/${encodeURIComponent(e.AZ_TENANT)}/oauth2/v2.0/token`, { method: "POST", body })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!j.access_token) {
          console.error("Azure refuse la connexion : " + String(j.error_description || j.error || r.status).split(/\r?\n/)[0]);
          process.exit(1);
        }
        process.stdout.write(j.access_token);
      })
      .catch((err) => { console.error("Connexion à Azure impossible : " + err.message); process.exit(1); });'
}

# Prépare les variables lues par scripts/sign.js (mode ATELIER_SIGN=azure).
azure_export_for_sign() {
  azure_load || return 1
  ATELIER_AZURE_TOKEN="$(azure_token)" || return 1
  export ATELIER_AZURE_TOKEN ATELIER_AZURE_ENDPOINT="$AZ_ENDPOINT" \
         ATELIER_AZURE_ACCOUNT="$AZ_ACCOUNT" ATELIER_AZURE_PROFILE="$AZ_PROFILE"
  unset AZ_CLIENT_SECRET
}
