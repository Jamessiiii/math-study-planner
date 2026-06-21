# Math Study Planner

Prototype local de planning mobile pour trois domaines independants :

- Maths Sup : L1 -> L2 -> L3
- Proba : programme probabilites/statistiques
- Informatique : programme informatique

L'app suit un cycle Semaine A / Semaine B et choisit les prochaines notions dans le domaine prevu par le planning.

## Lancer

Depuis ce dossier :

```bash
python3 -m http.server 5178
```

Puis ouvrir :

```text
http://localhost:5178
```

## Tester sur iPhone

Pour un test local, l'iPhone doit etre sur le meme reseau Wi-Fi que le Mac.

Depuis Safari sur iPhone, ouvrir l'adresse reseau du Mac, par exemple :

```text
http://ADRESSE-IP-DU-MAC:5178
```

Puis utiliser le menu de partage Safari et choisir `Ajouter a l'ecran d'accueil`.

Pour une installation plus fiable, publier le dossier avec GitHub Pages. L'URL `https://...github.io/...` permet au service worker de fonctionner en contexte securise, ce qui est preferable pour une PWA iPhone.

## Publier avec GitHub Pages

Le projet est un site statique. Une fois pousse dans un depot GitHub :

1. Ouvrir `Settings > Pages`.
2. Choisir `Deploy from a branch`.
3. Selectionner la branche `main` et le dossier racine `/`.
4. Ouvrir l'URL GitHub Pages depuis Safari iPhone.
5. Utiliser `Ajouter a l'ecran d'accueil`.

## Donnees

Les donnees sont stockees dans `data.js`.
La progression est sauvegardee dans le navigateur avec `localStorage`.
Le support PWA est fourni par `manifest.json`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png` et `apple-touch-icon.png`.
