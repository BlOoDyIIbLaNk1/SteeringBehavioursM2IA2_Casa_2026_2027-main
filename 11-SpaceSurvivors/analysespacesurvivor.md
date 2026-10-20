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

## Suivi du 19 octobre 2026 — progression et bilans

Échéance annoncée par l'enseignant : mercredi 21 octobre 2026 au soir.
Priorité choisie : statistiques de fin de secteur et bilan d'expédition.

### Réutilisation conservée

Les classes du monde gardent la chaîne `Vehicle → SpaceVehicle → entités`.
`Boss` et `ArenaGuard` restent des spécialisations de `Enemy`. Les fonctions
`seek`, `arrive`, `pursue`, `flee` et `separation`, leurs paramètres, `applyForce`
et l'intégration héritée ne changent pas. Le canon orbital et les sprites restent
ceux de la version publiée. Aucun réseau de neurones ni moteur physique ajouté.

### Ajouts propres au jeu

- Nouveau `ProgressStats.js` : service de comptabilité, sans position, dessin du
  monde ni force. Il conserve des compteurs du secteur courant et de la partie.
- `Projectile.updateProjectile()` observe les dégâts directs et de zone avant
  leur application. `Enemy.tickStatus()` observe les brûlures. La contribution des
  drones alliés entre dans les mêmes totaux que celle des armes du pilote.
- `Player.damage()` compte seulement la coque effectivement perdue après armure
  et bouclier; `Player.consumeLevel()` compte chaque niveau réellement obtenu.
  `AllyDrone.takeDamage()` compte une destruction une seule fois.
- `Game.collectDrops()` utilise le marqueur existant `dropDone` pour compter les
  éliminations et les boss. Les gardes invulnérables et les poursuivants encore
  vivants abandonnés à l'arrivée ne sont pas comptés comme détruits.
- `Game.completeSector()` fige le bilan et ignore les répétitions. `startWave()`
  remet uniquement les compteurs du secteur à zéro; `reset()` efface ceux de
  l'expédition. La victoire finale termine aussi le dernier bilan.
- `SectorMenu`, `sketch.js`, `index.html` et `style.css` présentent six mesures
  dans une grille ivoire/sauge : durée, éliminations, dégâts, coque perdue,
  niveaux gagnés, drones perdus. Le bilan final ajoute secteurs et gardiens.
  Les chiffres DOM sont construits une fois par bilan et les menus défilent
  lorsque la hauteur disponible est réduite.

### Difficultés et choix retenus

| Point | Solution et limite |
| --- | --- |
| Un tir de 100 sur une cible à 5 PV gonflerait les dégâts. | Compter `min(vie restante, dégâts)` : seuls 5 points sont ajoutés. |
| Les impacts perforants, gardes et nettoyages peuvent créer des doublons. | Réutiliser les événements d'impact et `dropDone`, exclure les gardes. |
| Une pause pourrait fausser la durée du secteur. | Compter uniquement les mises à jour actives; durée de simulation à 60 pas/s, pas chronomètre mural. |
| Un bilan pourrait évoluer pendant sa consultation ou compter deux secteurs. | Copier les compteurs et protéger la finalisation répétée. |
| L'écran final pourrait garder les chiffres de l'ancienne partie. | Nouvelle instance de statistiques et invalidation du cache lors de `reset()`. |

### Vérifications de cette évolution

Commande : `node --test 11-SpaceSurvivors/tests/*.test.mjs` — quatre fichiers
de tests réussis, aucun échec. Tests ajoutés pour les dégâts directs/de zone et
brûlures, la surpuissance, bouclier/invulnérabilité, niveaux, drones, exclusions
des gardes, boss, victoire finale, pause, temps d'animation, snapshots, changement
de secteur, remise à zéro, format de durée et cache du menu. Syntaxe JavaScript
contrôlée avec `node --check`.

