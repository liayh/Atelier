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

## Développement (Linux)
```bash
npm install
npm start          # lance l'app (depuis le terminal de Claude Code : env -u ELECTRON_RUN_AS_NODE npm start)
npm run dist:win   # construit l'installateur Windows (via Docker electronuserland/builder:wine)
npm run icon       # régénère build/icon.png depuis build/icon.svg
```
Pour une nouvelle version : changer `version` dans `package.json`, puis `npm run dist:win`.
