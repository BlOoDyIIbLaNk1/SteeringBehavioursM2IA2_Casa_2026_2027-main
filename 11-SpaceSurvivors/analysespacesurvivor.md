# Analyse de Space Survivors

Ce document décrit les éléments des travaux pratiques réutilisés dans le jeu, les systèmes ajoutés pour le rendre jouable et les problèmes rencontrés pendant leur intégration.

## Base empruntée aux TP

Le fichier fourni `../1-Seek/vehicle.js` reste la classe de référence. Il fournit l'état vectoriel `pos`, `vel`, `acc`, le calcul de `seek`, l'application d'une force avec `applyForce(force)` et la locomotion avec `update()` (accélération vers vitesse, limite de `maxSpeed`, déplacement et remise à zéro de l'accélération).

`SpaceVehicle` hérite de `Vehicle` et n'en recopie pas la locomotion. Il ajoute le rayon de collision et délègue le mouvement libre à `super.update()`. Les classes visibles du monde (joueur, ennemis, boss, projectiles, butins, particules et effets) héritent de cette base par `SpaceVehicle`. Le fond, les menus et le HUD sont de l'interface, pas des véhicules simulés.

Les comportements de steering sont regroupés dans `steering.js` et produisent des forces `p5.Vector`. `seek` appelle le `seek` du TP, avec des limites adaptées à chaque agent. `arrive` réduit la vitesse désirée près de la cible; `pursue` vise sa position anticipée; `separation` repousse les voisins proches; `flee` construit une vitesse désirée opposée à la menace; `bounceFromEdges` ramène les agents dans la zone utile. Les entités choisissent leurs objectifs et composent leurs forces via `applyForce`; `Vehicle.update()` assure ensuite le déplacement.

Ces comportements gardent les principes et l'architecture des TP, sans prétendre être tous des copies ligne par ligne : les rayons, anticipations, vitesses et forces sont réglés pour le jeu. En particulier, `flee` n'utilise pas le `-seek` fourni dans le TP, car cette inversion de force est incorrecte lorsque le véhicule possède déjà une vitesse. Les règles de rebond des projectiles et de rotation des lames sont des mécaniques d'armes, pas des comportements d'entité ajoutés au steering.

## Ajouts propres au jeu

