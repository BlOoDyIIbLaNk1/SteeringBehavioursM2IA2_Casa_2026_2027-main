# SIMvoiture — laboratoire de neuroévolution

Mini-projet indépendant de Space Survivors. Des voitures apprennent à conduire à
partir de leurs rayons de perception, par sélection et mutation de réseaux
TensorFlow.js issus du TP 9b. La locomotion reste celle du `Vehicle` fourni.

## Lancer dans VS Code

1. Ouvrir **le dépôt complet** dans VS Code, pas uniquement ce sous-dossier.
2. Ouvrir `12-SIMvoiture/index.html`, puis **Open with Live Server**.
3. Choisir les réglages et cliquer **Démarrer l’entraînement**.

Autre possibilité, depuis la racine du dépôt :

```sh
python3 -m http.server 8765
```

Ouvrir `http://localhost:8765/12-SIMvoiture/`.

Aucune installation npm et aucune connexion Internet nécessaire : p5.js et
TensorFlow.js sont fournis dans `vendor`. Ne pas ouvrir via `file://`. Ne pas
déplacer le sous-dossier seul : il charge directement les fichiers pédagogiques
de `1-Seek` et `9b - Voiture suit circuit version 2`.

## Entraînement

- Nommer le cerveau ; choisir **De vrais circuits aléatoires** (par défaut) ou
  les trois circuits de référence.
- Paramétrer 3 à 15 rayons, l'entrée de vitesse optionnelle, 1 à 3 couches
  cachées de 2 à 32 neurones, et l'activation des couches cachées.
- Deux sorties sigmoïdes sont conservées : **direction et vitesse désirée**.
  Elles ont une fonction précise, donc leur nombre n'est pas arbitraire.
- Régler population, mutation, bruit gaussien, tournoi, élitisme, vitesse,
  force, braquage, portée/FOV, tours, durée et délai sans progression.
- En multi-circuits, **chaque même cerveau** passe sur toutes les pistes avant
  sélection. Sa fitness finale est la moyenne des évaluations.
- La courbe montre meilleur score et moyenne. La réussite est le pourcentage
  ayant terminé **tous** les circuits de la génération évaluée.
- Une option suspend à 60 % de réussite, comme le critère du TP.

Commencer avec une piste générée de difficulté 1 et les autres réglages par défaut,
ou choisir Aurora dans les circuits de référence. Les premières voitures
peuvent sortir de piste immédiatement : c'est normal. L'apprentissage est
stochastique, sans nombre garanti de générations pour réussir. Les réglages
extrêmes, les réseaux très grands et les pistes plus difficiles peuvent ralentir
ou empêcher la convergence. Modifier les champs ne change pas la population en
cours : le bouton Démarrer applique les réglages à une **nouvelle expérience**.

### Vraie génération procédurale

Il n'y a **pas de catalogue de 50 pistes** : une recherche de boucle sur une
grille construit les points d'un nouveau tracé, puis les fonctions du TP 9b
interpolent et ré-échantillonnent cette géométrie. Les murs qui se croisent et les
passages impraticables sont rejetés. Si la grille ne fournit pas de tracé sûr,
une coque convexe est calculée sur un **nouveau nuage aléatoire**, pas sur un
circuit de secours prédéfini.

- **Graine du circuit** : même nombre + même difficulté + même largeur = même piste.
- **Générer une autre piste** : tire une nouvelle graine. Sans expérience active,
  l'aperçu se met à jour ; sinon, Démarrer applique la piste à la prochaine expérience.
- **Difficulté** : modifie la longueur de boucle recherchée, pas un niveau garanti.
- **Pistes par expérience** : 1 à 3 tracés, graines successives. Ils restent
  identiques entre générations pour comparer équitablement les scores.
- Pour apprendre sur d'autres pistes sans perdre les poids, sauvegarder puis
  **Réentraîner**, changer la graine et relancer avec la même architecture.
- La graine des circuits est indépendante de celle des mutations.

Deux graines peuvent parfois produire la même boucle : elles ne constituent
pas un identifiant mathématique unique de la géométrie.

