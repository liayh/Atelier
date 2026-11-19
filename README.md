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

## Caméras : modèles Dahua et zones DORI

Dans le panneau d'une caméra, choisir le **modèle** (catalogue `CAMS` dans `Atelier_implantation.html`),
l'**objectif** (ou la focale d'une varifocale), la **direction**, la **hauteur de pose** et l'**inclinaison**.
Le plan affiche alors les zones **DORI** (norme EN 62676-4) : identifier, reconnaître, observer (bandes),
détecter (arc), la portée **infrarouge** de nuit et la **zone morte** au pied de la caméra.
La consommation PoE vient du modèle ; la liste du matériel et le rapport PDF (page « Caméras »)
reprennent les références. Les anciennes caméras restent en mode « générique » (réglage manuel).

Données reprises des fiches techniques Dahua ; à compléter ou corriger dans `CAMS` (une ligne par modèle).
« Dahua HDW1330E » : pas de fiche publique sous ce nom ; valeurs de la gamme HDW1330 (fiche officielle IPC-HDW1330T1-S4), à confirmer.

## Bornes WiFi et DECT : modèles et couverture

Dans le panneau d'une borne, choisir le **modèle** (catalogues `APS` et `DECTS`) et, pour le WiFi, la
**puissance d'émission**. Le type de local se règle par plan (« Ce plan » → Type de local) :
espace ouvert, officine / bureaux, nombreuses cloisons, béton. Case « Couvertures WiFi / DECT » pour masquer.

- **WiFi** (gamme TP-Link Omada Wi-Fi 6 par défaut : EAP610, EAP620 HD, EAP653, EAP650, EAP660 HD, EAP670 ; Ubiquiti UniFi en option) : rayon estimé par un modèle de propagation intérieure (plafond réglementaire européen :
  PIRE 20 dBm en 2,4 GHz, 23 dBm en 5 / 6 GHz ; marge client 5 dB). Cercle plein : 5 GHz excellent
  (≥ −67 dBm, voix et visio) ; pointillés : 5 GHz correct (≥ −75 dBm) et 2,4 GHz excellent.
  La portée dépend du local bien plus que du modèle ; le modèle donne norme, bandes, PoE et référence.
- **DECT** (Yealink W70B / W80B / W90B) : portée sûre (cloisons) et maximale (dégagé) des fiches Yealink ;
  contrôle du nombre de combinés et alerte si plusieurs bases mono-cellule (pas de passage entre bases).
- Rapport PDF : page « Bornes WiFi et DECT ». Estimations sans les murs : à confirmer par une mesure sur site.

## Switchs (TP-Link Omada)

Un seul élément **Switch** (onglet Réseau), à poser dans la baie, avec choix du modèle (catalogue `SWS`) :
SG2210MP (8 PoE+, 150 W), SG2218P (16 PoE+, 150 W), SG2428P (24 PoE+, 250 W, par défaut),
SG3428MP (24 PoE+, 384 W), SG3452P (48 PoE+, 384 W), SG3452 (48 ports sans PoE), ou générique (ports et budget saisis).
Dès qu'un switch est posé, les **ports disponibles** et le **budget PoE** du bilan sont la somme des switchs posés
(champs verrouillés) ; sans switch posé, la saisie manuelle du bilan s'applique. Alertes si ports ou PoE insuffisants.
Un prix par modèle dans le chiffrage. Anciens projets : « Switch 52 ports » → SG3452, « Switch PoE » 16 ports → SG2218P.

## Sécurité

Un fichier `.atelier` peut venir de n'importe où ; il est traité comme non fiable.
- **Chargement sûr** (`norm()` dans `Atelier_implantation.html`) : seuls les champs connus sont gardés, avec
  le bon type ; nombres bornés, identifiants `[A-Za-z0-9_-]`, modèles pris dans les catalogues, image du plan
  limitée à une vraie image encodée. S'applique aux fichiers ouverts, au double-clic et à la sauvegarde automatique.
- **CSP** : seul le script du logiciel (empreinte SHA-256) s'exécute ; ni code injecté, ni `eval`.
  - Version de bureau (posée par `scripts/sync-web.js`) : aucune connexion vers l'extérieur.
  - Version navigateur (dans `Atelier_implantation.html`) : seuls jsDelivr (pdf.js) et Google Fonts sont autorisés.
    **L'empreinte change à chaque modification du script : lancer `npm run csp`** (ou `npm run sync`, qui le fait aussi),
    sinon la version navigateur ne démarre plus. `node scripts/csp.js --check` vérifie sans modifier.
  - Page du rapport PDF : aucun script, aucune ressource externe.
