# Space Survivors

Premier prototype de jeu de survie inspiré de Vampire Survivors, avec des vaisseaux spatiaux et des steering behaviors.

## Commande

Ouvrir `index.html` dans un navigateur ou servir le dépôt avec un serveur statique.

Dans VS Code, ouvrir la racine du dépôt puis utiliser **Open with Live Server**
sur `11-SpaceSurvivors/index.html`. La base Vehicle est chargée directement depuis
`1-Seek/vehicle.js` : ce dossier frère doit être accessible au serveur.
Cliquer sur **Décoller** active aussi Web Audio. Échap suspend et reprend la partie,
M coupe le son. Le bouton de fin de partie lance une nouvelle expédition.

## Musique

Les deux fichiers du dossier `Music` sont joués en boucle : `normal.mp3` pendant
les vagues, `bossfight.mp3` tant qu'un boss est vivant. Le retour aux vagues reprend
la piste normale. La pause, le choix de niveau et la fin de partie suspendent la
lecture ; une nouvelle expédition remet les deux pistes au début. Le bouton son
et M contrôlent les musiques ainsi que les effets Web Audio. La lecture commence
après le premier clic, conformément aux restrictions audio du navigateur.

## Campagne et évolutions

La campagne compte quinze secteurs qui alternent deux objectifs. Aux secteurs
impairs, éliminer la vague (patrouilles, formations ou chasseurs), puis son boss.
Aux secteurs pairs, suivre la flèche et atteindre la balise, active dès le début,
pendant l'arrivée de renforts ennemis. Il n'est pas nécessaire de tuer toute la
horde pour terminer une traversée. Deux bulles, au départ et à mi-chemin, annulent
les dégâts lorsque le pilote est dedans.

La flèche reste dans l'écran, tourne vers la destination et affiche distance et
progression. Le secteur 15 se termine par le boss final « Cœur du Néant ».
Les boss changent de phase à 65 % et 30 % de vie. Le décor conserve ses proportions,
dérive continuellement sans remise à zéro et couvre toujours le canvas.

Les traversées commencent avec au moins 30 ennemis et disposent d'au moins 120
apparitions au total, avec des renforts progressifs et environ 80 agents actifs.
Pendant chaque boss, une formation de gardes liés ferme une arène circulaire :
les gardes sont invulnérables et disparaissent lorsque le boss meurt. Le joueur et
le boss sont confinés à l'intérieur; les gardes tiennent leurs places par `arrive`.
La mort du boss joue une animation de 105 pas (environ 1,75 seconde à 60 FPS), puis
le menu de fin de secteur attend un clic sur « Vers le niveau suivant » ou Entrée.

Les intervalles de tir sont réduits d'environ 18 %. La barre d'XP occupe toute la
largeur du bas de l'écran. D ou la case « DEBUG · D » affiche vitesse, force
composée, collision et cercles de freinage/perception. Ce diagnostic lit les états
enregistrés sans appliquer de force et ignore les saisies dans les contrôles.

Les sprites et leurs teintes, les halos et les anneaux détaillés sont préparés une
seule fois dans `SpriteCache.js`. `SpatialGrid.js` limite les recherches de voisins
et de collisions aux cellules utiles; les particules sont bornées et le rendu
hors champ est écarté. Les règles de steering et la locomotion restent celles de
l'architecture TP. Les scénarios `benchmark`, `transition` et `death` de la page
de validation permettent de vérifier respectivement charge, menu et explosion.

Au niveau 8, les projectiles du laser, des missiles, des ricochets, des lames,
du pulse et de la nova gagnent 60 % de dégâts et traversent trois ennemis distincts.
Le canon de départ est un véhicule orbital piloté par `arrive` : il tourne autour
du joueur, tire depuis sa propre position et accélère sa rotation ainsi que ses
projectiles à chaque niveau. Le laser évolué tire trois faisceaux. La vitesse du
prisme ricochet progresse de 6,75 à 12 pixels par mise à jour; son évolution
dispose aussi de douze rebonds.
Les équipements maximisés sont retirés des choix suivants. Si tout est au maximum,
coque et bouclier proposent une restauration sans dépasser le niveau 8.
La marque d'évolution orbitale reste préparatoire : cette arme émet
encore des lames temporaires et n'est pas un véritable drone permanent.

## Tests

Depuis la racine du dépôt :

```sh
node --test 11-SpaceSurvivors/tests/*.test.mjs
```

Les tests chargent les vrais fichiers applicatifs et couvrent les améliorations,
les tirs évolués, les impacts perforants, les phases du boss et le cycle de partie.
La locomotion reste dans `SpaceVehicle`, avec forces appliquées par `applyForce`.

