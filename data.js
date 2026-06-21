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
          item("l1-03", "Techniques de calcul et trigonometrie", "Calcul algebrique, sommes, produits, inegalites et trigonometrie de base.", ["Techniques en analyse - inegalites", "MPSI, chapitres 1 et 2", "Calcul algebrique - sommes et produits"], 6, 1),
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
          item("l3-an-01", "Topologie, metrique, normes", "Espaces topologiques, metriques, compacts, connexes, espaces normes.", ["Topologie generale et espaces normes, chapitres 0 a 7"], 12, 1),
          item("l3-an-02", "Espaces de Hilbert", "Projection orthogonale, Riesz-Frechet, bases hilbertiennes.", ["Topologie generale et espaces normes, chapitre 8"], 8, 1),
          item("l3-an-03", "Mesure et integrale de Lebesgue", "Tribus, mesures, fonctions mesurables, convergence monotone, Fatou.", ["Integration et applications, chapitres 2 et 3"], 10, 1),
          item("l3-an-04", "Convergence dominee et Fubini", "TCD, integration dependante d'un parametre, espaces produits.", ["Integration et applications, chapitres 4 et 5"], 10, 1),
          item("l3-an-05", "Espaces Lp", "Lp, completude, Holder, densite et structure fonctionnelle.", ["Integration et applications, chapitre 6"], 8, 1),
          item("l3-an-06", "Changement de variables et integration sur Rn", "Lebesgue sur Rn, jacobien, Fubini/Tonelli et coordonnees polaires.", ["Integration et applications, chapitre 7", "Jean-Pierre Marco, chapitre 14"], 8, 1),
          item("l3-an-07", "Analyse fonctionnelle", "Operateurs lineaires, dualite et espaces de fonctions.", ["Cours d'analyse fonctionnelle avec 200 exercices corriges, Daniel Li"], 10, 2),
          item("l3-an-08", "Analyse complexe", "Holomorphie, outils complexes et liens avec Fourier.", ["Analyse complexe pour la Licence 3", "El Amrani, Analyse complexe"], 8, 2),
          item("l3-an-09", "Analyse de Fourier", "Distributions, transformee de Fourier, Laplace et espaces fonctionnels.", ["Lesfari, Distributions, Analyse de Fourier et Transformation de Laplace", "El Amrani, Analyse de Fourier"], 10, 1),
          item("l3-an-10", "Calcul differentiel L3", "Gradient, Hessienne, conditions d'optimalite et dynamiques continues.", ["El Amrani, Calcul differentiel"], 8, 1),
          item("l3-an-11", "EDO et flots", "Solutions maximales, etudes qualitatives et flot d'un champ de vecteurs.", ["Jean-Pierre Marco, chapitres 36 a 38"], 8, 2),
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
          item("l3-ap-01", "Calcul scientifique lineaire", "Erreurs, conditionnement, LU, QR, gradient conjugue, valeurs propres.", ["Applique, chapitre 1"], 8, 1),
          item("l3-ap-02", "Interpolation et approximation", "Lagrange, Newton, splines, Gram-Schmidt, quadratures.", ["Applique, chapitre 2"], 7, 2),
          item("l3-ap-03", "Resolution numerique EDO/EDP", "Euler, Runge-Kutta, stabilite, convergence, elements finis.", ["Applique, chapitre 3"], 8, 2),
          item("l3-ap-06", "Systemes polynomiaux", "Ideaux, varietes, resultants, bases de Grobner.", ["Applique, chapitre 6"], 7, 3),
          item("l3-ap-09", "Optimisation", "Objectifs, contraintes, gradient, Lagrange, KKT, optimisation lineaire.", ["Applique, chapitre 9"], 10, 1),
          item("l3-ap-10", "Analyse harmonique appliquee", "Signaux, DFT, filtres, ondelettes, temps-frequence.", ["Applique, chapitre 10"], 8, 1),
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
        title: "Fondamentaux et probabilites",
        items: [
          item("ps-01", "Statistique descriptive", "Tableaux, indicateurs, dispersion et representations.", ["Statistique descriptive, Mementos LMD"], 5, 2),
          item("ps-02", "Probabilites L1", "Denombrement, probabilites finies, variables et vecteurs aleatoires finis.", ["Analyse et probabilite L1, chapitres 12 a 15", "Emmanuel Bougnol, playlists denombrement/probabilite/variables aleatoires"], 8, 1),
          item("ps-03", "Probabilites discretes L2", "Variables discretes et probabilites discretes.", ["Jaber Jamel, Probabilites discretes MP-MP, chapitres 9 et 10", "Analyse et probabilite L2 en annexe"], 8, 1),
          item("ps-04", "Probabilites L3 mesurees", "Probabilites continues, integration, convergence et variables aleatoires generales.", ["Garet-Kurtzmann, De l'integration aux probabilites, tous les chapitres"], 12, 1),
          item("ps-05", "Processus stochastiques", "Markov discret/continu, renouvellement, martingales, mouvement brownien.", ["Sabin Lessard, Processus stochastiques, chapitres 1 a 5"], 12, 1),
        ],
      },
      {
        title: "Statistique, series temporelles et ML",
        items: [
          item("ps-06", "Statistique inferentielle", "Estimation, tests, intervalles et modeles statistiques.", ["Olivier Marchal, Statistiques inferentielles"], 10, 1),
          item("ps-07", "Series temporelles", "Modeles temporels, stationnarite, prevision et analyse appliquee.", ["Bourbonnais et Terraza, Analyse des series temporelles, 3e edition"], 10, 2),
          item("ps-08", "Machine learning, deep learning et RL", "Programme IA relie aux probabilites/statistiques.", ["Programme global ML / DL / RL dans Notion"], 12, 1),
          item("ps-09", "Projet ingenieur ML", "Mise en systeme, evaluation, pipelines et projet applique.", ["Machine Learning Engineering"], 10, 2),
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
      title: "Chapitre 1 - Informatique lycee",
      items: [
        item("info-01", "NSI Premiere - algorithmique", "Bases d'algorithmique, variables, conditions, boucles et fonctions.", ["Notes algorithmiques Grafikart", "Livre NSI Premiere, chapitres 1 a 5"], 8, 1),
        item("info-02", "NSI Premiere - exercices", "Exercices de consolidation sur les premiers chapitres de NSI Premiere.", ["Exercices du chapitre 1 a 5"], 6, 1),
        item("info-03", "NSI Terminale", "Approfondissement des structures de donnees, graphes et programmation.", ["Programme NSI Terminale"], 10, 2),
      ],
    },
    {
      title: "Chapitre 2 - Python",
      items: [
        item("info-04", "IDE et environnement", "Prise en main de Visual Studio Code et organisation du travail Python.", ["Playlist Visual Studio Code"], 4, 2),
        item("info-05", "Introduction a Python", "Syntaxe, types, fonctions, modules et premiers scripts.", ["Python cours video", "Cours Udemy Python"], 10, 1),
        item("info-06", "Python pour les maths", "Utiliser Python pour calculer, representer et explorer des objets mathematiques.", ["Python pour les Maths"], 8, 1),
        item("info-07", "Methodes numeriques avec Python", "Implementation de methodes numeriques et calcul scientifique simple.", ["Methodes numeriques avec Python"], 10, 1),
      ],
    },
    {
      title: "Chapitre 3 - Informatique sup",
      items: [
        item("info-08", "Architecture des machines", "Bases de l'architecture machine, memoire, processeur et representation.", ["Cours d'architecture EvoluNoob"], 8, 2),
        item("info-09", "Introduction a l'assembleur", "Premiers modeles d'execution bas niveau et logique assembleur.", ["Cours assembleur EvoluNoob"], 8, 2),
        item("info-10", "Informatique MPSI", "Algorithmique et programmation de niveau superieur.", ["Programme informatique MPSI"], 10, 2),
        item("info-11", "Programmation efficace", "Complexite, structures de donnees et choix d'implementation.", ["Algorithmique avancee"], 10, 1),
      ],
    },
    {
      title: "Chapitre 4 - Projets",
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
