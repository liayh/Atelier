#!/usr/bin/env bash
# Enregistre les informations de signature Azure dans un fichier privé (droits 600), hors du projet.
# À lancer une fois dans un terminal : npm run sign:setup
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/azure-signing.sh

echo "Configuration de la signature Azure Artifact Signing (BLL)"
echo "Les valeurs se trouvent dans le portail Azure (voir README, section Signature)."
echo
ask() { local var=$1 label=$2 def=${3:-} val; read -r -p "$label${def:+ [$def]} : " val; printf -v "$var" '%s' "${val:-$def}"; }
ask T  "ID de l'annuaire (tenant)"
ask C  "ID d'application (client) du compte robot"
ask A  "Nom du compte de signature"
ask P  "Nom du profil de certificat" "atelier"
ask E  "Point d'accès de la région" "weu.codesigning.azure.net"
read -r -s -p "Secret client (la saisie reste invisible) : " S; echo
for x in "$T" "$C" "$A" "$P" "$E" "$S"; do [[ -n "$x" ]] || { echo "Valeur vide : abandon." >&2; exit 1; }; done

umask 077
mkdir -p "$AZ_CONFIG_DIR"
{
  printf 'AZ_TENANT=%q\nAZ_CLIENT_ID=%q\nAZ_ACCOUNT=%q\nAZ_PROFILE=%q\nAZ_ENDPOINT=%q\nAZ_CLIENT_SECRET=%q\n' "$T" "$C" "$A" "$P" "$E" "$S"
} > "$AZ_CONFIG"
chmod 600 "$AZ_CONFIG"
echo
echo "Enregistré dans $AZ_CONFIG (lisible par toi seul)."
echo "Étape suivante : npm run sign:check"