## Réutilisation des TP

`SpaceVehicle extends Vehicle` charge directement la classe fournie dans
`../1-Seek/vehicle.js`, sans la recopier ni la modifier. Le joueur, les ennemis,
les boss, les projectiles, les cristaux et les effets héritent tous de cette base.
`applyForce` est hérité tel quel ; `SpaceVehicle.update()` appelle `super.update()`
une seule fois, en espace libre avec caméra de suivi.

`Steering.seek` délègue au `seek` du TP. Les autres unités de `steering.js`
reprennent les principes des TP avec les paramètres du jeu :

| Unité | Référence du TP | Adaptation conservée |
| --- | --- | --- |
| seek | `1-Seek/vehicle.js` | Limites variables pour les projectiles, force nulle à distance nulle |
| arrive | `3-Arrival_correction/vehicle.js` | Rayon de freinage propre à chaque usage |
| pursue | `3-Arrival_correction/vehicle.js` | Position future = position + vitesse × anticipation ; anticipation réglable |
| séparation | `5-3-PathFollowingComplex/vehicle.js` | Même répulsion locale pondérée par distance ; rayon réglable |
| fuite | Reynolds, vitesse désirée opposée | Formule `desired - velocity` conservée ; le `-seek` historique n'est pas utilisé |

Les algorithmes ne sont donc pas tous des copies ligne par ligne : les règles et
paramètres du jeu restent ceux d'avant cette refactorisation. La sélection des
cibles reste dans les entités/contrôleurs ; les forces sont composées avant
l'intégration héritée. Les rebonds et rotations de lames restent les règles
spécifiques des armes existantes. Aucun sprite, menu, effet, musique, statistique
ou rythme d'apparition n'a été modifié lors du raccordement à Vehicle.

La page `tests/browser-preview.html` permet une validation reproductible avec
les vrais scripts et p5.js : cartes de niveau par défaut, `?scenario=pause` pour
la pause, `?scenario=combat` pour toutes les armes actives. La vie très élevée de
ces scénarios est réservée aux tests ; elle n'affecte pas le jeu normal.

## Arsenal et menus

26 équipements : 19 armes et 7 bonus. Les 17 ajouts sont :

- canon rail, éventail stellaire, cryolance, comète ardente, torpille à fusion ;
- croissant retour, nuée guidée, double hélios, grêle orbitale, disrupteur ionique ;
- collecteur gravitationnel, réacteur surcadencé, blindage composite,
  nanoréparation, amplificateur.
- SWARM, une salve de vingt missiles qui traverse le champ, et la cage de
  singularité, qui attire les ennemis visibles dans un anneau contractant.

Chaque acquisition répétée augmente le niveau jusqu'à 8. Les bonus modifient
réellement la collecte, la vitesse, la réduction des dégâts, la réparation ou les
dégâts globaux. Les effets des armes comprennent perforation, ralentissement,
brûlure, retour guidé et explosion de zone. Le HUD affiche les équipements acquis,
leurs icônes et leurs niveaux. Les cartes de choix sont des boutons accessibles,
avec raccourcis 1, 2, 3 et mise en page adaptée aux petits écrans.

Les cristaux d'XP persistent au sol. À 190 pixels ou moins du joueur, ils sont
attirés par `seek`, avec une vitesse maximale de 14 et une force maximale de 0,9.
Chaque niveau du collecteur ajoute 45 pixels à la perception. Hors portée, une
force de freinage les arrête ; aucune poursuite à travers toute la carte.

Fichiers d'interface : `UpgradeMenu.js`, `Hud.js`, `style.css`, `index.html` et
`sketch.js`. Catalogue : `UpgradeCatalog.js`. Combat et progression :
`WeaponSystem.js`, `Player.js`, `Projectile.js`, `Enemy.js`, `Boss.js`,
`EnemyProjectile.js`, `Pickup.js` et `Game.js`.

## Contenu actuel

- déplacement libre du joueur par `arrive` vers la souris avec caméra de suivi ;
- poursuite prédictive des ennemis par `pursue` ;
- séparation locale des agents ;
- quinze secteurs alternant vague + boss et traversée guidée vers une balise ;
- expérience et montée de niveau ;
- choix d’amélioration ;
- laser, missile chercheur, épée orbitante et projectile ricochet ;
- bouclier et points de vie ;
- aucune intelligence neuronale.
- caméra centrée sur le pilote pour voler librement hors des limites de l'ancien écran;
- drones alliés qui apparaissent aux niveaux pairs, suivent une formation en V,
  tirent automatiquement et peuvent être détruits;
- cadence cible fixée à 60 FPS et compteur FPS visible en jeu.
