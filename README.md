# Math Study Planner

> **Statut actuel : application macOS locale V0.11 + PWA historique.** La version Mac est utilisable pour planifier, chronométrer le travail réel, suivre les chapitres et consulter l’activité. La synchronisation iPhone–Mac n’est pas encore activée : la PWA conserve séparément ses données dans Safari.

Prototype local de calendrier mobile pour trois domaines independants :

- Maths Sup : L1 -> L2 -> L3
- Proba : programme probabilites/statistiques
- Informatique : programme informatique

L'app suit automatiquement un cycle Semaine A / Semaine B selon le vrai calendrier et place les cours directement dans le calendrier hebdomadaire. Les jours de la semaine se consultent dans un calendrier horizontal, et la semaine peut etre changee avec les fleches ou par swipe hors de la zone des jours.

Dans `Programmation > Horaires`, chaque jour garde ses horaires de cours pour la matiere attribuee, puis une zone `Sport du jour` permet d'ajouter des horaires de sport independants de la matiere et de la progression des chapitres.

Chaque domaine avance lineairement : tous les creneaux d'un domaine pointent vers le meme chapitre courant tant que ce chapitre n'est pas marque `Fait`.

L'onglet `Progres` affiche une vue simple avec le resume de la semaine, l'action suivante, la tendance sur 30 jours, la regularite et la file `A revoir` quand elle existe. Les analyses secondaires comme la repartition par domaine, le rythme, le fil recent et le graphique sont repliees dans `Details`. Les blocs deja debloques restent modifiables, ce qui permet de revenir en arriere sur un chapitre marque `Fait`.

Quand un chapitre deja valide est repasse en cours ou a revoir puis marque `Fait` a nouveau, l'app demande si la date du graphique doit etre remplacee par la nouvelle date.

Dans le calendrier, le panneau du chapitre courant permet aussi de marquer la seance selectionnee comme travaillee. Cette activite alimente la regularite et le temps travaille sans obliger a terminer un chapitre.

Dans le calendrier, le panneau du bas permet aussi de choisir directement le domaine courant sans devoir appuyer sur une case du planning.

L'interface utilise un theme sombre par defaut.

Chaque chapitre peut recevoir un niveau de maitrise independant de son statut : Non evalue, Lu, Compris, Exercices ou Maitrise (0 a 4), visible dans la liste de chapitres.

La file `A revoir` suit aussi la derniere revision, les echeances derivees de la maitrise, les retards et les revisions notees avec le bouton `Revu`.

Le tableau de bord compare aussi les 30 derniers jours aux 30 jours precedents pour les chapitres finis, le temps travaille et les jours actifs.

Le tableau de bord repartit l'effort recent par domaine sur 14 jours, avec seances, temps travaille et chapitres finis.

Le tableau de bord affiche aussi un fil recent compact des dernieres actions notees.

Le tableau de bord `Progres` affiche maintenant des priorites calculees pour guider les prochaines actions utiles.

La regularite affiche aussi une serie actuelle, une meilleure serie, les jours actifs et la derniere action sur la fenetre de 21 jours.

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

## Application native macOS

L’application Mac native se trouve dans `macOS/`. Elle utilise SwiftUI pour l’interface et un `AppStore` pour isoler la persistance. La version locale V0.11 embarque les 145 chapitres de `data.js`, ouvre sur un tableau « Aujourd’hui », génère les semaines A/B, permet de gérer et chronométrer les séances, édite le modèle de programme et calcule les statistiques depuis les minutes réellement travaillées. Le premier adaptateur stocke un JSON versionné dans Application Support.

La V0.7 agrandit la typographie et les contrôles des cinq écrans, rend les lignes et cartes interactives cliquables sur toute leur surface et donne au Sport une identité rouge cohérente dans Aujourd’hui, Calendrier et Programme.

La V0.8 réaligne le catalogue sur les pages Notion actuelles : six blocs L1, cinq blocs L2, trois blocs L3, cinq blocs Probabilités–Statistiques et six chapitres Informatique. Les 145 identifiants de chapitre conservent les identifiants historiques et ajoutent le niveau C. `macOS/scripts/generate-programme-catalog.mjs` régénère désormais le catalogue natif à partir de `data.js` pour empêcher une nouvelle divergence.

La V0.9 applique immédiatement toute modification d’un modèle A/B aux semaines correspondantes déjà ouvertes dans le Calendrier. Les séances générées non travaillées sont remises en cohérence, tandis que les séances manuelles et les séances déjà travaillées sont conservées. Le bouton du Calendrier devient une réparation exceptionnelle et n’est plus nécessaire pour les changements ordinaires.

