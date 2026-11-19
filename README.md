# Atelier d'implantation — application de bureau Windows

Source unique : `Atelier_implantation.html` (à modifier ici). L'app Electron la recopie dans `web/`
en la rendant 100 % hors ligne (polices et pdf.js locaux) — voir `scripts/sync-web.js`.

## Installer sur un PC Windows
Copier `dist/Atelier-implantation-Setup-<version>.exe` sur le PC et le lancer.
L'installateur n'est pas signé : Windows SmartScreen affiche « Windows a protégé votre ordinateur »
→ **Informations complémentaires** → **Exécuter quand même**. Pas besoin de droits administrateur.

- Le projet en cours est gardé automatiquement (profil utilisateur, `%APPDATA%\atelier-implantation`).
- **Enregistrer** crée un fichier `.atelier` (projet complet, plans compris) ; un double-clic dessus l'ouvre.
  Les anciens projets `.json` s'ouvrent toujours.
- **Rapport PDF** : synthèse, points d'attention, matériel (dont tourets de 305 m), liaisons, un plan annoté par page.
- Dossier proposé par défaut : `Documents\Atelier d'implantation`.

| Raccourci | Action |
|---|---|
| Ctrl+Z / Ctrl+Y | Annuler / rétablir (100 étapes) |
| Ctrl+S / Ctrl+Maj+S | Enregistrer / enregistrer sous |
| Ctrl+O, Ctrl+N | Ouvrir, nouveau projet |
| Ctrl+P | Ajouter un plan (PDF, image) |
| Ctrl+E | Rapport PDF |
| Ctrl+D | Dupliquer l'élément choisi |
| Flèches (Maj = plus loin), Suppr, Échap | Déplacer, retirer, désélectionner |
| Ctrl+A, Maj+clic, Maj+glisser | Sélection multiple (réglages par lot, déplacement groupé) |