### Est-ce que mon cerveau réussit ailleurs ?

Dans **Course**, cocher **1 à 8 cerveaux**, puis **Tester une piste inédite**.
Le test choisit une graine absente de leur historique d'entraînement sauvegardé
et rejette les doublons géométriques exacts connus. Les cerveaux conduisent
**sans aucune mutation**. Le bilan affiche réussite/temps ou progression/raison
d'échec. Réussir la piste d'entraînement **ne garantit pas** de réussir ce test.

Une course habituelle demande toujours 2 à 8 cerveaux. Le test inédit peut donc
évaluer un seul pilote. L'historique connu est conservé après réentraînement
(maximum 256 pistes). Les anciens JSON restent compatibles ; ils ne peuvent
évidemment pas révéler des entraînements antérieurs qu'ils n'avaient pas enregistrés.

## Sauvegarde et course

**Enregistrer le meilleur cerveau** conserve le champion déjà évalué ; avant la
première génération complète, il conserve le meilleur provisoire, signalé comme
tel. Le nom utilise le champ du garage. Les poids, l'architecture, les capteurs,
les réglages et le bilan des pistes sont inclus.

- **Exporter JSON** : copie portable à conserver sur le disque.
- **Importer** : validation stricte du format, dimensions et valeurs des poids.
- **Réentraîner** : charge les réglages et permet de repartir des poids du
  cerveau choisi. Changer ses dimensions nécessite de nouveaux poids aléatoires.
- Mode **Course** : cocher 2 à 8 cerveaux dans la bibliothèque et lancer la course.
  Vitesse maximale, force maximale, largeur et tours sont communs. Chaque pilote
  conserve ses propres capteurs, son braquage et son réseau. Les voitures sont
  fantômes entre elles pour ne pas perturber la comparaison.
- Aucun poids n'est modifié pendant la course. Les arrivés sont classés par temps
  simulé ; les autres par checkpoints/progression. Une sortie ou l'absence de
  progrès élimine le pilote. Aucun vainqueur « arrivé » n'est inventé si tous
  échouent.

La bibliothèque est locale au **navigateur et à l'origine** (hôte + port). Elle
ne se transfère pas automatiquement de Live Server vers GitHub Pages ou un autre
navigateur. Garder les JSON ! Maximum 30 cerveaux locaux et 2 Mo par import.

### Essayer une course immédiatement

Deux exemples **réellement entraînés** sont fournis dans `brains/` :
`Atlas.simvoiture.json` (8→12→2, champion génération 1) et
`Orion.simvoiture.json` (10→10→6→2, champion génération 25).
Cliquer **Importer**, choisir ces deux fichiers, les cocher, puis lancer une
course sur **Aurora**, largeur **110**, vitesse **5**, force **0,5**, **1 tour**.
Un test automatisé vérifie qu'ils terminent tous les deux ce circuit. Ils ne
contiennent aucune trajectoire prédéfinie et leur réussite sur les autres pistes
n'est pas garantie. Tu peux aussi les réentraîner depuis le menu.

## Inspection et temps

- Cliquer une voiture sur la piste ou une ligne du classement.
- Voir vitesse en pixels/pas, tours, checkpoints, fitness, entrées normalisées,
  sorties et activations réellement calculées à travers les couches du réseau.
- Vert = poids positif ; corail = négatif ; intensité des nœuds = valeur absolue
  de l'activation (utile aussi pour tanh). Les biais sont calculés, pas dessinés.
- Case **Capteurs** ou touche **D** : rayons + vitesse verte + force orange de
  la voiture sélectionnée. La touche D n'intercepte pas les saisies.
- Pause / espace, pas à pas, ralenti ¼×, ½×, puis accélération jusqu'à **256×
  demandée**, ou **MAX** (sans multiplicateur plafond).