- `Game.js` orchestre quinze secteurs alternés : impairs = vague puis boss, pairs = traversée vers une destination active immédiatement. Les compositions de vagues (patrouille, essaim, chasseurs) et la difficulté varient. Le contrôleur gère apparitions, collisions, butins, niveaux et états de partie.
- `Enemy.js` définit les archétypes chasseurs, encercleurs, groupes, chargeurs, élites et drones. Les groupes hostiles gardent une formation en V autour de leur leader; leurs déplacements utilisent `seek`, `pursue`, `arrive`, `separation` et les forces de bord.
- `Boss.js` ajoute trois variantes (Spectre aux premiers secteurs de combat, Bastion ensuite, Cœur du Néant au 15) avec maintien de distance/poursuite, phases et salves. Le boss apparaît après la vague, une seule fois par secteur de combat.
- `WeaponSystem.js`, `UpgradeCatalog.js` et `Projectile.js` ajoutent 19 armes, 7 bonus, des niveaux jusqu'à 8, dont la salve SWARM (20 missiles) et la cage de singularité, avec tirs guidés, ricochets, perforation, retour, ralentissement, brûlure et dégâts de zone. `OrbitalCannon.js` spécialise `SpaceVehicle` pour le canon de départ : sa cible d'orbite tourne autour du joueur, `arrive()` produit sa force, `applyForce()` et la locomotion TP l'appliquent. Sa rotation et ses tirs accélèrent avec le niveau; le ricochet passe progressivement de 6,75 à 12 pixels par mise à jour.
- `Pickup.js` utilise `seek` pour attirer les cristaux proches; ceux hors de portée restent sur place.
- `AllyDrone.js` ajoute des ailiers qui apparaissent aux niveaux pairs (jusqu'à quatre), se placent en formation en V par `arrive` et `separation`, ciblent et tirent sur les ennemis. Ils ont leur propre coque et peuvent être détruits.
- `SingularityField.js` représente un champ du monde qui hérite de `Vehicle`; l'anneau se contracte et applique une force `seek` limitée par `maxForce` aux ennemis visibles, dont l'objectif est suspendu pendant le confinement.
- `Particle.js`, `AttackEffect.js` et `EnemyProjectile.js` créent les effets dessinés des impacts, explosions et tirs hostiles.
- `AudioSystem.js` diffuse les deux pistes fournies avec Web Audio et produit les effets sonores. `Hud.js`, `UpgradeMenu.js` et `style.css` construisent l'interface.
- `sketch.js` demande 60 images/s à p5.js et expose la mesure réelle des FPS, y compris dans les menus. La cadence réelle reste dépendante du navigateur et de la machine.
- Les secteurs pairs sont des traversées sous la pression de renforts. `ShelterBubble.js` fournit deux zones de protection (départ et mi-chemin, dégâts annulés uniquement à l'intérieur) et `DestinationGate.js` est active immédiatement : arriver suffit, même si des ennemis vivent encore. Ces deux entités héritent de `SpaceVehicle`.
- `NavigationHud.js` est de l'interface DOM : projette la direction de la destination dans une zone visible du canvas, avec flèche orientée, distance et progression. Il n'applique aucune force et ne pilote pas le joueur.
- `SpaceBackdrop.js` calcule le cadrage du fond : proportions conservées, marge de couverture et décalages continus bornés. `sketch.js` efface le canvas avant le fond à chaque image; les étoiles restent en parallaxe. Aucun modulo ne remet la texture de nébuleuse à zéro.

Aucun réseau de neurones n'est utilisé. Le jeu garde son art, son thème, ses menus et son HUD.

## Blocages rencontrés et solutions

| Blocage | Cause | Solution retenue |
| --- | --- | --- |
| Le jeu ne se lançait pas depuis Live Server lorsqu'on ouvrait seulement le dossier du jeu. | `SpaceVehicle` doit hériter de la classe `Vehicle` du dossier frère `1-Seek`. | Charger directement `../1-Seek/vehicle.js` et ouvrir la racine du dépôt dans VS Code avant de lancer `11-SpaceSurvivors/index.html` avec Live Server. |
| Une première architecture de vaisseau risquait de dupliquer la physique du TP. | Une classe de jeu indépendante peut diverger de `applyForce` et `update` fournis. | Faire hériter `SpaceVehicle` de `Vehicle`, déléguer `applyForce` et appeler `super.update()` une fois. Ne pas modifier le fichier protégé `vehicle.js`. |
| Des variantes de steering du jeu diffèrent des fonctions d'origine des TP. | Le jeu exige des paramètres distincts et certains comportements du TP ne conviennent pas tels quels (notamment l'inversion naïve de `seek` pour fuir). | Garder les mêmes règles vectorielles et la même séparation décision/steering/locomotion, documenter les paramètres de jeu et conserver une fuite correcte `vitesse désirée - vitesse actuelle`. |
| Des ralentissements apparaissaient pendant les combats de boss. | Les impacts pouvaient recréer des animations à chaque mise à jour d'un tir perforant; beaucoup d'effets et de particules étaient dessinés simultanément. La recherche de cible des tirs guidés triait aussi toute la liste ennemie pour chaque projectile. | Créer au plus un effet par couple projectile/ennemi touché, limiter la quantité d'effets et de particules vivants, trouver la cible la plus proche en un seul parcours et comparer les portées au carré pour les dégâts de zone. Ces optimisations n'altèrent ni les sprites ni les règles de combat. |
| Le pilote et les ennemis étaient confinés au rectangle du canvas. | `SpaceVehicle.update()` appliquait un clamp de position après la locomotion héritée. | Retirer le clamp, déplacer la caméra avec le joueur et exprimer les forces de bord dans le repère visible de la caméra. Les ennemis apparaissent autour de ce cadre mobile. |
| Les nouvelles attaques pouvaient créer des pointes de charge. | Une grande salve ajoute beaucoup de projectiles à mettre à jour et dessiner simultanément. | Borner les files de tirs, garder les durées de vie finies, fixer la cadence nominale à 60 FPS et afficher la cadence réellement mesurée. Le maintien exact de 60 dépend encore des performances du navigateur et de l'appareil. |
| Le fond animé produisait parfois un saut et des bords étranges. | Le modulo du déplacement remettait brutalement la nébuleuse à zéro, le décalage pouvait dépasser la marge de l'image et le canvas n'était pas entièrement effacé. | Remplacer le modulo par des décalages continus bornés, conserver le ratio de l'image avec une marge suffisante et effacer le canvas à chaque image. Des tests vérifient continuité et couverture aux anciennes limites. |
| La destination était difficile à trouver et la traversée ressemblait à une autre arène. | Absence de flèche et condition d'arrivée verrouillée par l'élimination de tous les ennemis. | Alterner combat avec boss et trajet; balise accessible dès le début, flèche visible hors champ avec distance/progression, refuges au départ et à mi-chemin. |
| Les lasers disparaissaient après un long déplacement libre. | Leur sortie d'écran utilisait encore le rectangle d'origine (0, 0, width, height). | Tester la sortie contre les limites actuelles de la caméra, comme les ricochets. |
| Une transition de piste pouvait annuler une ancienne lecture après le démarrage de la nouvelle. | La promesse rejetée de l'ancienne piste réinitialisait l'état musical courant. | Identifier chaque demande de lecture et ignorer les annulations d'une demande devenue obsolète. |
| La mission de horde faisait baisser la cadence en situation chargée. | Les calculs de séparation et les collisions créaient des vecteurs temporaires et recalculaient des racines carrées pour chaque voisin. | Garder les mêmes forces, mais comparer les distances au carré et accumuler directement les composantes de séparation; vérifier aussi les portées de cible et de collision sans racine carrée. |

## Vérifications

Les tests automatisés de l'exemple se lancent depuis la racine du dépôt :

```sh
node --test 11-SpaceSurvivors/tests/*.test.mjs
```

Ils couvrent les comportements vectoriels, l'héritage de `Vehicle`, la locomotion, les équipements, projectiles, boss, pistes audio, missions alternées, continuité du fond et projection de la flèche. Les tests de steering chargent aussi `3-Arrival_correction/vehicle.js` pour comparer réellement `arrive` (même rayon) et `pursue` (même horizon) aux forces du TP. Le freinage sur une cible confondue est conservé. Les horizons, rayons et poids restent des paramètres de jeu; `flee` reste l'adaptation vectorielle expliquée ci-dessus. Aucun fichier fourni `vehicle.js` n'est modifié.

Validation du vrai p5.js dans le navigateur : flèche hors champ et à l'approche de la balise, protection dans la bulle, passage effectif du secteur 2 au secteur 3 en pilotant jusqu'à la destination, affichage du boss final et de sa barre de vie. Les scénarios de test sont isolés dans `tests/browser-preview.html` et `tests/browser-preview.js` ; la page normale reste `index.html`.

## Fichiers de la correction du fond et des missions

- Créés : `SpaceBackdrop.js` (cadrage continu du fond), `NavigationHud.js` (flèche DOM), `tests/presentation.test.mjs` (continuité, couverture et navigation).
- Modifiés pour le jeu : `Game.js`, `Hud.js`, `sketch.js`, `style.css`, `index.html`, `DestinationGate.js`, `Player.js`, `Projectile.js`, `steering.js` et `AudioSystem.js`.
- Tests complétés : `tests/combat.test.mjs`, `tests/steering.test.mjs`, `tests/music.test.mjs`, `tests/browser-preview.html` et `tests/browser-preview.js`.
- Documentation actualisée : `README.md` et le présent fichier.

## Arènes, pression ennemie, rendu et debug

- Les secteurs de combat commencent avec 18 ennemis ou plus; les traversées ont au moins 30 ennemis initiaux, 120 apparitions prévues et des renforts par groupes de quatre, jusqu'à environ 80 agents actifs (les formations peuvent ajouter quelques ailiers).
- `BossArena extends SpaceVehicle` crée une couronne de `ArenaGuard extends Enemy`. Chaque garde rejoint son ancrage par `arrive`, avec la force limitée et la locomotion héritée. Le garde est invulnérable et exclu de l'acquisition de cibles; la singularité ne le déplace pas. À la mort du boss, la couronne entière meurt et le confinement est levé. La réponse de collision du cercle est distincte de sa force préventive `seek`.
- `SpatialGrid.js` indexe les agents dans des cellules de 128 pixels. Les forces de séparation restent identiques à la version parcourant toute la population; seuls les candidats utiles sont interrogés. La grille est reconstruite après les mouvements pour les collisions de projectiles.
- `SpriteCache.js` prépare une fois les sprites réduits, les teintes des boss, les projectiles lumineux et trois anneaux de 768 pixels. Les anneaux de singularité/arène ont plusieurs bandes, segments lumineux et repères; leur animation utilise rotation, échelle et alpha. Le grand `shadowBlur` et les nombreux traits lumineux ne sont plus recalculés à chaque image.
- Les traînées utilisent un chemin par projectile; les couleurs des particules sont analysées une seule fois; les impacts sont limités à 60 et les particules à 360. Le rendu hors champ est écarté. Le HUD ne reconstruit les états de l'arsenal qu'après un changement d'équipement.
- Mesure dans le vrai p5.js : scénario `benchmark`, 101 ennemis avec boss, cage active et les 19 armes équipées, environ 59,9 FPS; simulation moyenne 0,79 ms, dessin 1,35 ms, HUD 0,14 ms et fond 0,49 ms sur la fenêtre mesurée. Cette mesure décrit la machine et la scène testées, pas une garantie pour tout matériel.
- Second contrôle : boss en phase 3, 90 ennemis et deux cages actives, cadence observée autour de 60 FPS; simulation moyenne 0,75 ms, dessin 1,54 ms et HUD 0,11 ms. L'animation de destruction a été déclenchée et observée dans le navigateur, suivie de son menu puis du départ effectif vers le secteur 2.
- `WeaponSystem.interval()` réduit les intervalles d'environ 18 %; les ailiers tirent toutes les 34 mises à jour. La barre d'XP occupe presque toute la largeur du bas du canvas.
- `SectorMenu.js` suspend le jeu après un niveau et présente le prochain objectif; clic ou Entrée confirme le départ. La musique et la navigation suivent cet état.
- D et la case de debug sont synchronisés. `SpaceVehicle.update()` copie l'accélération composée avant `super.update()` uniquement en debug. `DebugRenderer.js` lit vitesse, force enregistrée et rayons de collision/freinage/perception. Il ne recalcule pas les forces. Les répétitions de touche et les champs de saisie sont ignorés. `applyForce` reste directement hérité du TP.
- `BossDeathEffect extends SpaceVehicle` joue pendant 105 mises à jour : vaisseau qui s'efface, noyau lumineux, deux ondes et 24 fragments `Particle`. Le combat s'arrête pendant cette animation, la pause reste possible et le menu n'arrive qu'à son terme. La victoire finale attend aussi cette animation.

Fichiers créés : `SpatialGrid.js`, `SpriteCache.js`, `ArenaGuard.js`, `BossArena.js`, `BossDeathEffect.js`, `DebugRenderer.js` et `SectorMenu.js`. Modifications associées : `Game.js`, `SpaceVehicle.js`, `Player.js`, `Enemy.js`, `Boss.js`, `AllyDrone.js`, `Projectile.js`, `EnemyProjectile.js`, `Particle.js`, `AttackEffect.js`, `SingularityField.js`, `WeaponSystem.js`, `AudioSystem.js`, `Hud.js`, `NavigationHud.js`, `sketch.js`, `index.html`, `style.css`, tests et documentation. Aucun fichier fourni `vehicle.js` n'est modifié.
