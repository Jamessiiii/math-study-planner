# Math Study Planner

Prototype local de calendrier mobile pour trois domaines independants :

- Maths Sup : L1 -> L2 -> L3
- Proba : programme probabilites/statistiques
- Informatique : programme informatique

L'app suit automatiquement un cycle Semaine A / Semaine B selon le vrai calendrier et place les cours directement dans le calendrier hebdomadaire.

Chaque domaine avance lineairement : tous les creneaux d'un domaine pointent vers le meme chapitre courant tant que ce chapitre n'est pas marque `Fait`.

Principe de simplicite : seul le bloc courant d'un domaine est visible. Par exemple, dans Maths Sup, les blocs L1 suivants restent masques tant que le Bloc 0 n'est pas termine.

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

Note : avec GitHub Free, GitHub Pages est disponible pour les depots publics. Sur le depot prive `Jamessiiii/math-study-planner`, GitHub a refuse l'activation de Pages avec le plan actuel.

## Donnees

Les donnees sont stockees dans `data.js`.
La progression est sauvegardee dans le navigateur avec `localStorage`.
Le support PWA est fourni par `manifest.json`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png` et `apple-touch-icon.png`.
