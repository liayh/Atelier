#!/usr/bin/env bash
# Vérifie toute la chaîne de signature Azure sans compiler le logiciel :
# connexion du compte robot, droits sur le profil, signature d'un petit .exe de test,
# puis contrôle du signataire. Consomme une seule signature. Usage : npm run sign:check
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/azure-signing.sh

echo "1/3 Lecture de la configuration…"; azure_load
echo "2/3 Connexion à Azure avec le compte robot…"
azure_export_for_sign
echo "    connexion OK"

IMAGE=atelier-builder-sign:jsign-7.6
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker build -q -t "$IMAGE" -f build/signing.Dockerfile build >/dev/null
fi
src=$(find "$HOME/.cache/electron-builder" -name elevate.exe 2>/dev/null | head -1)
[[ -n "$src" ]] || { echo "Petit .exe de test introuvable : lancer d'abord « npm run dist:win » une fois." >&2; exit 1; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cp "$src" "$tmp/test.exe"; chmod 644 "$tmp/test.exe"

echo "3/3 Signature d'un fichier de test…"
docker run --rm -u "$(id -u):$(id -g)" -e ATELIER_SIGN=azure -e ATELIER_AZURE_TOKEN -e ATELIER_AZURE_ENDPOINT \
  -e ATELIER_AZURE_ACCOUNT -e ATELIER_AZURE_PROFILE -e ATELIER_TSA \
  -v "$PWD/scripts":/s:ro -v "$tmp":/t "$IMAGE" bash -c '
    node -e "require(\"/s/sign.js\").default({ path: \"/t/test.exe\", name: \"Test signature Atelier\" }).catch(e => { console.error(e.message); process.exit(1); })" || exit 1
    CA=/etc/ssl/certs/ca-certificates.crt
    out=$(osslsigncode verify -CAfile $CA -TSA-CAfile $CA -in /t/test.exe 2>&1 || true)
    who=$(grep -m1 "Subject:" <<<"$out" | sed "s/^[[:space:]]*Subject: //")
    [[ -n "$who" ]] || { echo "    ✗ le fichier de test n est pas signé"; exit 1; }
    echo "    éditeur : $who"
    grep -q "Timestamp Server Signature verification: ok" <<<"$out" && echo "    horodatage : OK"
    # Les racines de signature de code Microsoft ne sont pas toujours dans la liste de Linux :
    # information seulement, Windows fait foi.
    grep -q "^Signature verification: ok" <<<"$out" && echo "    chaîne de confiance : reconnue" \
      || echo "    chaîne de confiance : non vérifiable sous Linux (normal pour Microsoft), Windows la vérifiera"
    echo "    ✓ signature Azure opérationnelle : tout est prêt"'
