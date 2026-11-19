#!/usr/bin/env bash
# Construit les livrables Windows dans dist/ :
#   Atelier-implantation-Setup-<version>.exe   (installateur)
#   Atelier-implantation-<version>-portable.zip (sans installation)
# Sous Linux, NSIS a besoin de Wine : la compilation passe par Docker (build/signing.Dockerfile,
# image officielle d'electron-builder + jsign pour la signature).
#
# Signature : voir scripts/sign.js. Exemple avec un certificat .pfx :
#   ATELIER_SIGN=pfx ATELIER_PFX=~/certs/atelier.pfx ATELIER_PFX_PASSWORD='…' npm run dist:win
# Sans ATELIER_SIGN, les .exe ne sont pas signés.
set -euo pipefail
cd "$(dirname "$0")/.."
TARGETS="${TARGETS:-nsis zip}"

if [[ "$(uname -s)" != Linux ]]; then
  exec npx electron-builder --win $TARGETS --x64
fi

IMAGE=atelier-builder-sign:jsign-7.6
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Préparation de l'image de compilation ($IMAGE)…"
  docker build -q -t "$IMAGE" -f build/signing.Dockerfile build >/dev/null
fi

dhome="${XDG_CACHE_HOME:-$HOME/.cache}/atelier-builder-home"
mkdir -p "$dhome" "$HOME/.cache/electron" "$HOME/.cache/electron-builder"
args=(--rm -u "$(id -u):$(id -g)" -e HOME=/home/b
  -v "$dhome":/home/b
  -v "$HOME/.cache/electron":/home/b/.cache/electron
  -v "$HOME/.cache/electron-builder":/home/b/.cache/electron-builder
  -v "$PWD":/project -w /project)

# Variables de signature transmises au conteneur (valeurs jamais affichées).
for v in ATELIER_SIGN ATELIER_PFX_PASSWORD ATELIER_AZURE_ENDPOINT ATELIER_AZURE_ACCOUNT \
         ATELIER_AZURE_PROFILE ATELIER_AZURE_TOKEN ATELIER_JSIGN_ARGS ATELIER_TSA; do
  [[ -n "${!v:-}" ]] && args+=(-e "$v")
done
# Le certificat .pfx est monté en lecture seule, hors du dossier du projet.
if [[ -n "${ATELIER_PFX:-}" ]]; then
  pfx="$(realpath "$ATELIER_PFX")"
  args+=(-v "$pfx":/secrets/cert.pfx:ro -e ATELIER_PFX=/secrets/cert.pfx)
fi

docker run "${args[@]}" "$IMAGE" ./node_modules/.bin/electron-builder --win $TARGETS --x64

# Contrôle : état de la signature de chaque .exe produit.
if [[ -n "${ATELIER_SIGN:-}" ]]; then
  version=$(node -p "require('./package.json').version")
  echo "Contrôle des signatures :"
  docker run "${args[@]}" "$IMAGE" bash -c '
    CA=/etc/ssl/certs/ca-certificates.crt; bad=0
    for f in dist/win-unpacked/*.exe dist/*-Setup-'"$version"'.exe; do
      [[ -f "$f" ]] || continue
      out=$(osslsigncode verify -CAfile $CA -TSA-CAfile $CA -in "$f" 2>&1 || true)
      who=$(grep -m1 "Subject:" <<<"$out" | sed "s/^[[:space:]]*Subject: //")
      if [[ -z "$who" ]]; then echo "  ✗ NON SIGNÉ : $f"; bad=1; continue; fi
      grep -q "Timestamp Server Signature verification: ok" <<<"$out" && ts="horodatée" || ts="SANS horodatage valide"
      grep -q "^Signature verification: ok" <<<"$out" && trust="reconnue par les autorités publiques" || trust="non reconnue (certificat de test ?)"
      echo "  ✓ $f — $who — $ts — $trust"
    done
    exit $bad'
fi
