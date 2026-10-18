# Prompts « Seedance » générés depuis les poses de caméra

> Dans la vidéo de référence, ces prompts sont rédigés par un modèle de langage qui **regarde le playblast**.
> Ici ils sont dérivés mécaniquement des poses de caméra : le contrat est identique, mais il ne peut pas dériver du plan.

## 1 · Le hublot de l'icebreaker

*Sortie de cabine vers la cathedrale de glace*

- durée : **10 s** · 30 i/s · 300 images
- poses de caméra : 8 · environnement : `fjord`
- correspondance : Concept 1 de la video : hublot d'avion -> skyline de Londres -> Big Ben.

```text
Plan cinématique, 10.0 s, 16:9, 1080p, 30 i/s.
Sujet : Le hublot de l'icebreaker — Sortie de cabine vers la cathedrale de glace.

MOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :
  0.0 → 1.6 s · resserrage de focale (40° → 38°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 0.12, 6.60) → (0.00, 0.06, 4.60) · visée (0.00, 0.00, -60.00) → (0.00, -0.02, -60.00)
  1.6 → 3.1 s · focale stable (38°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 0.06, 4.60) → (0.00, 0.02, 2.95) · visée (0.00, -0.02, -60.00) → (0.00, -0.06, -60.00)
  3.1 → 4.3 s · ouverture de focale (38° → 43°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 0.02, 2.95) → (0.00, -0.05, 1.05) · visée (0.00, -0.06, -60.00) → (0.00, -0.60, -46.00)
  4.3 → 5.6 s · travelling avant, ouverture de focale (43° → 46°) — amplitude faible, poussée continue puis freinage
      caméra (0.00, -0.05, 1.05) → (0.00, -0.15, -1.80) · visée (0.00, -0.60, -46.00) → (0.00, -1.80, -40.00)
  5.6 → 7.3 s · travelling avant, élévation de caméra (grue), ouverture de focale (46° → 50°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (0.00, -0.15, -1.80) → (0.60, 2.20, -13.00) · visée (0.00, -1.80, -40.00) → (-1.00, -3.00, -56.00)
  7.3 → 8.9 s · travelling avant, travelling latéral vers la droite, élévation de caméra (grue), tilt vers le haut, resserrage de focale (50° → 46°) — amplitude large, mouvement sinusoïdal, sans à-coup
      caméra (0.60, 2.20, -13.00) → (3.40, 4.40, -44.00) · visée (-1.00, -3.00, -56.00) → (-2.00, 6.00, -120.00)
  8.9 → 10.0 s · travelling avant, tilt vers le haut, resserrage de focale (46° → 42°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (3.40, 4.40, -44.00) → (6.00, 6.00, -76.00) · visée (-2.00, 6.00, -120.00) → (-4.00, 12.30, -140.00)

REPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :
  0.0 s · Cabine — On est encore a l'interieur. Le hublot cadre tout.
  2.9 s · Le hublot — La banquise apparait dans le cercle de verre.
  4.6 s · Passage — La camera traverse le hublot : la coque disparait du cadre.
  7.3 s · Deploiement — Le fjord gelé se deploie, champ de banquise et brume.
  10.0 s · Monument — La cathedrale de glace ferme le plan.

MATIÈRE / LUMIÈRE :
  heure bleue polaire : ciel nuit profond, horizon cyan pâle, aurores boréales vertes et violettes au fond, brume basse, glace vive très réfléchissante, neige fine continue.

CONTRAINTES DE COMPOSITION :
  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;
  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;
  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;
  — la première et la dernière image doivent être stables pendant au moins 4 images.

RÉFÉRENCE DE BLOCKING :
  assets/video/01-hublot-icebreaker-blocking.mp4 (passe blocking, 300 images)
  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.

CORRESPONDANCE : Concept 1 de la video : hublot d'avion -> skyline de Londres -> Big Ben.
```

## 2 · La fenetre du tunnel de glace

*Sortie par l'ouverture, pic dans les nuages, fondu au blanc*

- durée : **10 s** · 30 i/s · 300 images
- poses de caméra : 9 · environnement : `tundra`
- correspondance : Concept 2 de la video : fenetre -> montagne dans les nuages -> fondu au blanc.