- Le pas physique reste fixe à 60 Hz. Accélérer exécute plus de pas, pas une
  locomotion différente. Le multiplicateur **effectif** dépend de la machine et
  du budget de calcul. L'affichage distingue **vitesse réelle / vitesse demandée** :
  256× n'est pas une promesse de performance, et MAX utilise le budget disponible
  pour calculer le plus de pas possible sans monopoliser l'interface.

### Performances et fidélité du calcul

Le jeu conserve le modèle TensorFlow du TP pour ses poids, mutations,
copies, sauvegardes et prédictions de référence. Son passage avant dense peut
être exécuté avec les poids Float32 mis en cache, sans fabriquer puis détruire
des tenseurs à chaque voiture/pas. Des tests comparent exactement les sorties
au backend CPU TensorFlow, les activations et une trajectoire complète.

Les rayons utilisent toujours `Ray.cast` fourni, après un préfiltre spatial
conservatif des murs. Les tests de collision du TP restent les tests finaux.
Les voitures utilisent toujours `applyForce()` et `Vehicle.update()` hérités.

Le contrôleur peut rendre la main entre deux voitures : celles-ci sont fantômes
et ne dépendent pas de l'état des autres. Une génération n'est sélectionnée
qu'après mise à jour/évaluation de toute la population. Pendant un rendu
intermédiaire, deux voitures peuvent donc être décalées d'au plus un pas simulé.
Les descendants sont préparés progressivement, avec les mêmes tirages et poids,
pour éviter un gros blocage à chaque génération. Ce travail n'est pas compté
comme du temps de conduite dans la vitesse effective.

Le décor est mis en cache ; l'interface réutilise ses éléments ; le réseau
visuel est rafraîchi lorsqu'il est visible. Le budget de calcul vise 8 ms par
rendu (réduit si l'affichage ralentit). Une voiture ou une création de modèle
reste une opération atomique : aucun engagement de 60 FPS sur toute machine ou
pour toute configuration maximale n'est possible.

## Tests

Node 18+ (sans installation supplémentaire) :

```sh
node --test 12-SIMvoiture/tests/*.test.mjs
```

Sur Node 26, pour voir individuellement les 53 tests :

```sh
node --test --test-isolation=none 12-SIMvoiture/tests/*.test.mjs
```

Le bundle TensorFlow réel est utilisé sur CPU ; un petit substitut arithmétique
de `p5.Vector` sert uniquement aux tests Node. Pour vérifier aussi le **vrai p5**,
ouvrir `12-SIMvoiture/tests/browser.html` via le même serveur, puis cliquer
**Exécuter les tests d’interface**. Ces tests utilisent une bibliothèque QA isolée
et testent les deux modes, pause, sélection, capteurs, JSON, rechargement et
l'absence de mutation en course, le test sur piste inédite et les contrôles de
vitesse/cache DOM et aperçu de la livrée : **28 vérifications**.
Ils ne garantissent pas une convergence.

Essai d'apprentissage réel facultatif, cinq générations, sans pilote préprogrammé :

```sh
node 12-SIMvoiture/tests/training-smoke.mjs 5
```

Banc comparatif reproductible (mêmes 48 cerveaux, même circuit, 14 400 mises à
jour, référence TensorFlow/murs complets contre calcul optimisé) :

```sh
node 12-SIMvoiture/tests/benchmark.mjs
```

Ces durées de calcul ne sont pas des FPS de navigateur ; les FPS affichés dans
l'application sont mesurés séparément.

Le compte rendu précis des sources, adaptations et limites se trouve dans
[`analyseSIMvoiture.md`](analyseSIMvoiture.md).

## Habillage course

Les bolides ont douze livrées, pneus, carrosserie, vitrages et phares, avec
un aperçu agrandi dans l'inspecteur. Or = sélection, menthe = leader.
Debug D : capteurs dorés/corail près d'un mur, vitesse verte, force orange,
prochain checkpoint menthe. Aucun de ces marquages ne pilote le cerveau.
L'inspiration de lecture vient des exemples de
[Zorgnac](https://github.com/zorgnac/SteeringBehavioursM2IA2_2025_2026) ;
les dessins sont originaux et la locomotion héritée du TP reste inchangée.