**Tracé des câbles** : choisir un appareil puis glisser son câble (ou un point bleu au milieu d'un segment)
crée un coude ; les coudes s'alignent d'eux-mêmes à l'horizontale / verticale de leurs voisins.
Double-clic ou clic droit sur un coude : l'enlever. « Tracé automatique » revient à l'équerre par défaut.
La longueur suit le tracé dessiné.

**PoE** : consommation par borne (15 W par défaut) et caméra (6,5 W), comparée au budget du switch.
**Chiffrage** : prix unitaires HT + TVA, page « Estimation » dans le rapport ; « Retenir comme tarifs par défaut »
les réutilise pour les nouveaux projets.

## Installer sous Linux (64 bits)
- **AppImage** (toutes distributions) : `chmod +x Atelier-implantation-1.2.0-x86_64.AppImage` puis double-clic.
  Si l'AppImage ne démarre pas (FUSE absent) : `./Atelier-implantation-1.2.0-x86_64.AppImage --appimage-extract-and-run`.
- **Ubuntu / Debian** : `sudo apt install ./Atelier-implantation-1.2.0-amd64.deb` — ajoute l'app au menu et
  l'ouverture des fichiers `.atelier` par double-clic.

## Catalogue d'éléments (v1.3)
La palette au-dessus du plan est organisée en cinq onglets. Un seul tableau (`CAT`, en haut du script de
`Atelier_implantation.html`) décrit chaque élément : catégorie, couleur, symbole, type de câble, modèle, PoE.
Ajouter un équipement = ajouter une ligne dans ce tableau.

| Onglet | Éléments |
|---|---|
| Réseau | borne WiFi, prise RJ45, baie, arrivée fibre, gaine montante, routeur multiWAN, box secours 4G, switch 52 ports, NAS |
| Téléphonie | poste IP filaire (Yealink T53), base DECT IP (W70B), combiné sans fil (W73H), adaptateur fax (PAP2T) |
| Alarme | centrale, clavier, sirène, détecteur IR, bouton agression, interphonie (levée de doute), secours GSM, lecteur d'accès |
| Vidéo | caméra, caméra 4 vues, enregistreur NVR (4, 8, 16 ou 32 voies), écran de contrôle, switch PoE |
| Officine | PC, PC portable, écran, scanner, TPE, TPE sans fil, LSV, KAP, TMJ, TMH, imprimante, multifonction, serveur, sauvegarde RDX, onduleur, PDA / terminal mobile, pistolet scanner |

- Les éléments « Cat6 » (bornes, prises, caméras, postes, bases DECT, adaptateur fax, box 4G, PC, PC portable, imprimante, multifonction, serveur) sont reliés à la **baie**.
  Ils comptent dans les ports du switch, le PoE (si renseigné) et les tourets.
- Les éléments d'alarme sont reliés à la **centrale** par un câble d'alarme, tracé en pointillés magenta et compté à part
  (pas de limite de 90 m). Les coudes, le tracé automatique et la gaine montante fonctionnent comme pour le Cat6.
- Les autres éléments (routeur, NVR, écran, switch PoE, combinés, GSM) n'ont pas de câble tracé : ils apparaissent dans
  « Matériel placé », dans le rapport PDF et dans l'export « Matériel (.csv) ».
- **NVR** : le nombre de voies se règle sur l'élément (4, 8, 16 ou 32). L'appli compte les voies à connecter (1 par caméra, 4 par
  caméra 4 vues, réglable), alerte si le NVR est trop petit et propose la taille adaptée (« Adapter »). La nomenclature et le
  chiffrage distinguent chaque taille de NVR.
- Chiffrage : les prix des éléments du catalogue apparaissent dès qu'un élément du type est placé ; une ligne n'entre dans
  l'estimation que si un prix est saisi.
- Consommations PoE par défaut (modifiables par élément) : borne 15 W, caméra 6,5 W, caméra 4 vues 12 W, poste IP 4 W,
  base DECT 3 W. Les trois dernières sont des estimations à vérifier sur la fiche du matériel retenu.

## Développement (Linux)
```bash
npm install
npm start          # lance l'app (depuis le terminal de Claude Code : env -u ELECTRON_RUN_AS_NODE npm start)
npm run dist:win   # construit l'installateur Windows (via Docker electronuserland/builder:wine)
npm run dist:linux # construit l'AppImage et le .deb
npm run icon       # régénère build/icon.png depuis build/icon.svg
```
Pour une nouvelle version : changer `version` dans `package.json`, puis `npm run dist:win`.

## Signature du programme (Windows)

Un programme signé n'est plus bloqué par SmartScreen et inspire confiance à l'antivirus.
Il faut un **certificat de signature de code** (Authenticode) au nom de l'éditeur :
- entreprise de l'UE : **Azure Artifact Signing** (abonnement mensuel, le moins cher) ;
- particulier ou entreprise : certificat **OV** d'une autorité (ex. Certum, version carte ou cloud SimplySign).

La compilation signe tout seule (application, installateur, désinstallateur) dès que les
variables ci-dessous sont définies ; sinon elle produit des fichiers non signés.
Si la signature est demandée et échoue, la compilation s'arrête.

```bash
# Certificat en fichier .pfx (à garder HORS du dossier du projet)
ATELIER_SIGN=pfx ATELIER_PFX=~/certs/atelier.pfx ATELIER_PFX_PASSWORD='…' npm run dist:win

# Azure Artifact Signing
ATELIER_SIGN=azure ATELIER_AZURE_ENDPOINT=weu.codesigning.azure.net \
ATELIER_AZURE_ACCOUNT=<compte> ATELIER_AZURE_PROFILE=<profil> \
ATELIER_AZURE_TOKEN="$(az account get-access-token --resource https://codesigning.azure.net --query accessToken -o tsv)" \
npm run dist:win

# Carte / jeton matériel ou autre cas : options jsign directes
ATELIER_SIGN=jsign ATELIER_JSIGN_ARGS='--storetype PKCS11 --keystore <config> --storepass <PIN> --alias <alias>' npm run dist:win
```

À la fin, chaque `.exe` est contrôlé : signataire, horodatage, reconnaissance par les autorités publiques.
Outils : `scripts/sign.js` (jsign) et `build/signing.Dockerfile` (image de compilation).
`TARGETS=zip npm run dist:win` ne produit que le zip portable.