```text
Plan cinématique, 10.0 s, 16:9, 1080p, 30 i/s.
Sujet : La fenetre du tunnel de glace — Sortie par l'ouverture, pic dans les nuages, fondu au blanc.

MOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :
  0.0 → 1.4 s · travelling avant, focale stable (44°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 0.35, 26.50) → (0.00, 0.42, 20.00) · visée (0.00, 0.45, -28.00) → (0.00, 0.70, -34.00)
  1.4 → 2.5 s · travelling avant, ouverture de focale (44° → 46°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 0.42, 20.00) → (0.08, 0.62, 9.60) · visée (0.00, 0.70, -34.00) → (0.00, 1.80, -46.00)
  2.5 → 3.4 s · travelling avant, tilt vers le haut, ouverture de focale (46° → 48°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (0.08, 0.62, 9.60) → (0.00, 1.15, -1.60) · visée (0.00, 1.80, -46.00) → (0.00, 5.00, -60.00)
  3.4 → 4.4 s · travelling avant, tilt vers le haut, resserrage de focale (48° → 47°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 1.15, -1.60) → (0.00, 2.10, -9.50) · visée (0.00, 5.00, -60.00) → (0.00, 18.00, -78.00)
  4.4 → 5.5 s · travelling avant, tilt vers le haut, resserrage de focale (47° → 46°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 2.10, -9.50) → (0.00, 3.00, -17.50) · visée (0.00, 18.00, -78.00) → (0.00, 23.00, -78.00)
  5.5 → 6.8 s · travelling avant, ouverture de focale (46° → 47°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 3.00, -17.50) → (0.50, 3.70, -25.50) · visée (0.00, 23.00, -78.00) → (0.00, 24.00, -78.00)
  6.8 → 8.2 s · travelling avant, tilt vers le bas, ouverture de focale (47° → 50°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (0.50, 3.70, -25.50) → (0.30, 2.40, -33.00) · visée (0.00, 24.00, -78.00) → (0.00, 8.00, -76.00)
  8.2 → 10.0 s · travelling avant, descente de caméra, tilt vers le bas, ouverture de focale (50° → 56°) — amplitude moyenne, départ lent, arrivée douce
      caméra (0.30, 2.40, -33.00) → (0.00, -12.50, -47.00) · visée (0.00, 8.00, -76.00) → (0.00, -18.00, -68.00)

REPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :
  0.0 s · Tunnel — On est a l'interieur du tunnel de glace, l'ouverture ferme le plan.
  2.5 s · Ouverture — L'ouverture ovale givree cadre le paysage.
  3.4 s · Passage — La camera traverse la fenetre : le tunnel sort du champ.
  5.5 s · Le pic — Le pic emerge de la mer de nuages, centre et facette.
  8.2 s · Plongee — La camera plonge dans les nuages.
  10.0 s · Blanc — Fondu total au blanc : transition vers la section suivante.

MATIÈRE / LUMIÈRE :
  ciel polaire très clair, blanc laiteux, contraste faible en fin de plan ; brume volumétrique dense ; cristaux de glace en suspension ; aucun objet chaud dans le cadre.

CONTRAINTES DE COMPOSITION :
  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;
  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;
  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;
  — la première et la dernière image doivent être stables pendant au moins 4 images.

RÉFÉRENCE DE BLOCKING :
  assets/video/02-fenetre-tunnel-blocking.mp4 (passe blocking, 300 images)
  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.

CORRESPONDANCE : Concept 2 de la video : fenetre -> montagne dans les nuages -> fondu au blanc.
```

## 3 · La relique de glace explosee

*Vue eclatee, animation produit*

- durée : **5 s** · 30 i/s · 150 images
- poses de caméra : 6 · environnement : `studio`
- correspondance : Concept 3 de la video : casque VR explose, orbite a 45 degres.

