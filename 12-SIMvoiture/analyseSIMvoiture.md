# Analyse et suivi — SIMvoiture

## Périmètre

Nouveau dossier `12-SIMvoiture`, indépendant du jeu Space Survivors. Objectif :
donner à des voitures un cerveau qui évolue, puis confronter des cerveaux sauvés.
Il s'agit de **neuroévolution**, pas de rétropropagation ni d'un pilote suivant
automatiquement des points du circuit.

Les règles de séparation action / steering / locomotion suivent l'architecture
du dépôt et le modèle de Reynolds. Aucun fichier `vehicle.js` fourni n'est
modifié, et aucun fichier des TP 9/9b n'est réécrit.

## Ce qui vient réellement des TP

| Source fournie | Réutilisation dans SIMvoiture |
| --- | --- |
| `1-Seek/vehicle.js` | Chargé directement. `SimCar`, `SimTrack` et `TrackWall` héritent de `Vehicle`. `applyForce()` et `update()` sont hérités, pas recopiés. |
| `9b - Voiture suit circuit version 2/js/NeuralNetwork.js` | Chargé directement. `Brain extends NeuralNetwork`. `predict()` (tenseur d'entrée, modèle, `dataSync()`, `tf.tidy()`) et `dispose()` sont hérités sans changement. |
| Passage avant du même réseau dense | `predict()` du TP reste la référence inchangée. Pour le jeu, `predictFast()` calcule le même passage avant avec les poids du modèle en cache et les arrondis Float32 du backend CPU, sans allouer de tenseurs par pas. Ce chemin optimisé est un ajout, pas une fonction prétendument fournie dans le TP. |
| Même fichier, `createModel()` | Même modèle dense TensorFlow, sigmoïde par défaut et deux sorties sigmoïdes. Extension pour rendre le nombre de couches/neurones et l'activation cachée configurables. |
| Même fichier, `copy()` | Même principe : créer un modèle, cloner ses poids et les affecter. Surcharge nécessaire pour conserver la sous-classe `Brain` et sa configuration multi-couches. |
| Même fichier, `mutate(rate)` | Même algorithme : tirage indépendant par poids, ajout d'un bruit gaussien centré, nouveaux tenseurs, `setWeights()` dans `tf.tidy()`. Écart-type configurable, générateur p5 au lieu de `Math.random` pour la sélection des poids ; générateurs injectables dans les tests. |
| `9b…/js/Ray.js` | Chargé directement et utilisé tel quel : `setPos`, `setDir`, `cast` (intersection rayon/segment). Ce sont des capteurs logiques, pas des véhicules visibles indépendants. |
| `9b…/js/Track.js` | `interpolatePoints`, `resamplePoints` et `doSegmentsIntersect` chargés et appelés directement. La classe `Boundary` du TP n'est pas instanciée ; nos murs/checkpoints sont des `TrackWall extends Vehicle`. |
| Même fichier, `setupTrack` / fonction locale `findLoop` | Recherche en profondeur sur grille extraite dans `CircuitGenerator.gridLoop` : cases visitées, voisins cardinaux, fermeture de boucle, backtracking et budget de 50 000 appels. Dimensions, longueur cible et aléatoire sont paramétrés pour notre scène. |
| Même fichier, `getConvexHull` | Appelé directement sur un nuage aléatoire comme repli géométrique. Aucun circuit de secours enregistré. |
| `9b…/js/utils.js` | `distPointToSegment` fourni appelé directement pour distances aux murs et checkpoints. |
| `9b…/js/Car.js`, perception | Même principe du rayon le plus proche, normalisation `1 - distance / portée` et entrée de vitesse optionnelle. Adaptation dans `SimCar.look()` ; nombre, angle et portée deviennent configurables. |
| `9b…/js/Car.js`, décision | Deux sorties direction/vitesse, direction relative au cap, vitesse désirée, puis `steering = desired - current`, limitée à `maxForce`. Conserve aussi le démarrage à au moins la moitié de la vitesse pendant 30 pas. Adaptation à l'héritage imposé, sans reprendre l'intégration physique indépendante de `Car`. |
| `9b…/js/Genetic.js` | Sélection par tournoi du meilleur parmi des candidats tirés avec remise ; taille par défaut 5. `Evolution.tournamentSelection()` reprend cette règle avec paramètre/injection de l'aléatoire. |
| Même fichier, fitness | Score checkpoints + bonus `max(0, 50 × (1 - distance/400))`. Conservation de +50 par checkpoint et +200 au tour du `Car` fourni. |
| Même fichier, arrêt | Conservation du seuil de 60 % de réussite. En multi-circuits, réussite = terminer tous les circuits sélectionnés. |

Le TP `9-VoitureSuitCircuit genetic algo/nn.js` a également été consulté : même
famille de réseau dense et mutation des poids. L'implémentation **9b** a été
retenue comme base cohérente unique plutôt que de mélanger deux locomotions.

## Ce qui est ajouté ou adapté

- **Trois tracés fixes** (Aurora, Lagune, Sierra), définis par des points de
  construction de piste puis interpolés par les fonctions fournies. Ce sont des
  données de décor/collision, **jamais des consignes de direction**.
- **Génération procédurale** par défaut : grille, interpolation Catmull-Rom et
  ré-échantillonnage du TP, puis validation géométrique ajoutée. `setupTrack()`
  n'est pas appelé tel quel, car il écrit des globales et instancie des `Boundary`
  qui n'héritent pas de Vehicle. `smoothPoints()` du TP (jitter/globales) n'est
  pas réutilisé ; le lissage ici est l'interpolation `interpolatePoints` fournie.
- `CircuitGenerator.js` : générateur local reproductible, permutation de voisins
  Fisher–Yates à la place de `sort(random-.5)` du TP, paramètres bornés,
  au plus 20 recherches de grille puis 20 nuages de repli. Les nouveaux contrôles
  rejettent les croisements, la sortie du cadre et un centre de couloir trop
  proche d'un mur. Aucun catalogue de pistes ne remplace l'algorithme.
- Les recettes `random:graine:difficulté` et la largeur sont enregistrées avec
  le cerveau ; les anciens JSON sans ces nouveaux réglages restent compatibles.
  Les tracés d'une expérience restent fixes entre générations, sinon les fitness
  ne seraient plus directement comparables.
- **Test inédit** : même classe `SimRace`, modèles figés, 1 à 8 cerveaux. Exclut
  les graines déjà entraînées et les signatures géométriques exactes connues.
  Le bilan expose succès, temps, progression et échec, sans fabriquer de réussite.
  L'historique connu des pistes/largeurs est propagé lors du réentraînement,
  limité à 256 pistes. Un ancien export ne permet pas de connaître un passé non
  enregistré ; aucune généralisation universelle n'est revendiquée.
- **Confort de l'interface** : corps 15 px, aides 13 px, champs 14 px et au moins
  44 px de haut ; contraste augmenté, parcours en trois étapes, action de démarrage
  plus haut et réglages avancés repliés. Le thème sombre/doré est conservé.
- `Config.js` : bornes, validation et contrat entrées/sorties.
- `Brain.js` : couches configurables, trace exacte des activations, format des
  poids et import contrôlé. Le nombre d'entrées = rayons + vitesse optionnelle ;
  les deux sorties gardent leur sémantique du TP.
- `TrackWall.js` et `Track.js` : géométrie visible sous héritage Vehicle ; murs
  statiques. Le rendu de fond n'est pas une entité autonome.
- `SimCar.js` : un seul appel `super.update()` par pas ; pose de départ et remise
  au départ uniquement aux transitions de scène. Aucun repositionnement pour
  corriger une conduite ratée. Checkpoints ordonnés, franchissement vers l'avant,
  collision balayée, fin de course et délai inclusif sans progrès.
- `Evolution.js` : même tournoi/copie/mutation, **élitisme configurable ajouté**,
  champion indépendant, évaluation de tous les circuits avant sélection et
  moyenne des fitness. L'élitisme est une extension, pas une fonction prétendument
  présente telle quelle dans le TP.
- `Race.js` : modèles gelés et véhicules fantômes entre eux, mêmes limites de
  vitesse/force imposées à tous. Les capteurs, réseaux et amplitudes de braquage
  restent ceux du cerveau importé ; une course ne prétend donc pas comparer des
  architectures identiques. Classement arrivé/temps, puis progression pour les
  non-arrivés. Les sorties de piste restent des échecs visibles.
- `BrainStore.js` : JSON versionné, dimensions et valeurs finies contrôlées,
  validation des bilans, stockage local, import/export, limites de taille.
- `NetworkView.js` : activations par application des vraies couches au dernier
  vecteur d'entrée ; poids et biais effectivement utilisés. Seuls les liens
  des poids sont dessinés, les biais ne sont pas représentés visuellement.
- `UI.js`, `index.html`, `style.css` : garage, deux modes, bibliothèque,
  paramètres, classement cliquable, télémétrie et diagnostics.
- `sketch.js` : pas de simulation fixes, pause, pas à pas, ralenti/accéléré avec
  budget de calcul et affichage FPS/multiplicateur réel. Aucun timer permanent
  par voiture.
- `tests/` : contrats, cas limites, vrai TensorFlow et parcours DOM avec vrai p5.
- Optimisations : `DenseInference.js` (passage avant du même réseau),
  `WallIndex.js` (préfiltre conservatif, `Ray.cast` et collisions fournis conservés),
  `SimulationClock.js` (pas physiques inchangés, budget coopératif, 32× à 256× et
  MAX), `TrackRenderer.js` (cache du décor). Aucune nouvelle règle de conduite.
- `Evolution.js` et `Race.js` peuvent distribuer un pas de population sur plusieurs
  rendus, une voiture à la fois. Les voitures ne se percutent pas entre elles et
  aucune ne lit l'état des autres : leur ordre de calcul ne change pas leurs
  trajectoires. Les évaluations/sélections attendent toujours toute la population.
  Les descendants sont créés progressivement, un par lot atomique, puis la
  génération est remplacée intégralement. Pause/reprise et abandon sont testés.
- `UI.js` réutilise boutons du classement et capteurs, ne reconstruit les titres
  qu'au changement de piste, le graphe qu'au changement d'historique, et ne
  redessine le réseau que lorsqu'il est visible et actualisé. Les diagnostics
  utilisent le même passage avant du modèle, sans recalculer des forces.
- `brains/` : deux exports réels issus de l'entraînement dans le navigateur,
  Atlas (8→12→2, génération 1) et Orion (10→10→6→2, génération 25), ayant réussi
  Aurora. Ce sont des exemples de poids évolués, pas des pilotes programmés.
- `vendor/` : copie de p5 déjà présente dans le dépôt et bundle officiel
  TensorFlow.js 4.20.0, même version que celle référencée dans le TP 9b. Les
  licences intégrées aux bundles sont conservées.

## Chaîne de décision d'une voiture

1. Mesurer les intersections des rayons avec les murs dans leur portée.
2. Normaliser ces mesures (et éventuellement la vitesse).
3. Passer ces entrées au réseau dense du cerveau courant (chemin optimisé
   équivalent au passage avant TensorFlow CPU ; référence fournie conservée).
4. Interpréter les deux sorties en rotation du cap et vitesse cible.
5. Construire la vitesse désirée puis soustraire la vitesse actuelle.
6. Limiter à `maxForce`, appeler l'`applyForce()` hérité.
7. Appeler l'`update()` hérité une fois, puis évaluer collision et progression.

Les checkpoints ne sont utilisés que pour le score et le classement, jamais
comme entrées du réseau ou cible d'un `seek()` caché. Les fonctions `seek/flee`
du véhicule restent disponibles mais ne sont pas rajoutées artificiellement à
la conduite pour masquer un mauvais cerveau. Ici, le réseau choisit l'action ;
la force de steering réalise le pilotage.

## Blocages / solutions

| Point rencontré | Solution |
| --- | --- |
| `Car` fourni possède sa propre locomotion et ne respecte pas notre contrat d'héritage. | Ne pas charger cette classe ; adapter perception/décision dans `SimCar`, déléguer toute intégration à `Vehicle` fourni. |
| Le constructeur de `NeuralNetwork` crée le modèle avant que la sous-classe ait son état. | Passer les réglages de couches via le paramètre déjà transmis avant l'appel à `createModel()`. Ne pas modifier le fichier du TP. |
| Reprendre la copie du TP telle quelle restituerait un `NeuralNetwork`, pas notre réseau configurable. | Conserver le clonage exact des poids mais retourner un `Brain` de même architecture. |
| En multi-pistes, sélectionner après la première favoriserait uniquement cette piste. | Même génome évalué sur tous les tracés, puis moyenne et sélection. |
| La pause automatique pouvait réévaluer deux fois la dernière piste à la reprise. | `resume()` crée explicitement la génération suivante avant de reprendre. Test dédié. |
| Une accélération brute peut bloquer le navigateur et fausser la physique. | Pas fixes, budget de calcul de 8 ms (2,5 ms si un rendu est déjà lent), tranches par voiture, backlog borné. Mesure séparée du multiplicateur effectif/demandé, sans garantie de 256×. |
| Import JSON incohérent ou bilan mal formé. | Validation avant création durable : format/version, architecture, tenseurs, nombres finis, bilan, taille. Refus sans remplacer la bibliothèque. |
| Copie/mutation/trace à répétition risquent de conserver des tenseurs. | `tf.tidy`, destruction des populations et champions remplacés ; tests de cycles avec retour au compte initial. |
| Rafraîchir les lignes du classement peut voler le focus. | Conserver la ligne focalisée et actualiser son contenu/état sans remplacer le bouton. |
| Les cerveaux ne se retrouvent pas sur une autre origine ou un autre navigateur. | Expliquer le stockage local et fournir export/import JSON portable. |
| Les tests Node ne suffisent pas pour p5 et les formulaires réels. | Banc navigateur séparé, vrais bundles et événements DOM ; bibliothèque QA distincte de celle de l'utilisateur. |
| Une graine différente peut retrouver exactement une boucle déjà construite. | Le test inédit compare aussi une signature des points du tracé, indépendante du point de départ et du sens. |
| Générer une piste ne doit pas changer les tirages des mutations. | RNG local indépendant de `random()` p5 ; test de non-interférence. |
| Un cartouche central pouvait masquer une route procédurale passant au centre. | Pour les pistes générées, le nom reste dans l'interface et n'est plus dessiné sur la piste. |
| Chute des FPS pendant l'entraînement accéléré. | Réduction des allocations, inférence dense en cache, index spatial, décor en cache, réutilisation DOM, génération progressive et restitution du contrôle entre voitures. |
| Le cache des poids pourrait conserver un ancien cerveau après mutation/import. | Comparaison des identifiants des données des tenseurs ; recompilation après `setWeights`/mutation. Copie et import sont des modèles distincts. Tests dédiés. |
| Un modèle rapide pourrait changer le comportement du TP. | Comparaison exacte de 450 prédictions Float32, couches réelles, mutations, forces et d'une trajectoire complète de 1800 pas contre la référence. |

## Vérifications réalisées

- Suite Node : **53 tests réussis**, vrai TensorFlow CPU. Les tests fixent/injectent
  l'aléatoire quand ils vérifient un résultat numérique de mutation/sélection.
  Un test importe aussi Atlas/Orion et vérifie qu'ils terminent tous les deux
  Aurora avec les paramètres physiques indiqués dans le README.
- Audit comparatif avec les fichiers du professeur chargés dans un contexte de
  test séparé : mêmes prédictions à poids égaux, même mutation à tirages égaux,
  même parent au tournoi et même force que `Car.think` à réglages correspondants
  (`turn = maxForce`), y compris le démarrage. Cela vérifie les briques reprises,
  sans prétendre que notre interface ou nos extensions étaient dans le TP.
- Géométrie : graines répétables, diversité de tracés, 3 difficultés, largeurs
  70/110/140, graines limites, croisements rejetés et départ libre. Les tests
  vérifient aussi l'historique, l'évaluation multi-pistes et les poids figés.
- Vrai p5 dans le navigateur : **28 vérifications intégrées réussies**, dont
  entraînement, génération évaluée, pause/pas à pas, sélection, réseau réel,
  raccourci D, sauvegarde/import valide et invalide, course à deux cerveaux,
  conservation des poids, génération procédurale par défaut, deux pistes
  générées par génération, texte agrandi, test inédit à un seul cerveau avec
  bilan et bibliothèque restaurée après rechargement.
  Les nouvelles vérifications couvrent aussi les options >16×/MAX, les mesures
  de vitesse réelle et la conservation des nœuds DOM du classement/capteurs.
  Contrôle visuel et absence d'erreur console sur l'application principale.
- Essai réel de cinq générations (population 40, réseau 8→10→2, Aurora) : fitness
  maximale observée d'environ **192 à 3043**, moyenne d'environ **91 à 2065**,
  **62,5 %** de réussite à la génération 5 et champion ayant terminé en 601 pas.
  C'est le résultat d'un essai, **pas une garantie** pour d'autres tirages.
- Le même essai libère tous ses modèles : **0 tenseur restant**.
- Banc de calcul, charge identique de 14 400 mises à jour sur 48 pilotes Atlas,
  circuit Aurora, tous encore actifs à la fin : ancienne version observée à
  environ **2911 ms**, premier chemin optimisé à **572 ms**. Le banc reproductible
  `tests/benchmark.mjs` a ensuite mesuré **3858 ms** (référence TensorFlow/murs
  complets) contre **691 ms** (optimisé), soit environ **5,6×** moins de temps.
  Les valeurs fluctuent avec la charge système ; ce ne sont pas des FPS.
- Comparaison navigateur observée, 48 pilotes Atlas identiques, Aurora,
  mutation 0, demande 16× : **49 FPS / 1,7× réel** avant rechargement, puis
  **60 FPS / 6,2× réel** après optimisation. Une session aléatoire à 48 voitures
  a aussi affiché **61 FPS / 11,7× réel** en MAX. Ces observations ne constituent
  pas une garantie de performance sur chaque matériel ou configuration.
  Avec 8 pilotes Atlas sur Aurora, MAX a affiché **54 FPS / 40,6× réel** : le
  multiplicateur réellement atteint peut donc dépasser 16× avec une charge
  adaptée, sans prétendre atteindre le multiplicateur demandé sur toute population.
- Contre-exemple de généralisation : Atlas et Orion, entraînés sur Aurora, ont
  été évalués sans mutation sur les graines 100 à 104 (difficulté 1, largeur 110,
  vitesse 5, force 0,5). Aucun n'a terminé ces cinq pistes ; la meilleure
  progression observée était d'environ 57 %. Leur réussite sur Aurora ne
  prouve donc pas une conduite générale. Le nouvel entraînement multi-pistes
  et le test inédit permettent justement de mesurer et travailler cette limite.
- Empreinte vérifiée de `1-Seek/vehicle.js` :
  `319a07e0d5d08fdd54a79a07a28e2b1e58b62721b0482ea66197b5331985137b`.

## Limites assumées

### Inspiration de la simulation de Zorgnac — 20 octobre 2026

Référence consultée : [SteeringBehavioursM2IA2_2025_2026](https://github.com/zorgnac/SteeringBehavioursM2IA2_2025_2026),
branche `main`, révision `185363364521c891e2f13e5b04d1ce7c7ee4dabb`.
Lecture des méthodes `Vehicle.show`, `Vehicle.highlight` et `Track.show` de
`9-VoitureSuitCircuit genetic algo`, ainsi que `Car.think` / `Car.show` de `9b`.
L'inspiration retenue est la mise en évidence du leader, de ses capteurs et de
sa progression. Ce n'est ni une copie de leur simulation ni l'import de leur
autre classe `Vehicle` : celle-ci remplacerait notre base protégée et changerait
les règles d'apprentissage. Aucun fichier du dépôt distant n'est exécuté ou ajouté.

Ajouts originaux dans SIMvoiture :

- `CarRenderer.js` : rendu séparé des voitures existantes, carrosserie profilée,
  pneus, aileron, vitrages, feux et douze livrées. Ce renderer n'est pas une entité.
  Cache borné à douze petits canvas, un seul blit par voiture/image ; aucune
  nouvelle allocation de sprite après préchauffage de la palette.
- Sélection dorée, leader menthe, numéro du véhicule sélectionné et aperçu
  agrandi de sa vraie livrée dans l'inspecteur. Couleurs correspondantes dans
  le classement, sans recréer les boutons à chaque rafraîchissement.
- Debug : extrémités des rayons, alerte corail au-delà de 0,8 d'entrée de
  proximité, flèches vitesse/force et prochain checkpoint en menthe.
  Les données sont uniquement lues : pas de nouveau raycast, de `think`,
  d'`applyForce` ou de déplacement déclenché par l'affichage.
- Circuit : gazon strié, asphalte, vibreurs crème/corail, sens de circulation
  et départ contrasté. Marquages de rendu uniquement, non perçus par le réseau.
  Le décor conserve le cache statique ; murs, rayon de collision, checkpoints,
  forces, poids, fitness et héritage de `SimCar` sont inchangés.

Fichiers modifiés : `SimCar.js`, `Track.js`, `TrackRenderer.js`, `index.html`,
`UI.js`, `style.css`, `README.md`, ce suivi et les tests. Ajouts :
`CarRenderer.js`, `tests/rendering.test.mjs`.

Vérification reproductible :
`node --test --test-isolation=none 12-SIMvoiture/tests/*.test.mjs`.
Les tests de rendu vérifient le cache borné, l'absence de mutation de la
simulation par le debug, les vecteurs nuls, les rayons absents, l'arrivée,
l'aperçu et la conservation de la géométrie sur piste fixe/procédurale.
Les comparaisons existantes des trajectoires/forces avec le TP sont conservées.
Résultat après habillage : **53/53 tests Node et 28/28 contrôles navigateur**.
Session observée sur le circuit procédural #42, population 48, mode MAX :
**61 FPS / 24,4× réel** au relevé, sans erreur console de l'application.
Observation ponctuelle, pas une comparaison à charge constante ni une garantie
de ce débit sur toutes les générations ou tous les matériels.
Des URL de ressources versionnées évitent de mélanger l'ancien script UI mis
en cache avec le nouvel HTML lors de cette mise à jour.

### Limites du modèle

Publication : SIMvoiture est le **projet 12**, distinct du **projet 11 — Space
Survivors**. Les deux sont présentés dans `README.md` et `PROJETS.md` à la racine
et possèdent deux liens directs GitHub Pages, sans page d'accueil commune.
Le dossier complet et les dépendances des TP sont conservés pour les imports
relatifs. L'outil vidéo annulé n'est pas inclus dans la mise à jour du dépôt.

Ce n'est pas un simulateur de dynamique automobile réaliste : le modèle reste
celui des véhicules de steering du TP (vitesses en pixels/pas, pas de boîte de
vitesses ni modèle de pneus). L'apprentissage génétique peut stagner. La graine
fixe les tirages p5 d'évolution mais **pas l'initialisation TensorFlow des poids**.
Les temps de course sont simulés, non des temps réels de calcul. Une course sur
un circuit jamais appris n'est pas une garantie de généralisation. L'interface
ne prétend pas qu'un cerveau provisoire est un champion entraîné.
