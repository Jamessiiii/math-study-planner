const phases = {
  l1: "Phase 1 - Licence 1 : fondations",
  l2: "Phase 2 - Licence 2 : outils structurants",
  l3: "Phase 3 - Licence 3 : specialisation IA",
  proba: "Phase 4 - Probabilites, statistiques et ML",
};

function item(id, title, summary, resources, hours = 4, priority = 3) {
  item.seq = (item.seq || 0) + 1;
  return { id, title, summary, resources, hours, priority, sequence: item.seq };
}

window.STUDY_PROGRAM = [
  {
    id: "l1",
    title: "L1 Mathematiques",
    phase: phases.l1,
    blocks: [
      {
        title: "Bloc 0 - Outils fondamentaux et raisonnement",
        items: [
          item("l1-01", "Logique et raisonnement", "Connecteurs, quantificateurs, preuve par contraposée, absurde et recurrence.", ["Algebre et Geometrie L1, chapitre 1", "Algebre et Analyse L1, chapitre 1"], 5, 1),
          item("l1-02", "Ensembles et applications", "Union, intersection, complementaire, injection, surjection, bijection.", ["Algebre et Geometrie L1, chapitre 1", "Algebre et Analyse L1, chapitre 2"], 5, 1),
          item("l1-03", "Techniques en analyse", "Inegalites et techniques de base en analyse.", ["Techniques en analyse 1 - Inegalites"], 4, 1),
          item("l1-03b", "Trigonometrie", "Formules et manipulations trigonometriques de premiere annee.", ["Toutes les mathematiques premiere annee de MPSI, chapitres 1 et 2"], 4, 1),
          item("l1-03c", "Calcul algebrique", "Sommes, produits et manipulations algebriques fondamentales.", ["Calcul algebrique 1 - Sommes et produits"], 4, 1),
          item("l1-04", "Le corps des reels", "Borne superieure, intervalles, ordre et topologie de la droite reelle.", ["Analyse et probabilite L1, chapitre 1", "Algebre et Geometrie L1, chapitre 2", "Algebre et Analyse L1, chapitre 3"], 6, 1),
        ],
      },
      {
        title: "Bloc 1 - Structures algebriques",
        items: [
          item("l1-05", "Arithmetique des entiers", "Division euclidienne, PGCD, Bezout, nombres premiers.", ["Algebre et Geometrie L1, chapitre 6"], 5, 2),
          item("l1-06", "Groupes, anneaux, corps", "Definitions et premiers exemples de structures algebriques.", ["livre2_algebre_II2_groupes_anneaux_corps_signets_specialises.pdf", "Algebre et Geometrie L1, chapitre 7"], 8, 2),
          item("l1-07", "Nombres complexes", "Formes algebrique, trigonometrique, exponentielle et applications.", ["Algebre et Geometrie L1, chapitre 3", "Algebre et Analyse L1, chapitre 4"], 5, 2),
          item("l1-08", "Geometrie elementaire", "Vecteurs, droites, plans, produit scalaire et produit vectoriel.", ["Algebre et Geometrie L1, chapitres 4 et 5"], 5, 2),
          item("l1-09", "Polynomes et fractions rationnelles", "Anneau K[X], division euclidienne, racines, decomposition en elements simples.", ["Algebre et Geometrie L1, chapitre 8", "Algebre et Analyse L1, chapitres 6 et 7"], 7, 2),
        ],
      },
      {
        title: "Bloc 2 - Analyse : fondements",
        items: [
          item("l1-10", "Suites numeriques", "Convergence, monotonie, suites adjacentes et recurrentes.", ["Analyse et probabilite L1, chapitres 5 et 10", "Algebre et Analyse L1, chapitre 5"], 6, 2),
          item("l1-11", "Series numeriques", "Definition et convergence des series numeriques.", ["Playlist Francois Giraud - Fanny Laignel", "Tout ce qu'il faut savoir MPSI/MP2I"], 6, 2),
          item("l1-12", "Continuite", "Limites, continuite, proprietes globales des fonctions continues.", ["Analyse et probabilite L1, chapitre 7", "Algebre et Analyse L1, chapitre 13"], 6, 2),
          item("l1-13", "Fonctions usuelles", "Logarithmes, exponentielles, trigonometrie et fonctions reciproques.", ["Analyse et probabilite L1, chapitres 2 et 3", "Algebre et Analyse L1, chapitre 14"], 5, 2),
          item("l1-14", "Comparaison locale de fonctions", "Equivalents, negligeabilite et developpements locaux simples.", ["Analyse et probabilite L1, chapitre 6", "Algebre et Analyse L1, chapitre 15"], 5, 2),
          item("l1-15", "Derivabilite", "Nombre derive, theoreme de Rolle et accroissements finis.", ["Analyse et probabilite L1, chapitre 8", "Algebre et Analyse L1, chapitre 16"], 6, 2),
        ],
      },
      {
        title: "Bloc 3 - Algebre lineaire",
        items: [
          item("l1-16", "Espaces vectoriels", "Sous-espaces, familles libres, generatrices, bases et dimension.", ["Algebre et Geometrie L1, chapitres 11 et 13", "Algebre et Analyse L1, chapitre 8"], 7, 1),
          item("l1-17", "Applications lineaires", "Noyau, image, rang, theorem du rang.", ["Algebre et Geometrie L1, chapitre 12", "Algebre et Analyse L1, chapitre 9"], 7, 1),
          item("l1-18", "Calcul matriciel", "Operations matricielles, produit, transposee et matrices inversibles.", ["Algebre et Geometrie L1, chapitres 10, 14 et 15", "Algebre et Analyse L1, chapitre 10"], 7, 1),
          item("l1-19", "Systemes lineaires", "Mise en equation et pivot de Gauss.", ["Algebre et Geometrie L1, chapitre 9", "Algebre et Analyse L1, chapitre 11"], 5, 1),
          item("l1-20", "Geometrie affine", "Bases de geometrie affine et sous-espaces affines.", ["Algebre 1re annee, Liret et Martinais"], 5, 3),
        ],
      },
      {
        title: "Bloc 4 - Analyse : outils avances",
        items: [
          item("l1-21", "Developpements limites", "Taylor, calcul de DL et applications asymptotiques.", ["Analyse et probabilite L1, chapitres 9 et 10", "Algebre et Analyse L1, chapitre 17"], 6, 2),
          item("l1-22", "Integration", "Riemann, primitives, IPP et changement de variable.", ["Analyse et probabilite L1, chapitre 11", "Algebre et Analyse L1, chapitres 18 et 19"], 7, 2),
          item("l1-23", "Equations differentielles", "Equations lineaires d'ordre 1 et 2 a coefficients constants.", ["Analyse et probabilite L1, chapitre 4", "Algebre et Analyse L1, chapitre 20"], 6, 2),
          item("l1-24", "Reduction des endomorphismes", "Valeurs propres, vecteurs propres et diagonalisation en transition L2.", ["Algebre et Analyse L1, chapitre 12"], 6, 2),
        ],
      },
    ],
  },
  {
    id: "l2",
    title: "L2 Mathematiques",
    phase: phases.l2,
    blocks: [
      {
        title: "Bloc 1 - Algebre lineaire fondamentale",
        items: [
          item("l2-01", "Structures algebriques", "Revisions groupes, anneaux et corps.", ["Toutes les maths en MP-MPI, chapitre 1"], 5, 2),
          item("l2-02", "Ordre, equivalence et Z/nZ", "Relations d'ordre, equivalence, quotients et arithmetique modulaire.", ["Algebre et Geometrie 2e annee, chapitre 1"], 5, 2),
          item("l2-03", "Actions de groupes", "Quotients, actions, orbites et stabilisateurs.", ["Algebre et Geometrie 2e annee, chapitre 2.5"], 6, 2),
          item("l2-04", "Complements d'algebre lineaire", "Sommes de sous-espaces, dualite, determinants et rang.", ["Algebre et Geometrie 2e annee, chapitre 2"], 7, 1),
          item("l2-05", "Diagonalisation et trigonalisation", "Valeurs propres, polynome caracteristique et reduction.", ["Algebre et Geometrie 2e annee, chapitre 3"], 7, 1),
          item("l2-06", "Structure d'un endomorphisme", "Hamilton-Cayley, polynome minimal et matrices semblables.", ["Algebre et Geometrie 2e annee, chapitre 4"], 7, 1),
          item("l2-07", "Familles sommables", "Familles indexees, rearrangements et series associees.", ["Toutes les maths en MP-MPI, chapitre 13"], 5, 3),
        ],
      },
      {
        title: "Bloc 2 - Series et fonctions complexes",
        items: [
          item("l2-08", "Series numeriques L2", "Operations, convergence, series a termes positifs.", ["Analyse 2e annee, chapitres 1 et 2", "Analyse et algebre, chapitre 1"], 6, 2),
          item("l2-09", "Suites et series de fonctions", "Convergence simple, uniforme et normale.", ["Analyse 2e annee, chapitre 3", "Analyse et algebre, chapitres 2 et 3"], 7, 1),
          item("l2-10", "Fonctions complexes", "Topologie de C, holomorphie et premiers outils.", ["Analyse et algebre, chapitre 4"], 6, 2),
          item("l2-11", "Series entieres", "Rayon de convergence et developpements en series entieres.", ["Analyse et probabilite L2, chapitre 3", "Analyse et algebre, chapitre 5"], 6, 2),
          item("l2-12", "Series de Fourier", "Decomposition periodique et convergence.", ["Analyse et probabilite L2, chapitre 4", "Analyse et algebre, chapitre 6"], 7, 1),
        ],
      },
      {
        title: "Bloc 3 - Topologie, differentiel et bilineaire",
        items: [
          item("l2-13", "Espaces metriques et EVN", "Normes, distances, ouverts, fermes, compacite et completude.", ["Analyse 2e annee, chapitre 5", "Analyse et algebre, chapitre 7"], 8, 1),
          item("l2-14", "Formes lineaires et multilineaires", "Formes lineaires, multilineaires et determinants.", ["Analyse et algebre, chapitres 3 et 4"], 5, 2),
          item("l2-15", "Algebre bilineaire", "Formes bilineaires, quadratiques, orthogonalite et isometries.", ["Algebre et Geometrie 2e annee, chapitres 6, 7 et 10", "Analyse et algebre, chapitre 8"], 8, 1),
          item("l2-16", "Espaces euclidiens", "Endomorphismes euclidiens, isometries et geometrie.", ["Algebre et Geometrie 2e annee, chapitres 6 et 7"], 6, 2),
          item("l2-17", "Espaces hermitiens", "Formes sesquilineaires et formes hermitiennes.", ["Algebre et Geometrie 2e annee, chapitres 10 et 11"], 6, 2),
          item("l2-18", "Espaces affines euclidiens", "Geometrie affine euclidienne.", ["Algebre et Geometrie 2e annee, chapitre 8"], 5, 3),
          item("l2-18b", "Geometrie plane", "Droites, cercles, angles, transformations et configurations usuelles de la geometrie plane euclidienne.", ["Algebre et Geometrie 2e annee, chapitre 9"], 6, 2),
          item("l2-19", "Convexite", "Ensembles convexes, fonctions convexes et inegalites.", ["Toutes les maths en MP-MPI, chapitre 10"], 6, 1),
          item("l2-20", "Fonctions de plusieurs variables", "Limite, continuite et continuite uniforme.", ["Analyse et probabilite L2, chapitre 7", "Analyse et algebre, chapitre 9"], 6, 1),
          item("l2-21", "Fonctions vectorielles", "Limites, continuite, derivabilite et geometrie.", ["Toutes les maths en MP-MPI, chapitre 18"], 5, 2),
          item("l2-22", "Calcul differentiel", "Differentiabilite, jacobienne, Taylor, extrema.", ["Analyse et probabilite L2, chapitre 7", "Analyse et algebre, chapitre 10"], 8, 1),
        ],
      },
      {
        title: "Bloc 4 - Integration, geometrie differentielle et EDO",
        items: [
          item("l2-23", "Courbes et surfaces", "Arcs, nappes parametrees, plan tangent, fonctions implicites.", ["Analyse et algebre, chapitre 11"], 6, 2),
          item("l2-24", "Integrales a parametre", "Continuite, derivation et integration sous le signe integral.", ["Toutes les maths en MP-MPI, chapitre 12"], 6, 1),
          item("l2-25", "Integrales multiples", "Fubini, integrales doubles/triples et changements de variables.", ["Analyse et probabilite L2, chapitre 5", "Analyse et algebre, chapitre 12"], 7, 1),
          item("l2-26", "Integration sur courbes et surfaces", "Formes differentielles, Stokes, integrales curvilignes et de surface.", ["Analyse et algebre, chapitre 13"], 7, 2),
          item("l2-27", "Equations differentielles L2", "Existence, unicite et etude qualitative.", ["Analyse 2e annee, chapitre 11", "Analyse et probabilite L2, chapitre 8"], 6, 2),
          item("l2-28", "Systemes differentiels lineaires", "Resolution via reduction des endomorphismes.", ["Algebre et Geometrie 2e annee, chapitre 5"], 6, 2),
        ],
      },
    ],
  },
  {
    id: "l3",
    title: "L3 Mathematiques",
    phase: phases.l3,
    blocks: [
      {
        title: "Analyse L3 - special IA",
        items: [
          item("l3-an-01", "Corps des reels", "Ordre, borne superieure, intervalles et base reelle necessaire a la topologie.", ["Topologie generale et espaces normes, chapitre 0", "Tres utile IA theorique"], 5, 2),
          item("l3-an-02", "Topologie, metrique, compacts et connexes", "Espaces topologiques, bases, ouverts/fermes, continuite, compacite, suites extraites et connexite.", ["Topologie generale et espaces normes, chapitres 1 a 4", "Tres utile IA theorique"], 12, 1),
          item("l3-an-03", "Espaces fonctionnels", "Stone-Weierstrass, Ascoli et approximation de fonctions continues.", ["Topologie generale et espaces normes, chapitre 5", "Tres utile IA theorique"], 8, 1),
          item("l3-an-04", "Espaces normes", "Espaces vectoriels normes, exemples, applications lineaires continues, parties denses et totales.", ["Topologie generale et espaces normes, chapitre 6", "Tres utile IA theorique"], 9, 1),
          item("l3-an-05", "Theoremes fondamentaux des espaces normes", "Banach-Steinhaus, application ouverte, dualite, Hahn-Banach, separation, semi-normes et adjoints.", ["Topologie generale et espaces normes, chapitre 7", "Tres utile IA theorique"], 10, 1),
          item("l3-an-06", "Espaces de Hilbert", "Produits scalaires, projection orthogonale, Riesz-Frechet, bases hilbertiennes, sommes et produit tensoriel.", ["Topologie generale et espaces normes, chapitre 8", "Noyau dur IA"], 10, 1),
          item("l3-an-07", "Integrale de Riemann", "Fonctions reglees et limites de l'integrale de Riemann comme transition vers Lebesgue.", ["Integration et applications, chapitre 1", "Tres utile IA theorique"], 5, 2),
          item("l3-an-08", "Tribus et mesures", "Tribus, sigma-algebres, boreliens, mesurabilite, mesures positives et mesure de Lebesgue.", ["Integration et applications, chapitre 2", "Tres utile IA theorique"], 9, 1),
          item("l3-an-09", "Construction de l'integrale de Lebesgue", "Fonctions etagees, fonctions mesurables positives, convergence monotone, Fatou et exemples.", ["Integration et applications, chapitre 3", "Tres utile IA theorique"], 10, 1),
          item("l3-an-10", "Convergence dominee et integrales a parametre", "Presque partout, ensembles negligeables, TCD, continuite et derivabilite sous le signe somme.", ["Integration et applications, chapitre 4", "Tres utile IA theorique"], 9, 1),
          item("l3-an-11", "Integration sur un espace produit", "Mesure produit, tribus engendrees, Fubini positif et reel/complexe, applications multiples.", ["Integration et applications, chapitre 5", "Tres utile IA theorique"], 8, 1),
          item("l3-an-12", "Espaces Lp", "Espaces L1 et Lp, completude, Holder, densite des fonctions etagees et continues.", ["Integration et applications, chapitre 6", "Tres utile IA theorique"], 9, 1),
          item("l3-an-13", "Changement de variable sur un ouvert de Rn", "Mesure de Lebesgue, invariance, changement de variable general et coordonnees polaires.", ["Integration et applications, chapitre 7", "Tres utile IA theorique"], 8, 1),
          item("l3-an-14", "Series de Fourier", "Series de Fourier dans L1 et L2, cadre hilbertien, orthogonalite et bases orthonormees.", ["Integration et applications, chapitre 8", "Tres utile IA theorique"], 8, 1),
          item("l3-an-15", "Analyse fonctionnelle", "Espaces de fonctions vus comme grands Rn, operateurs lineaires et structure fonctionnelle.", ["Cours d'analyse fonctionnelle avec 200 exercices corriges, Daniel Li"], 10, 2),
          item("l3-an-16", "Analyse complexe", "Holomorphie, outils complexes, convolutions, filtres et analyse frequentielle.", ["Analyse complexe pour la Licence 3, Patrice Tauvel", "El Amrani, Analyse complexe"], 9, 2),
          item("l3-an-17", "Calcul differentiel L3", "Gradient, Hessienne, conditions d'optimalite et algorithmes vus comme dynamiques continues.", ["El Amrani, Calcul differentiel"], 9, 1),
          item("l3-an-18", "EDO niveau 0", "Travail preparatoire sur les equations differentielles ordinaires et partielles.", ["Equations differentielles ordinaires et partielles"], 8, 2),
          item("l3-an-19", "Equations differentielles ordinaires", "EDO, systemes dynamiques et etude qualitative de niveau L3.", ["Des equations differentielles aux systemes dynamiques I", "Des equations differentielles aux systemes dynamiques II"], 10, 2),
          item("l3-an-20", "Equations aux derivees partielles", "Bases d'EDP, approximations et liens avec les modeles continus.", ["Equations aux derivees partielles et leurs approximations"], 10, 2),
        ],
      },
      {
        title: "Algebre L3 - IA et cryptographie",
        items: [
          item("l3-al-00", "Reduction des endomorphismes", "Polynome minimal, Jordan, Frobenius, Cayley-Hamilton, Perron-Frobenius.", ["Algebre lineaire - Reduction des endomorphismes"], 10, 1),
          item("l3-al-03", "Algebre bilineaire", "Formes bilineaires, quadratiques, hermitiennes, signature.", ["Szpirglas, chapitre 3, p.39-102"], 8, 1),
          item("l3-al-04", "Geometrie affine et convexite", "Barycentres, hyperplans, convexite, projection, fonctions convexes.", ["Szpirglas, chapitre 4, p.103-158"], 8, 1),
          item("l3-al-06", "Theorie des groupes", "Morphismes, quotients, actions, Burnside, Sylow.", ["Szpirglas, chapitre 6, p.217-292"], 10, 1),
          item("l3-al-07", "Groupes et algebre lineaire", "GLn, SLn, groupes orthogonaux/unitaires, decompositions.", ["Szpirglas, chapitre 7, p.293-384"], 9, 2),
          item("l3-al-09", "Anneaux", "Ideaux, quotients, localisation, noetherien, factoriel.", ["Szpirglas, chapitre 9, p.457-532"], 10, 1),
          item("l3-al-10", "Polynomes", "Irreductibilite, polynomes symetriques, resultants, cyclotomiques.", ["Szpirglas, chapitre 10, p.533-608"], 9, 1),
          item("l3-al-11", "Modules", "Modules, suites exactes, modules sur anneau principal, invariants.", ["Szpirglas, chapitre 11, p.609-708"], 10, 2),
          item("l3-al-12", "Corps", "Extensions, corps de rupture/decomposition, Galois.", ["Szpirglas, chapitre 12, p.711-758"], 8, 2),
          item("l3-al-13", "Corps finis", "Frobenius, F_pn, polynomes irreductibles, Wedderburn.", ["Szpirglas, chapitre 13, p.759-782"], 7, 1),
        ],
      },
      {
        title: "Mathematiques appliquees L3",
        items: [
          item("l3-ap-dem-01", "Calculs numeriques approches", "Erreurs d'arrondi, approximations machine, compensation, pertes de precision, instabilites numeriques et choix d'algorithmes robustes.", ["Demailly, Analyse numerique et equations differentielles, chapitre I, p.5-20", "Noyau dur IA"], 8, 1),
          item("l3-ap-dem-02", "Approximation polynomiale", "Interpolation de Lagrange, convergence, meilleure approximation uniforme, stabilite numerique, polynomes orthogonaux et approximation de fonctions.", ["Demailly, chapitre II, p.21-60", "Noyau dur IA"], 10, 1),
          item("l3-ap-dem-03", "Integration numerique", "Quadratures elementaires et composees, erreur, controle de precision, methodes de Gauss, Euler-Maclaurin, Romberg et extrapolation.", ["Demailly, chapitre III, p.61-100", "Tres utile IA theorique / modeles continus"], 8, 2),
          item("l3-ap-dem-04", "Methodes iteratives de resolution", "Points fixes, equations d'une variable, methodes de Newton, systemes dans R^m et theorem des fonctions implicites.", ["Demailly, chapitre IV, p.101-134", "Noyau dur IA"], 10, 1),
          item("l3-ap-dem-05", "Equations differentielles fondamentales", "Definitions, solutions maximales et globales, existence, unicite de Cauchy-Lipschitz et equations d'ordre superieur.", ["Demailly, chapitre V, p.135-168", "Tres utile IA theorique / modeles continus"], 8, 2),
          item("l3-ap-dem-06", "Resolution explicite des EDO", "Equations du premier ordre, equations non resolues en y', problemes geometriques et equations differentielles du second ordre.", ["Demailly, chapitre VI, p.169-212", "Tres utile IA theorique / modeles continus"], 8, 2),
          item("l3-ap-dem-07", "Systemes differentiels lineaires", "Generalites, systemes a coefficients constants, equations lineaires d'ordre p a coefficients constants et coefficients variables.", ["Demailly, chapitre VII, p.213-238", "Tres utile IA theorique / modeles continus"], 8, 2),
          item("l3-ap-dem-08", "Methodes numeriques a un pas", "Methodes a un pas, consistance, stabilite, convergence, Runge-Kutta et controle du pas pour solveurs d'EDO.", ["Demailly, chapitre VIII, p.239-272", "Noyau dur IA"], 10, 1),
          item("l3-ap-dem-09", "Methodes a pas multiples", "Pas constant, Adams-Bashforth, Adams-Moulton et prediction-correction.", ["Demailly, chapitre IX, p.273-304", "Tres utile IA theorique / modeles continus"], 8, 2),
          item("l3-ap-dem-10", "Stabilite et points singuliers", "Stabilite des solutions, points singuliers d'un champ de vecteurs, trajectoires, comportements asymptotiques et stabilite dynamique.", ["Demailly, chapitre X, p.305-322", "Tres utile IA theorique / modeles continus"], 8, 2),
          item("l3-ap-dem-11", "EDO dependant d'un parametre", "Dependance parametrique des solutions, petites perturbations, sensibilite parametrique et applications aux perturbations.", ["Demailly, chapitre XI, p.323-342", "Tres utile IA theorique / modeles continus"], 8, 2),
        ],
      },
    ],
  },
  {
    id: "proba",
    title: "Probabilites et Statistiques",
    phase: phases.proba,
    blocks: [
      {
        title: "Bloc 1 - Fondamentaux et probabilites",
        items: [
          item("ps-01", "Statistique descriptive", "Tableaux, indicateurs, dispersion et representations.", ["Statistique descriptive, Mementos LMD"], 5, 2),
          item("ps-02", "Probabilites L1", "Denombrement, probabilites finies, variables et vecteurs aleatoires finis.", ["Analyse et probabilite L1, chapitres 12 a 15", "Emmanuel Bougnol, playlists denombrement/probabilite/variables aleatoires"], 8, 1),
          item("ps-03", "Probabilites discretes L2", "Variables discretes et probabilites discretes.", ["Jaber Jamel, Probabilites discretes MP-MP, chapitres 9 et 10", "Analyse et probabilite L2 en annexe"], 8, 1),
          item("ps-04", "Probabilites L3 mesurees", "Probabilites continues, integration, convergence et variables aleatoires generales.", ["Garet-Kurtzmann, De l'integration aux probabilites, tous les chapitres"], 12, 1),
          item("ps-05", "Processus stochastiques", "Markov discret/continu, renouvellement, martingales, mouvement brownien.", ["Sabin Lessard, Processus stochastiques, chapitres 1 a 5"], 12, 1),
        ],
      },
      {
        title: "Bloc 2 - Statistique et series temporelles",
        items: [
          item("ps-06", "Statistique inferentielle", "Estimation, tests, intervalles et modeles statistiques.", ["Olivier Marchal, Statistiques inferentielles"], 10, 1),
          item("ps-07", "Series temporelles", "Modeles temporels, stationnarite, prevision et analyse appliquee.", ["Bourbonnais et Terraza, Analyse des series temporelles, 3e edition"], 10, 2),
        ],
      },
      {
        title: "B3 - ML, DL, RL et ML Engineering",
        items: [
          item("ps-ai-01", "Cadre general du Machine Learning", "Evaluation, supervise, regression, regularisation, k-NN, arbres, SVM, reduction de dimension, clustering et premiere intuition des reseaux.", ["Introduction au machine learning - 3e edition (Chloe-Agathe Azencott)", "Dossier 01_Introduction_theorique_et_algorithmes_classiques"], 10, 1),
          item("ps-ai-02", "Python Data Science - manipulations", "Python data, NumPy, pandas, chargement, nettoyage, valeurs manquantes, transformations, jointures, groupby et visualisation.", ["Analyse_de_donnees_avec_Python_pedagogique.pdf", "Dossier 02_Python_data_et_notebooks", "Livrable : notebook EDA simple"], 10, 1),
          item("ps-ai-03", "Python Data Science - cours pratique", "NumPy, pandas, Matplotlib, datasets reels, exercices pratiques, defis et mini-projets.", ["Udemy - Data Science : Analyse de donnees avec Python", "Livrable : projet du cours nettoye et commente"], 8, 2),
          item("ps-ai-04", "Pandas avance et visualisation statistique", "Pandas avance, nettoyage, transformations, fusions, groupby, valeurs manquantes, Seaborn et visualisations statistiques.", ["Udemy - La Manipulation de donnees avec Python en 2025", "Livrable : EDA complet avec export CSV nettoye"], 8, 2),
          item("ps-ai-05", "Premiers modeles Scikit-learn", "KNN, regression lineaire/logistique, k-means, validation croisee, hyperparametres et premiers modeles predictifs.", ["Udemy - Machine Learning avec Python : La formation complete", "Livrable : mini-projet Scikit-learn avec baseline et analyse d'erreurs"], 10, 1),
          item("ps-ai-06", "Workflow ML complet avec Geron et Muller", "Projet ML de bout en bout, classification, entrainement, pipelines, SVM, arbres, ensembles, reduction de dimension, non supervise et donnees textuelles.", ["Parcours_Data_Science_ML_Geron_Muller.pdf", "Dossier 03_ML_applique_avec_le_PDF_fusionne_Geron_Muller", "Livrable : pipeline Scikit-learn complet"], 12, 1),
          item("ps-ai-07", "Projet fil rouge Data Science et ML", "pandas, Matplotlib, Seaborn, Scikit-learn, feature engineering, selection, scaling, modeles supervises/non supervises et projet complet.", ["Udemy - Data Science et Machine Learning | MasterClass Python", "Livrable : projet ML tabulaire avec rapport court"], 12, 1),
          item("ps-ai-08", "Statistique appliquee pour diagnostiquer les modeles", "Regression simple et multiple, diagnostics, variables qualitatives, ANOVA/ANCOVA, selection, ridge, lasso, elastic net, GLM, logistique et Poisson.", ["Regression avec R - 2e edition", "Dossier 04_Statistique_appliquee_et_regression", "Livrable : probleme de regression refait en Python"], 10, 1),
          item("ps-ai-09", "Machine Learning probabiliste", "Regression probabiliste, frequentiste vs bayesien, famille exponentielle, GLM, PAC/VC, clustering, EM/ELBO, graphes, Monte Carlo et variationnel.", ["ML_intro_francais.pdf", "Dossier 05_ML_probabiliste_et_inference", "Livrable : EM sur modele simple"], 12, 1),
          item("ps-ai-10", "Optimisation pour ML", "Convexite, projections, optimalite, GD, SGD, non lisse, regret, online GD, mirror descent, AdaGrad, variance, Nesterov et Frank-Wolfe.", ["Hazan_Optimization_for_Machine_Learning_FR.pdf", "Dossier 06_Optimisation_pour_ML", "Livrable : comparaison GD, SGD, momentum et Adam"], 12, 1),
          item("ps-ai-11", "Theorie de l'apprentissage", "Generalisation, prediction, bornes, noyaux, optimisation, modeles graphiques, PAC, VC/Rademacher, stabilite et regression garantie.", ["younes-introduction-apprentissage-automatique-fr_avec_signets.pdf", "Fondements de l'apprentissage automatique.pdf", "Apprentissage_machine_with_TOC.pdf", "exercices_machine_learning_fr.pdf", "Dossier 07_Theorie_de_lapprentissage"], 14, 1),
          item("ps-ai-12", "Transition vers Deep Learning", "PCA, kernel PCA, t-SNE, k-means, regression, SVM/logistique, CNN/RNN/LSTM, autoencodeurs, VAE/GAN, interpretabilite, adversarial et introduction RL.", ["MLforScience_lectures.fr.pdf", "Dossier 08_Applications_scientifiques_et_transition_vers_DL_RL", "Livrable : mini-projet scientifique avec baseline et reseau simple"], 10, 2),
          item("ps-ai-13", "Entree theorique courte en Deep Learning", "Perceptron, MLP, activations, pertes, entropie croisee, SGD, CNN, backprop, ResNet, transfert, RNN/GRU/LSTM et NLP.", ["Introduction-au-Deep-Learning-2021-Fr.pdf", "Notes_de_cours_architectures_reseaux_de_neurones_FR.pdf", "Dossier 09_Entree_en_deep_learning"], 10, 1),
          item("ps-ai-14", "Deep Learning pratique TensorFlow/Keras", "TensorFlow 2, Keras, MLP, backprop en framework, activations, loss, optimiseurs, CNN, RNN/LSTM/GRU et projets guides.", ["Udemy - Deep Learning avec TensorFlow et Keras | MasterClass Python", "Livrable : deux notebooks DL"], 10, 1),
          item("ps-ai-15", "Vision par ordinateur avec CNN", "Convolution, pooling, padding, strides, classification d'images, transfer learning, VGG, ResNet et EfficientNet si utilises.", ["Udemy - Deep Learning: Classification des Images (TensorFlow, Keras)", "Livrable : projet CNN avec transfer learning et ablations"], 8, 2),
          item("ps-ai-16", "Deep Learning fondamental avec les livres", "Tenseurs, autograd, pertes, optimisation, regularisation, CNN, espaces latents, autoencodeurs, VAE, MLP, RNN, GAN, diffusion, RL et deploiement.", ["Mathematiques et architectures de l'apprentissage profond.pdf", "deep_learning_full.pdf", "Deep Learning avec Keras et TensorFlow (avec signets).pdf", "Dossier 10_Deep_learning_fondamental_et_pratique"], 14, 1),
          item("ps-ai-17", "PyTorch pour recherche et engineering", "Tenseurs, autograd, regression, MLP, CNN, RNN/LSTM, Transformers, ViT, U-Net, transfer learning, segmentation et series temporelles.", ["YouTube - Apprendre PyTorch pas a pas", "Livrable : reimplementation PyTorch d'un modele Keras"], 10, 1),
          item("ps-ai-18", "Theorie avancee du Deep Learning", "ANN, CNN, ResNet, RNN/LSTM, autoencodeurs, attention, GNN, approximation, optimisation, generalisation, PINN/DGM/DKM optionnels, NTK et dynamique d'entrainement.", ["Deep_Neural_Network.fr.pdf", "Les Principes de la Theorie de l'Apprentissage Profond.pdf", "Dossier 10.5_Theorie_avancee_du_deep_learning"], 16, 2),
          item("ps-ai-19", "Reseaux neuronaux historiques et pont vers RL", "Hopfield, Boltzmann/RBM, perceptron, MLP, SGD/backprop, CNN/RNN, autoencodeurs, TD learning et Q-learning.", ["Mehlig_Machine_learning_with_neural_networks_FR.pdf", "Dossier 11_Reseaux_neuronaux_transition_historique_et_pont_vers_RL", "Livrable : note valeur tabulaire vers reseau"], 10, 2),
          item("ps-ai-20", "NLP et Hugging Face pratique", "Tokenization, Transformers, Datasets, Tokenizers, Accelerate, Hub, fine-tuning et taches NLP classiques.", ["Cours NLP officiel Hugging Face", "YouTube - Apprendre Hugging Face pas a pas", "Livrable : fine-tuning NLP simple"], 10, 1),
          item("ps-ai-21", "Transformers et architectures modernes", "Autodiff, initialisation, CNN, equivariance, groupes, varietes, GNN, Deep Sets, Transformers, self-attention, LLM, RAG, alignement, RLHF, DPO et cours pratique NLP.", ["Smets_Mathematics_of_Neural_Networks_fr.pdf", "Geometric Deep Learning Grids Groups Graphs Geodesics and Gauges - FR.pdf", "Transformers_The_Definitive_Guide_FR_LaTeX.pdf", "Fondements des grands modeles de langage.pdf", "Udemy - Transformers for NLP", "Dossier 12_Architectures_modernes_avancees"], 16, 1),
          item("ps-ai-22", "Bandits et exploration", "Bandits stochastiques, exploration uniforme/adaptative, UCB, Thompson sampling, bandits adverses et contextuels.", ["Introduction aux bandits a plusieurs bras.pdf", "Dossier 13_Bandits_et_exploration", "Livrable : comparer epsilon-greedy, UCB et Thompson sampling"], 8, 1),
          item("ps-ai-23", "MDP et decision interactive", "Decision interactive, online learning, poids exponentiels, bandits, MDP episodiques, programmation dynamique, exploration et approximation de fonctions.", ["Fondements de l'apprentissage par renforcement et de la prise de decision interactive.pdf", "Fondements_apprentissage_renforcement_prise_decision_interactive_FR.pdf en verification", "Dossier 14_Decision_interactive_et_MDP"], 10, 1),
          item("ps-ai-24", "Apprentissage par renforcement avec Python", "Premiers agents RL, etats, actions, recompenses, exploration/exploitation, methodes tabulaires, environnements, stabilisation et courbes de retour.", ["Udemy - Initiation a l'apprentissage par renforcement avec Python", "Udemy - Apprentissage par renforcement avec Python - Partie 2", "Livrable : projet RL comparant au moins deux methodes"], 12, 1),
          item("ps-ai-25", "Reinforcement Learning general", "MDP/POMDP, value iteration, policy iteration, Monte Carlo, TD, SARSA, Q-learning, DQN, policy gradients, actor-critic, PPO/TRPO.", ["Reinforcement Learning - Vue d'ensemble FR.pdf", "Dossier 15_Reinforcement_learning_general", "Livrable : Q-learning et SARSA tabulaires"], 12, 1),
          item("ps-ai-26", "Deep Reinforcement Learning", "DQN, replay buffer, target network, policy gradients, actor-critic, PPO/TRPO, model-based RL, MCTS, offline RL, Gymnasium, seeds, logs et ablations.", ["Reinforcement Learning - Vue d'ensemble FR.pdf", "Plaat_Deep_Reinforcement_Learning_FR.pdf", "Deep Learning avec Keras et TensorFlow (chapitre RL)", "Dossier 16_Deep_reinforcement_learning"], 16, 1),
          item("ps-ai-27", "RLHF, preferences et alignement", "Alignement, RLHF, DPO, donnees de preference, reward models, LLM-as-a-judge, PPO, RLOO, GRPO/GSPO, rejection sampling, KL et evaluation.", ["Fondements des grands modeles de langage.pdf", "Apprentissage par renforcement a partir du feedback humain 2.pdf", "Dossier 17_RLHF_preferences_et_alignement"], 12, 2),
          item("ps-ai-28", "AI Engineering et capstone", "Evaluation de systemes IA, donnees, orchestration, cout, monitoring, robustesse, deploiement, FastAPI, Docker, tests, logs et capstone final.", ["AI_Engineering_FR.pdf", "Dossier 18_AI_engineering_et_capstone", "Livrable : capstone avec baseline, metriques, protocole, seeds, rapport et API servable"], 16, 1),
        ],
      },
    ],
  },
];