```text
Plan cinématique, 5.0 s, 16:9, 1080p, 30 i/s.
Sujet : La relique de glace explosee — Vue eclatee, animation produit.

MOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :
  0.0 → 1.0 s · focale stable (38°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 0.62, 4.25) → (0.00, 0.60, 4.20) · visée (0.00, 0.35, 0.00) → (0.00, 0.35, 0.00)
  1.0 → 1.6 s · travelling arrière, travelling latéral vers la droite, ouverture de focale (38° → 39°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 0.60, 4.20) → (0.60, 0.68, 4.35) · visée (0.00, 0.35, 0.00) → (0.00, 0.37, 0.00)
  1.6 → 3.5 s · travelling arrière, travelling latéral vers la droite, élévation de caméra (grue), ouverture de focale (39° → 40°) — amplitude large, mouvement sinusoïdal, sans à-coup
      caméra (0.60, 0.68, 4.35) → (5.00, 1.35, 5.00) · visée (0.00, 0.37, 0.00) → (0.00, 0.35, 0.00)
  3.5 → 4.6 s · travelling avant, travelling latéral vers la gauche, resserrage de focale (40° → 39°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (5.00, 1.35, 5.00) → (4.72, 1.26, 4.72) · visée (0.00, 0.35, 0.00) → (0.00, 0.33, 0.00)
  4.6 → 5.0 s · focale stable (40°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (4.72, 1.26, 4.72) → (4.90, 1.30, 4.90) · visée (0.00, 0.33, 0.00) → (0.00, 0.33, 0.00)

REPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :
  0.0 s · Intact — La relique flotte intacte au-dessus du socle.
  1.6 s · Ouverture — Les couches se desserrent, la lueur du noyau apparait.
  3.5 s · Eclate — Vue eclatee : chaque composant trouve sa place.
  4.6 s · Detail — Le noyau cristallin et les anneaux, en detail.

MATIÈRE / LUMIÈRE :
  fond sombre bleu nuit, éclairage produit latéral froid, reflets nets sur la glace, poussière de glace en suspension, halo lumineux derrière l’objet.

CONTRAINTES DE COMPOSITION :
  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;
  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;
  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;
  — la première et la dernière image doivent être stables pendant au moins 4 images.

RÉFÉRENCE DE BLOCKING :
  assets/video/03-relique-explosee-blocking.mp4 (passe blocking, 150 images)
  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.

CORRESPONDANCE : Concept 3 de la video : casque VR explose, orbite a 45 degres.
```

## 4 · Le gardien de glace

*Rotation de camera, blocs feature gauche / droite*

- durée : **12 s** · 30 i/s · 360 images
- poses de caméra : 8 · environnement : `fjord`
- correspondance : Concept 4 de la video : samourai, orbite, pan gauche puis droite.

```text
Plan cinématique, 12.0 s, 16:9, 1080p, 30 i/s.
Sujet : Le gardien de glace — Rotation de camera, blocs feature gauche / droite.

MOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :
  0.0 → 1.6 s · travelling avant, focale stable (36°) — amplitude faible, mouvement sinusoïdal, sans à-coup
      caméra (0.00, 3.30, 5.90) → (0.05, 3.42, 5.30) · visée (0.00, 3.78, 0.00) → (0.00, 3.86, 0.00)
  1.6 → 3.2 s · travelling arrière, travelling latéral vers la gauche, descente de caméra, panoramique vers la droite, tilt vers le bas, ouverture de focale (36° → 40°) — amplitude large, mouvement sinusoïdal, sans à-coup
      caméra (0.05, 3.42, 5.30) → (-3.40, 2.90, 8.35) · visée (0.00, 3.86, 0.00) → (0.30, 2.75, 0.00)
  3.2 → 4.4 s · travelling avant, travelling latéral vers la gauche, focale stable (40°) — amplitude large, mouvement sinusoïdal, sans à-coup
      caméra (-3.40, 2.90, 8.35) → (-8.75, 3.00, 3.20) · visée (0.30, 2.75, 0.00) → (0.05, 2.75, 0.00)
  4.4 → 5.4 s · travelling arrière, travelling latéral vers la droite, ouverture de focale (40° → 41°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (-8.75, 3.00, 3.20) → (-6.05, 3.05, 7.70) · visée (0.05, 2.75, 0.00) → (0.00, 2.70, 0.00)
  5.4 → 6.0 s · travelling arrière, travelling latéral vers la droite, ouverture de focale (41° → 43°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup
      caméra (-6.05, 3.05, 7.70) → (-2.40, 3.00, 10.90) · visée (0.00, 2.70, 0.00) → (0.00, 2.60, 0.00)
  6.0 → 9.0 s · travelling latéral vers la droite, panoramique vers la gauche, focale stable (43°) — amplitude moyenne, balayage rapide puis stabilisation
      caméra (-2.40, 3.00, 10.90) → (0.05, 2.95, 10.70) · visée (0.00, 2.60, 0.00) → (-3.10, 2.60, 0.00)
  9.0 → 12.0 s · panoramique vers la droite, focale stable (43°) — amplitude faible, balayage rapide puis stabilisation
      caméra (0.05, 2.95, 10.70) → (0.05, 3.05, 10.90) · visée (-3.10, 2.60, 0.00) → (3.10, 2.60, 0.00)

REPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :
  0.0 s · Face — Le gardien de glace, cadre serre, face camera.
  1.6 s · Degainage — La lame de glace sort du fourreau et s'illumine.
  3.2 s · Orbite — La camera tourne autour du gardien : cape et profondeur.
  6.0 s · Silhouette — La camera recule, la silhouette entiere se detache.
  9.0 s · Droite — Le gardien passe a droite : le tiers gauche reste libre.
  12.0 s · Gauche — Le gardien passe a gauche : le tiers droit reste libre.

MATIÈRE / LUMIÈRE :
  heure bleue polaire : ciel nuit profond, horizon cyan pâle, aurores boréales vertes et violettes au fond, brume basse, glace vive très réfléchissante, neige fine continue.

CONTRAINTES DE COMPOSITION :
  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;
  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;
  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;
  — la première et la dernière image doivent être stables pendant au moins 4 images.

RÉFÉRENCE DE BLOCKING :
  assets/video/04-gardien-glace-blocking.mp4 (passe blocking, 360 images)
  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.

CORRESPONDANCE : Concept 4 de la video : samourai, orbite, pan gauche puis droite.
```

