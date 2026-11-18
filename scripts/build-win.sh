#!/usr/bin/env bash
# Construit l'installateur Windows (dist/Atelier-implantation-Setup-<version>.exe).
# Sous Linux, NSIS a besoin de Wine : on passe par l'image Docker officielle d'electron-builder.
# Sous Windows, lancer simplement : npx electron-builder --win nsis --x64
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Linux ]] || command -v wine >/dev/null; then
  exec npx electron-builder --win nsis --x64
fi
dhome="${XDG_CACHE_HOME:-$HOME/.cache}/atelier-builder-home"
mkdir -p "$dhome" "$HOME/.cache/electron" "$HOME/.cache/electron-builder"
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/home/b \
  -v "$dhome":/home/b \
  -v "$HOME/.cache/electron":/home/b/.cache/electron \
  -v "$HOME/.cache/electron-builder":/home/b/.cache/electron-builder \
  -v "$PWD":/project -w /project \
  electronuserland/builder:wine ./node_modules/.bin/electron-builder --win nsis --x64