window.STUDY_PROGRAM.push({
  id: "info",
  title: "Informatique",
  phase: "Domaine 3 - Informatique",
  blocks: [
    {
      title: "Bloc 1 - Informatique lycee",
      items: [
        item("info-01", "NSI Premiere", "Bases d'algorithmique, variables, conditions, boucles et fonctions.", ["Notes algorithmiques Grafikart", "Livre NSI Premiere, chapitres 1 a 5", "Exercices du chapitre 1 a 5"], 8, 1),
        item("info-03", "NSI Terminale", "Approfondissement des structures de donnees, graphes et programmation.", ["Programme NSI Terminale"], 10, 2),
      ],
    },
    {
      title: "Bloc 2 - Python",
      items: [
        item("info-04", "IDE et environnement", "Prise en main de Visual Studio Code et organisation du travail Python.", ["Playlist Visual Studio Code"], 4, 2),
        item("info-05", "Introduction a Python", "Syntaxe, types, fonctions, modules et premiers scripts.", ["Python cours video", "Cours Udemy Python"], 10, 1),
        item("info-06", "Python pour les maths", "Utiliser Python pour calculer, representer et explorer des objets mathematiques.", ["Python pour les Maths"], 8, 1),
        item("info-07", "Methodes numeriques avec Python", "Implementation de methodes numeriques et calcul scientifique simple.", ["Methodes numeriques avec Python"], 10, 1),
      ],
    },
    {
      title: "Bloc 3 - Informatique sup",
      items: [
        item("info-08", "Architecture des machines", "Bases de l'architecture machine, memoire, processeur et representation.", ["Cours d'architecture EvoluNoob"], 8, 2),
        item("info-09", "Introduction a l'assembleur", "Premiers modeles d'execution bas niveau et logique assembleur.", ["Cours assembleur EvoluNoob"], 8, 2),
        item("info-10", "Informatique MPSI", "Algorithmique et programmation de niveau superieur.", ["Programme informatique MPSI"], 10, 2),
        item("info-11", "Programmation efficace", "Complexite, structures de donnees et choix d'implementation.", ["Algorithmique avancee"], 10, 1),
      ],
    },
    {
      title: "Bloc 4 - Projets",
      items: [
        item("info-12", "Algorithmique avancee", "Renforcer les algorithmes classiques et les raisonnements de complexite.", ["Algorithmique ++"], 12, 1),
        item("info-13", "HTML et CSS", "Bases de l'integration web et interfaces simples.", ["HTML5 et CSS3 - formation ultime"], 8, 2),
        item("info-14", "Projet backend", "Construire un projet backend organise et maintenable.", ["Projet Ingenieur Backend"], 12, 1),
      ],
    },
  ],
});