## 5 · Survol du glacier

*Plaque ambiante plein ecran : drone au-dessus du champ de glaciers*

- durée : **6 s** · 30 i/s · 180 images
- poses de caméra : 4 · environnement : `fjord`
- correspondance : Plan plein ecran de deploiement (fin du concept 4 de la video) : respiration ambiante.

```text
Plan cinématique, 6.0 s, 16:9, 1080p, 30 i/s.
Sujet : Survol du glacier — Plaque ambiante plein ecran : drone au-dessus du champ de glaciers.

MOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :
  0.0 → 2.0 s · travelling avant, travelling latéral vers la droite, focale stable (44°) — amplitude faible, vitesse constante
      caméra (-80.00, 25.00, 120.00) → (-40.00, 28.00, 74.00) · visée (-10.00, -10.00, -400.00) → (0.00, -8.00, -400.00)
  2.0 → 4.0 s · travelling avant, travelling latéral vers la droite, ouverture de focale (44° → 45°) — amplitude moyenne, vitesse constante
      caméra (-40.00, 28.00, 74.00) → (0.00, 31.00, 28.00) · visée (0.00, -8.00, -400.00) → (0.00, -4.00, -400.00)
  4.0 → 6.0 s · travelling avant, travelling latéral vers la droite, ouverture de focale (45° → 46°) — amplitude moyenne, vitesse constante
      caméra (0.00, 31.00, 28.00) → (44.00, 34.00, -18.00) · visée (0.00, -4.00, -400.00) → (-10.00, 2.00, -400.00)

REPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :
  0.0 s · Survol — Le drone glisse au ras du champ de glaciers.
  4.0 s · Horizon — La banquise s'ouvre sur la chaine de montagnes.
  6.0 s · Immersion — L'aurore occupe le cadre, la neige referme le plan.

MATIÈRE / LUMIÈRE :
  heure bleue polaire : ciel nuit profond, horizon cyan pâle, aurores boréales vertes et violettes au fond, brume basse, glace vive très réfléchissante, neige fine continue.

CONTRAINTES DE COMPOSITION :
  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;
  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;
  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;
  — la première et la dernière image doivent être stables pendant au moins 4 images.

RÉFÉRENCE DE BLOCKING :
  assets/video/05-survol-glacier-blocking.mp4 (passe blocking, 180 images)
  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.

CORRESPONDANCE : Plan plein ecran de deploiement (fin du concept 4 de la video) : respiration ambiante.
```