La V0.9.1 remplace l’horaire Sport figé par un éditeur complet : début et fin sont choisis ensemble, les plages libres du jour sont affichées et l’enregistrement reste désactivé en cas de chevauchement. Un cours peut par exemple finir à 19 h 30 et être suivi immédiatement d’un sport de 19 h 30 à 20 h 30.

La V0.9.2 ajoute le redimensionnement direct dans le Calendrier : les poignées supérieure et inférieure d’une séance se glissent à la souris par pas de 15 minutes. L’aperçu suit le pointeur, un conflit apparaît en orange et un horaire qui chevauche une autre séance n’est pas enregistré.

La V0.9.3 stabilise ce geste afin que le bloc suive continûment la souris sans trembler lorsque sa hauteur ou sa position change pendant le redimensionnement.

La V0.10 ajoute un horizon roulant de trois semaines partagé par Aujourd’hui, la barre de menus et les rappels. L’élément de barre de menus affiche le cours en cours ou le prochain cours et ouvre son résumé. Les notifications locales sont optionnelles, configurables à 5, 15, 30 ou 60 minutes, et leur autorisation n’est demandée qu’après activation explicite.

La V0.11 ajoute le mode séance : démarrage quinze minutes avant le cours depuis Aujourd’hui ou la barre de menus, minuteur persistant, pause/reprise, récupération après relance, bilan avec durée ajustable et note, puis statistiques fondées sur le temps actif réel. Une seule séance peut être active à la fois.

La V0.11.2 aligne le Calendrier macOS sur la règle mobile : un créneau terminé reste consultable mais son contenu, ses horaires et sa suppression sont verrouillés. Pendant une séance en cours, seule l’heure de fin peut encore être ajustée. Les modifications de Programme préservent également les occurrences déjà commencées.

Sources actuelles : [L1](https://app.notion.com/p/2ef811750021803dbe63f120bca7d103), [L2](https://app.notion.com/p/2f0811750021805d9604d7a5ff45b48e), [L3](https://app.notion.com/p/2f081175002180d3a653f82a8bfe97b1), [Probabilités–Statistiques](https://app.notion.com/p/2f081175002180ffa63edbf111bebd68) et [Informatique](https://app.notion.com/p/2ec8117500218030b709fa683fdd72ac), avec le [Projet Backend](https://app.notion.com/p/30081175002180209e39dfaf4915e58f).

Depuis le dossier `macOS/` :

```bash
swift run MathStudyPlanner --self-test
./scripts/package-app.sh
```

Le second script produit `macOS/build/Math Study Planner.app` et une archive signée `macOS/build/Math Study Planner.zip`. Le paquet Swift peut aussi etre ouvert directement dans Xcode via `macOS/Package.swift` lorsque Xcode est installe.

La PWA mobile et l’application macOS utilisent désormais le catalogue Informatique synchronisé avec Notion. Le wrapper iOS historique reste inchangé : l’usage mobile recommandé est la PWA installée depuis Safari. La procédure préparatoire SwiftData/CloudKit est décrite dans `macOS/CLOUDKIT-MIGRATION.md`; l'import du `localStorage` et l'activation iCloud restent des étapes distinctes, simulées puis validées avant toute donnée réelle.

### État fonctionnel de la V0.11 locale

- Fonctionnel : accueil Aujourd’hui, mode séance chronométré, prochain cours dans la barre de menus, notifications locales optionnelles, catalogue complet (5 cursus, 25 blocs, 145 chapitres, dont Informatique en 6 chapitres), progression linéaire, statut, maîtrise, révision, calendrier 07 h–24 h, création/modification/suppression de séances, modèle A/B de 0 à 4 cours par jour avec sport, statistiques 14/21/30 jours et sauvegarde JSON transactionnelle.
- Sécurisé : suppression et édition réconcilient les activités, les créneaux ne peuvent ni chevaucher minuit ni se superposer, une date de complétion reste historique, les identifiants dupliqués sont mis en quarantaine et une écriture disque ratée restaure l’état en mémoire.
- Vérifié : compilation Swift arm64, 31 contrôles métier, verrou temporel du Calendrier, minuteur avec pause exclue, restauration de séance active, unicité et rollback, horizon roulant, sélection du cours en excluant Sport, planification déterministe des rappels, redimensionnement direct des séances futures, choix libre des horaires Sport, conformité des quatre sources Notion, conservation d’une progression sur un chapitre déplacé, round-trip JSON schéma 5, propagation automatique du Programme sans réécrire le passé, restauration transactionnelle en cas d’échec, régénération explicite d’une semaine, quarantaine d’un JSON illisible ou dupliqué et signature du paquet.
- Non activé : import réel du `localStorage`, SwiftData/CloudKit et synchronisation iPhone–Mac. Ces étapes ne toucheront pas les données mobiles sans export, simulation et validation explicites.