window.STUDY_DOMAINS = [
  {
    id: "maths",
    title: "Maths Sup",
    shortTitle: "Maths",
    accent: "maths",
    programIds: ["l1", "l2", "l3"],
    rule: "Avancer dans l'ordre L1, puis L2, puis L3.",
  },
  {
    id: "proba",
    title: "Proba",
    shortTitle: "Proba",
    accent: "proba",
    programIds: ["proba"],
    rule: "Suivre le programme probabilites/statistiques dans l'ordre.",
  },
  {
    id: "info",
    title: "Informatique",
    shortTitle: "Info",
    accent: "info",
    programIds: ["info"],
    rule: "Suivre le programme informatique dans l'ordre.",
  },
];

window.WEEK_TEMPLATES = {
  A: {
    label: "Semaine A",
    summary: "Maths Sup x2, Proba x2, Info x1",
    days: [
      { id: "mon", label: "Lun", longLabel: "Lundi", domainId: "maths" },
      { id: "tue", label: "Mar", longLabel: "Mardi", domainId: "maths" },
      { id: "wed", label: "Mer", longLabel: "Mercredi", domainId: "proba" },
      { id: "thu", label: "Jeu", longLabel: "Jeudi", domainId: "proba" },
      { id: "fri", label: "Ven", longLabel: "Vendredi", domainId: "info" },
    ],
  },
  B: {
    label: "Semaine B",
    summary: "Maths Sup x2, Info x2, Proba x1",
    days: [
      { id: "mon", label: "Lun", longLabel: "Lundi", domainId: "maths" },
      { id: "tue", label: "Mar", longLabel: "Mardi", domainId: "maths" },
      { id: "wed", label: "Mer", longLabel: "Mercredi", domainId: "info" },
      { id: "thu", label: "Jeu", longLabel: "Jeudi", domainId: "info" },
      { id: "fri", label: "Ven", longLabel: "Vendredi", domainId: "proba" },
    ],
  },
};

window.SESSION_SLOTS = [
  { id: "morning", label: "Matin", start: "09:00", end: "12:30" },
  { id: "afternoon", label: "Apres-midi", start: "13:30", end: "18:00" },
];
