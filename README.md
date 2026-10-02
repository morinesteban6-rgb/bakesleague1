# BakesLeague

Appli web (installable sur téléphone) façon **Shift** pour gérer ses items et titres **Rocket League**.

- **Catalogue** : les 7 441 items du jeu (voitures, stickers, roues, boosts, chapeaux, antennes, explosions de but, traînées, bannières, bordures…), avec recherche et filtres (type, rareté, échangeable, peignable, possédés, wishlist).
- **Inventaire** : ajoute des items avec peinture (Titanium White, Black, Crimson…), certification et quantité, ou appuie sur **« Débloquer tous les items »**.
- **Titres** : les 725 titres du jeu avec leur couleur et leur lueur (Grand Champion, Supersonic Legend, RLCS, tournois…). Débloque-les un par un ou appuie sur **« Débloquer tous les titres »**, puis équipe celui que tu veux.
- **Garage** : carte joueur avec pseudo + titre équipé, aperçu de la voiture et loadout complet.
- **Échange** : construis une offre `[H]` / `[W]` et copie-la.
- **Sauvegarde** : tout est gardé dans le navigateur, avec export / import JSON.

> Le « déblocage » ne concerne que cette appli : il ne modifie pas ton compte Rocket League.
> Appli non officielle, sans lien avec Psyonix ni Epic Games.

## Lancer l'appli

Aucune installation. Ouvre `index.html` dans un navigateur, ou lance un petit serveur :

```sh
python3 -m http.server 8000
# puis ouvre http://localhost:8000
```

Avec un serveur (ou GitHub Pages), l'appli peut être **installée** sur l'écran d'accueil et marche hors ligne.

## Mettre à jour la liste des items et titres

Les données viennent de [rocketleagueapi/items](https://github.com/rocketleagueapi/items) (LGPL-3.0, extraites des fichiers du jeu ; copie dans `vendor/rocketleagueapi-items/`, commit `cd8fb35`, octobre 2024).
Pour mettre à jour : remplace ce dossier par le `src/parsed` le plus récent du dépôt, puis :

```sh
python3 scripts/build-data.py
```

Cela régénère `data/rl-data.js`.