- **Processus principal** (`src/main.js`) : demandes acceptées uniquement de la page du logiciel ; écriture
  directe seulement dans un fichier choisi ou ouvert par l'utilisateur (liste tenue côté système).
- **Electron** : isolation, bac à sable, pas de Node dans la page, navigation et fenêtres bloquées,
  permissions limitées ; exécutable verrouillé (« fuses » : pas de RunAsNode, pas de NODE_OPTIONS ni
  d'inspecteur, intégrité de l'archive vérifiée au démarrage).
- **Exports CSV** : formules neutralisées (cellules commençant par = + - @).
- **pdf.js 6.5.438** (modules ES) : n'utilise plus eval (faille CVE-2024-4367 de la 3.x éliminée). Même version
  côté navigateur (`PDFJS` dans le HTML, jsDelivr) et bureau (copie locale `vendor/pdfjs/`, vérifiée par `sync-web.js`).

## Signature du programme (Windows)

Un programme signé n'est plus bloqué par SmartScreen et inspire confiance à l'antivirus.
Il faut un **certificat de signature de code** (Authenticode) au nom de l'éditeur :
- entreprise de l'UE : **Azure Artifact Signing** (abonnement mensuel, le moins cher) ;
- particulier ou entreprise : certificat **OV** d'une autorité (ex. Certum, version carte ou cloud SimplySign).

La compilation signe tout seule (application, installateur, désinstallateur) dès que les
variables ci-dessous sont définies ; sinon elle produit des fichiers non signés.
Si la signature est demandée et échoue, la compilation s'arrête.

### BLL : Azure Artifact Signing (méthode retenue)
Préparation unique dans le portail Azure (compte M365 de BLL) :
1. Abonnement → Fournisseurs de ressources → inscrire `Microsoft.CodeSigning`.
2. Créer un compte « Artifact Signing » (région West Europe, offre Basic).
3. IAM du compte → rôle **Artifact Signing Identity Verifier** pour soi.
4. Identity validations → New → **Public** : identité légale de BLL (SIREN…), attendre la validation.
5. Certificate profiles → Create → **Public Trust** (ex. `atelier`).
6. Microsoft Entra ID → Inscriptions d'applications → `atelier-signature` → secret client.
7. IAM du compte → rôle **Artifact Signing Certificate Profile Signer** pour `atelier-signature`.

Plus simple : coller dans **Cloud Shell** (shell.azure.com, Bash) le script `scripts/azure-setup.sh`
(`curl -sL https://raw.githubusercontent.com/liayh/Atelier/<branche>/scripts/azure-setup.sh | bash`) : il essaie
les régions européennes (West Europe est fermée aux nouveaux clients ; compte BLL créé en **North Europe**,
point d'accès `neu.codesigning.azure.net`). Sans droit de créer un compte robot dans l'annuaire, il donne le
droit de signer à l'utilisateur : **mode « jeton personnel »**, le jeton (environ 1 h) étant obtenu dans Cloud Shell
au moment de compiler :
`az account get-access-token --resource https://codesigning.azure.net --query accessToken -o tsv`

Puis, sur le poste de compilation :
```bash
npm run sign:setup        # saisie des identifiants (fichier privé ~/.config/atelier-signature, droits 600)
npm run sign:check        # test complet : connexion, droits, signature d'un .exe de test
npm run dist:win:signed   # installateur + zip portable signés au nom de BLL
```

### Autres certificats
```bash
# Certificat en fichier .pfx (à garder HORS du dossier du projet)
ATELIER_SIGN=pfx ATELIER_PFX=~/certs/atelier.pfx ATELIER_PFX_PASSWORD='…' npm run dist:win

# Carte / jeton matériel ou autre cas : options jsign directes
ATELIER_SIGN=jsign ATELIER_JSIGN_ARGS='--storetype PKCS11 --keystore <config> --storepass <PIN> --alias <alias>' npm run dist:win
```

À la fin, chaque `.exe` est contrôlé : signataire et horodatage (la chaîne de confiance Microsoft se vérifie sous Windows).
Outils : `scripts/sign.js` (jsign) et `build/signing.Dockerfile` (image de compilation).
`TARGETS=zip npm run dist:win` ne produit que le zip portable.