Validation navigateur avec le vrai p5.js : bilan de secteur, continuation vers
le secteur 2, bilan de défaite, nouvelle expédition et écran de victoire (scène
isolée atteignant directement l'état final, pas une campagne complète jouée).
Les scènes de vérification
restent exclusivement dans `tests/browser-preview.*`.

Fichier créé : `ProgressStats.js`. Fichiers modifiés : `Game.js`, `Projectile.js`,
`Enemy.js`, `Player.js`, `AllyDrone.js`, `SectorMenu.js`, `sketch.js`, `index.html`,
`style.css`, `tests/combat.test.mjs`, `tests/presentation.test.mjs`,
`tests/browser-preview.html`, `tests/browser-preview.js`, `README.md` et ce suivi.
Les fichiers fournis `vehicle.js` restent inchangés. Empreinte de `1-Seek/vehicle.js` :
`319a07e0d5d08fdd54a79a07a28e2b1e58b62721b0482ea66197b5331985137b`.

## Suivi du 19 octobre 2026 — couronnes et ricochets persistants

Demande : de vraies armes qui tournent autour du pilote, avec un arsenal plus
spectaculaire à haut niveau et des ricochets qui restent pendant l'expédition.

### Fonctions du TP et ajouts distingués

- Les fonctions existantes `Steering.seek`, `arrive`, `pursue`, `flee`,
  `separation` et `bounceFromEdges` restent inchangées. `applyForce` et `update`
  restent hérités du `Vehicle` fourni, appelé une seule fois par mise à jour.
- `Steering.orbit` est un nouvel assemblage propre au jeu, pas une fonction
  prétendument fournie dans le TP. Il observe le rayon et la direction locale,
  choisit une cible devant l'arme et anticipe la vitesse du centre. Il appelle
  ensuite **la fonction `Steering.arrive` existante**. L'entité compose le résultat
  avec la séparation existante et limite la force totale à `maxForce`.
- La lame n'est pas placée à chaque image par sinus/cosinus du temps : sa position
  vient de la vitesse et de l'accélération. Les angles du constructeur servent
  uniquement à la disposition initiale des armes, comme pour une formation.
- Les ricochets réutilisent le steering de bord existant. Leur réflexion et la
  correction d'une pénétration dans le mur restent des réponses de collision,
  distinctes du pilotage. La caméra mobile définit les quatre murs visibles.

### Armes fonctionnelles

`OrbitalBlade extends Projectile extends SpaceVehicle extends Vehicle` garde la
collision, les dégâts, statistiques et effets de `Projectile`. Deux couronnes
tournent en sens opposés : les lames solaires à l'intérieur et l'essaim à
l'extérieur. Le niveau augmente nombre, rayon, vitesse et dégâts. Au niveau 8 :
six lames solaires, quatorze lames d'essaim et +60 % de dégâts d'évolution.

`RicochetProjectile extends Projectile` est permanent : vie, rebonds et impacts
ne l'épuisent pas. Le niveau ajoute un prisme (maximum huit) et augmente sa vitesse
de 6,75 à 12 pixels par pas; l'évolution ajoute aussi +60 % de dégâts.

`WeaponSystem.syncPersistent` complète uniquement les places manquantes et
actualise les armes déjà présentes. Aucun nouveau projectile permanent n'est
ajouté à chaque tir : maximum 28 pour ces trois équipements. `Game.startWave`
et l'animation de boss conservent ces armes; `reset` les efface. Le plafond des
projectiles temporaires les protège au lieu de supprimer les plus anciennes.

### Difficultés résolues

| Problème | Solution |
| --- | --- |
| Les lames tournaient brièvement autour d'elles-mêmes puis expiraient. | Couronnes permanentes pilotées par `arrive` et séparation, déplacement hérité. |
| Une arme permanente épuisait ses impacts ou ne pouvait plus retoucher un boss. | Délai de 24 pas par cible, impacts illimités. |
| Garder toutes les cibles touchées créerait une accumulation mémoire. | `WeakMap` des délais; aucun historique fort de victimes pour les armes permanentes. |
| Un rebond hors champ pouvait inverser la vitesse à répétition. | Corriger la pénétration et réfléchir seulement une composante sortante. |
| Des armes permanentes pourraient s'accumuler ou être effacées au changement de niveau. | Population plafonnée selon le niveau et conservation explicite entre secteurs. |

Fichiers créés : `OrbitalBlade.js`, `RicochetProjectile.js`. Fichiers modifiés :
`steering.js` (ajout d'orbit uniquement), `Projectile.js`, `WeaponSystem.js`,
`Game.js`, `UpgradeCatalog.js`, `index.html`, tests de combat et de steering,
scène navigateur `arsenal`, `README.md` et ce suivi.

Tests : `node --test 11-SpaceSurvivors/tests/*.test.mjs`. Exécution détaillée
également avec `node 11-SpaceSurvivors/tests/combat.test.mjs` (51 cas réussis) et
`node 11-SpaceSurvivors/tests/steering.test.mjs` (5 cas réussis). Vérifications :
forces près/loin/centre, identité du calcul avec `arrive`, sens de rotation,
1 800 pas d'orbite, 3 000 pas de ricochet, caméra éloignée, retouche à 24 pas,
héritage du TP, suivi du pilote mobile en vol libre, conservation entre secteurs
et plafond de 28 armes permanentes.
Validation dans le vrai p5.js : scénario `arsenal`, 20 lames à environ 114 et
180 pixels du pilote, huit ricochets persistants, 12 ennemis; environ 60,2 FPS,
simulation moyenne 0,40 ms et dessin 0,92 ms sur la fenêtre observée. Aucune
erreur JavaScript remontée. Ce relevé dépend de la machine et de cette scène.
Contrôle supplémentaire en `benchmark` : boss final phase 3, 101 ennemis,
deux cages, 19 armes équipées dont les 28 projectiles permanents au maximum.
Simulation moyenne 0,76 ms, dessin 1,60 ms, HUD 0,09 ms; aucun message d'erreur.
Le compteur instantané a varié pendant les captures (environ 41 à 65 FPS), donc
ce test ne constitue pas une garantie de 60 FPS constants dans cette scène.
Tous les fichiers `vehicle.js` fournis sont conservés sans modification.

## Suivi du 19 octobre 2026 — refuges neutres et debug des armes

Demande : les bulles bleues des traversées doivent protéger le pilote, bloquer
les ennemis, suspendre ses attaques et fournir un soin de 10 PV. Le debug doit
également couvrir les armes, puisqu'elles héritent de `Vehicle`.

### Règles ajoutées

- `ShelterBubble` garde son héritage de `SpaceVehicle`. Une charge de soin par
  bulle rend jusqu'à 10 PV au premier besoin à l'intérieur. Le soin ne dépasse
  jamais `maxHp` et la charge n'est pas consommée à pleine vie. Rester dedans
  ou faire des allers-retours ne redonne pas de soin; un nouveau secteur recrée
  ses propres refuges. La régénération passive est suspendue à l'intérieur.
- Les ennemis proches reçoivent **la force `Steering.flee` existante**, limitée
  par leur `maxForce`. Après leur locomotion, la paroi corrige une pénétration
  éventuelle et retire uniquement la vitesse dirigée vers l'intérieur. Cette
  collision est distincte du steering et gère aussi le cas du centre exact.
- `intersectsSegment` teste tout le trajet d'un projectile, pas seulement sa
  dernière position : même un tir rapide ne traverse pas la bulle. Les tirs
  temporaires amis et hostiles sont absorbés; les ricochets persistants venus
  de l'extérieur sont réfléchis sans être détruits.
- `Game.canAttack()` interdit les tirs du pilote et de ses drones au refuge.
  Les armes permanentes continuent leur steering et restent visibles mais
  n'infligent aucun dégât, même à l'extérieur. Les tirs déjà en vol sont aussi
  inoffensifs pendant cet état. Les brûlures consomment leur durée sans dégâts
  et les cages actives sont désactivées. Les attaques reprennent à la sortie.
- Les ailiers situés à l'intérieur sont protégés et ne tirent pas, même lorsque
  le pilote est déjà ressorti. Les tirs hostiles conservent une référence au jeu
  pour appliquer les mêmes collisions de refuge.

### Debug et fidélité au TP

La touche D et la case existante affichent désormais le canon orbital, tous les
projectiles amis (temporaires et permanents) et hostiles. Le renderer lit les
vitesses, la force effectivement enregistrée par `SpaceVehicle.update`, les
rayons de collision et les cibles/rayons de freinage mémorisés. Une ligne
pointillée et un repère matérialisent la cible. Un tir balistique sans force
ne reçoit pas de force inventée pour le dessin. Aucune fonction de steering
n'est recalculée dans le renderer. Les fonctions TP et fichiers `vehicle.js`
restent inchangés.

### Blocages et solutions

| Difficulté | Solution |
| --- | --- |
| La seule invulnérabilité laissait les ennemis traverser le refuge. | Fuite préventive + collision de paroi après le mouvement. |
| Un projectile rapide pourrait sauter la bulle entre deux images. | Intersection du segment parcouru avec le cercle, rayons inclus. |
| Les armes persistantes permettraient d'attaquer en restant à l'abri. | Autorisation d'attaque vérifiée avant toute collision offensive; mêmes règles pour les drones et brûlures. |
| Un ricochet arrêté par la paroi pouvait perdre sa vitesse avant réflexion. | Conserver la vitesse incidente, corriger la position, puis réfléchir la composante entrante. |
| Un soin exécuté à chaque image deviendrait illimité. | Charge unique par refuge, état explicite affiché sur la bulle. |

Fichiers modifiés : `ShelterBubble.js`, `Game.js`, `WeaponSystem.js`,
`AllyDrone.js`, `Projectile.js`, `Enemy.js`,
`Boss.js`, `EnemyProjectile.js`, `DebugRenderer.js`, `Hud.js`, `index.html`,
tests et documentation. Aucun nouveau type d'entité n'est nécessaire.

Tests : `node 11-SpaceSurvivors/tests/combat.test.mjs` — 57 cas réussis;
`node --test 11-SpaceSurvivors/tests/*.test.mjs` — quatre fichiers réussis.
Couverture ajoutée : soin unique, plafond et charge à pleine vie, centre exact,
forces proches/lointaines, exclusion physique, conservation de la vitesse
tangentielle, segment rapide/tangent, reflet permanent, désarmement, drones,
brûlures, reprise dehors, cages, absence de régénération continue, debug de tous
les tirs et absence de mutation de leur physique par le dessin. La scène
`tests/browser-preview.html?scenario=refuge` permet une entrée/sortie pilotée par
`arrive` avec bouton de test séparé du jeu normal.

Validation du vrai p5.js : le pilote passe de 60 à 70 PV puis reste à 70,
80 ennemis entourent le refuge avec zéro intrus, aucune cage active et aucun
tir temporaire ami émis (11 armes permanentes présentes mais inoffensives).
La case D affiche les vecteurs/cibles des armes et reste synchronisée avec la
légende. Ces réglages et boutons de contrôle appartiennent uniquement à la
page de test, pas à la partie normale.
La sortie a aussi été vérifiée : état `canAttack=true`, tirs temporaires émis
et aucun intrus dans les refuges. Pour permettre l'observation de l'aller-retour
au milieu de 80 ennemis, cette scène de test rend le pilote invulnérable hors du
refuge; cette immunité de test ne concerne jamais le jeu normal. La protection
et les dégâts normaux sont vérifiés par les tests automatisés.
Au retour : état protégé, `canAttack=false`, zéro intrus, uniquement les onze
armes permanentes inoffensives et vie toujours à 70 PV (pas de second soin).

## Publication — projet 11

Le dépôt présente désormais les projets 11 et 12 dans `README.md` et `PROJETS.md`.
Space Survivors conserve son entrée indépendante dans `11-SpaceSurvivors/` ;
SIMvoiture possède une autre adresse dans `12-SIMvoiture/`. Pas de page d'accueil
commune ni de modification des algorithmes pour cette publication. L'outil vidéo
annulé n'est pas inclus dans cette mise à jour du dépôt.
