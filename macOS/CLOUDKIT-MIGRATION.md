# Migration SwiftData / CloudKit — contrat préparatoire

## État actuel vérifié

- La source de vérité macOS est un snapshot JSON local versionné (`schemaVersion = 3`).
- Le catalogue embarqué conserve les identifiants historiques de `data.js` et ajoute le niveau C Informatique (145 chapitres).
- La PWA et le wrapper iPhone conservent leurs données dans `localStorage`; aucune lecture, écriture ou suppression mobile n'est effectuée par l'application Mac.
- CloudKit est volontairement désactivé : aucun conteneur, entitlement ou schéma distant n'est créé par ce dépôt.

## Frontière de migration

Le futur adaptateur SwiftData doit représenter les mêmes identités stables :

- `StudyChapter.id` pour la progression;
- `StudySession.id` pour les séances et leurs activités;
- `WeekPlan.id` (`A` ou `B`) et `PlanningDay.id` pour les modèles;
- `StudyActivity.id` pour l'historique dédupliqué.

Le catalogue reste une ressource en lecture seule. SwiftData ne stocke que les champs utilisateur, puis les fusionne avec les définitions du catalogue au chargement. Cette séparation permet de mettre à jour le programme sans écraser la progression.

## Procédure d'activation, volontairement non exécutée

1. Exporter la PWA depuis son interface et conserver le fichier original inchangé.
2. Exécuter un import en mode simulation et produire un rapport : IDs connus/inconnus, statuts, maîtrise, dates, activités, minutes et planning.
3. Vérifier un second import identique (zéro création ou mutation supplémentaire).
4. Créer le schéma SwiftData local et comparer le snapshot JSON avant/après.
5. Ajouter un conteneur iCloud de développement et les entitlements aux cibles Mac et iPhone.
6. Tester deux appareils avec un compte de test, conflits, mode hors ligne et suppression.
7. Activer CloudKit pour les données réelles seulement après validation explicite et sauvegarde exportée.

## Garde-fous requis

- jamais de remplacement silencieux d'un JSON illisible;
- jamais de mapping approximatif d'un identifiant inconnu;
- import transactionnel et relançable;
- journal de migration avant/après;
- aucune suppression de `localStorage` par l'import;
- CloudKit reste une destination secondaire jusqu'à égalité métier vérifiée.
