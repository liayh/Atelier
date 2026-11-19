#!/usr/bin/env bash
# Prépare Azure Artifact Signing pour BLL. À coller dans un terminal Azure déjà connecté
# (vscode.dev/azure ou Cloud Shell, en Bash). Ne contient aucun secret.
# Crée : groupe de ressources, compte de signature (Europe, offre Basic), compte robot de compilation
# et ses droits. La validation de l'identité de BLL reste à faire dans le portail (impossible en ligne
# de commande, d'après Microsoft). Facturation Artifact Signing : dès la création du compte.
set -euo pipefail
RG=atelier-signature
LOC=westeurope   # emplacement du groupe de ressources seulement
# Régions du service de signature, par ordre de préférence (Europe d'abord) et leur point d'accès.
# West Europe refuse les nouveaux clients (RequestDisallowedByAzure) : on essaie les suivantes.
REGIONS="northeurope:neu polandcentral:plc switzerlandnorth:swn westeurope:weu"

SUB=$(az account show --query id -o tsv)
TENANT=$(az account show --query tenantId -o tsv)
ACC="bllatelier$(echo "$SUB" | tr -dc 'a-z0-9' | cut -c1-6)"   # nom unique au monde, 3 à 24 caractères

echo "1/6 Inscription du service de signature (Microsoft.CodeSigning)…"
az provider register --namespace Microsoft.CodeSigning --wait

echo "2/6 Groupe de ressources $RG ($LOC)…"
az group create -n "$RG" -l "$LOC" -o none

echo "3/6 Compte de signature $ACC (offre Basic)…"
SIGLOC=$(az artifact-signing show -n "$ACC" -g "$RG" --query location -o tsv 2>/dev/null || true)
if [ -z "$SIGLOC" ]; then
  for r in $REGIONS; do
    echo "    essai dans la région ${r%%:*}…"
    if az artifact-signing create -n "$ACC" -g "$RG" -l "${r%%:*}" --sku Basic -o none 2>/tmp/as-err; then SIGLOC=${r%%:*}; break; fi
    grep -q -i "not accepting new customers\|RequestDisallowedByAzure\|LocationNotAvailable\|NoRegisteredProviderFound" /tmp/as-err \
      || { cat /tmp/as-err; exit 1; }
    echo "    région fermée aux nouveaux clients, suivante."
  done
  [ -n "$SIGLOC" ] || { echo "Aucune région européenne disponible : me contacter."; exit 1; }
fi
SIGLOC=$(echo "$SIGLOC" | tr -d ' ' | tr 'A-Z' 'a-z')
EP=""; for r in $REGIONS; do [ "${r%%:*}" = "$SIGLOC" ] && EP="${r##*:}.codesigning.azure.net"; done
echo "    compte créé dans $SIGLOC (point d'accès $EP)"
SCOPE=$(az artifact-signing show -n "$ACC" -g "$RG" --query id -o tsv)

role() {  # role <id objet> <type> <nom actuel> <ancien nom>
  az role assignment create --assignee-object-id "$1" --assignee-principal-type "$2" --role "$3" --scope "$SCOPE" -o none 2>/dev/null \
    || az role assignment create --assignee-object-id "$1" --assignee-principal-type "$2" --role "$4" --scope "$SCOPE" -o none
}

echo "4/6 Droit de faire valider l'identité de BLL (pour toi)…"
ME=$(az ad signed-in-user show --query id -o tsv)
role "$ME" User "Artifact Signing Identity Verifier" "Trusted Signing Identity Verifier" \
  || echo "    (à donner dans le portail : compte de signature > Contrôle d'accès (IAM))"

echo "5/6 Compte robot « atelier-signature » pour la compilation…"
APP=""; SECRET=""
if APP=$(az ad app list --display-name atelier-signature --query "[0].appId" -o tsv 2>/dev/null) \
   && { [ -n "$APP" ] || APP=$(az ad app create --display-name atelier-signature --query appId -o tsv 2>/dev/null); } \
   && [ -n "$APP" ]; then
  az ad sp show --id "$APP" -o none 2>/dev/null || az ad sp create --id "$APP" -o none
  SP=$(az ad sp show --id "$APP" --query id -o tsv)
  SECRET=$(az ad app credential reset --id "$APP" --display-name compilation --years 2 --append --query password -o tsv)
  echo "6/6 Droit de signer pour le compte robot…"
  sleep 20   # le temps que le compte robot soit visible partout
  role "$SP" ServicePrincipal "Artifact Signing Certificate Profile Signer" "Trusted Signing Certificate Profile Signer"
  MODE="robot"
else
  # Pas le droit de créer une application dans l'annuaire : on signera avec le compte de l'utilisateur
  # (jeton d'accès temporaire obtenu dans Cloud Shell au moment de compiler).
  echo "    pas le droit de créer un compte robot dans l'annuaire : signature avec ton propre compte."
  echo "6/6 Droit de signer pour toi…"
  role "$ME" User "Artifact Signing Certificate Profile Signer" "Trusted Signing Certificate Profile Signer"
  MODE="jeton"
fi

if [ "$MODE" = robot ]; then
cat <<EOF

================ À REPORTER DANS « npm run sign:setup » ================
Mode                            : robot   (r)
ID de l'annuaire (tenant)       : $TENANT
ID d'application (client)       : $APP
Nom du compte de signature      : $ACC
Nom du profil de certificat     : atelier   (à créer après la validation de BLL)
Point d'accès de la région      : $EP
Secret client (à garder privé)  : $SECRET
=========================================================================
Le secret ne sera plus jamais affiché : copie-le maintenant, ne l'envoie à personne.
EOF
else
cat <<EOF

================ À REPORTER DANS « npm run sign:setup » ================
Mode                            : jeton personnel   (j)
Nom du compte de signature      : $ACC
Nom du profil de certificat     : atelier   (à créer après la validation de BLL)
Point d'accès de la région      : $EP
=========================================================================
Au moment de compiler, obtenir un jeton (valable environ 1 h) dans Cloud Shell avec :
  az account get-access-token --resource https://codesigning.azure.net --query accessToken -o tsv
EOF
fi
echo "Étape suivante, dans le portail : compte $ACC > Identity validations > Organization > New identity > Public."
