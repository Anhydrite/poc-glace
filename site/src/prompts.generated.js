/* Fichier généré par render/shot-list.mjs — ne pas éditer à la main. */
export const PROMPTS = {
  "1": {
    "id": "concept-1",
    "title": "Le hublot de l'icebreaker",
    "subtitle": "Sortie de cabine vers la cathedrale de glace",
    "reference": "Concept 1 de la video : hublot d'avion -> skyline de Londres -> Big Ben.",
    "slug": "01-hublot-icebreaker",
    "duration": 10,
    "fps": 30,
    "poses": 8,
    "frames": 300,
    "env": "fjord",
    "whiteout": null,
    "beats": [
      {
        "t": 0,
        "label": "Cabine",
        "text": "On est encore a l'interieur. Le hublot cadre tout."
      },
      {
        "t": 2.9,
        "label": "Le hublot",
        "text": "La banquise apparait dans le cercle de verre."
      },
      {
        "t": 4.6,
        "label": "Passage",
        "text": "La camera traverse le hublot : la coque disparait du cadre."
      },
      {
        "t": 7.3,
        "label": "Deploiement",
        "text": "Le fjord gelé se deploie, champ de banquise et brume."
      },
      {
        "t": 10,
        "label": "Monument",
        "text": "La cathedrale de glace ferme le plan."
      }
    ],
    "camera": [
      {
        "t": 0,
        "pos": [
          0,
          0.12,
          6.6
        ],
        "target": [
          0,
          0,
          -60
        ],
        "fov": 40,
        "ease": "inOutSine"
      },
      {
        "t": 1.6,
        "pos": [
          0,
          0.06,
          4.6
        ],
        "target": [
          0,
          -0.02,
          -60
        ],
        "fov": 38,
        "ease": "inOutSine"
      },
      {
        "t": 3.1,
        "pos": [
          0,
          0.02,
          2.95
        ],
        "target": [
          0,
          -0.06,
          -60
        ],
        "fov": 38,
        "ease": "inOutSine"
      },
      {
        "t": 4.3,
        "pos": [
          0,
          -0.05,
          1.05
        ],
        "target": [
          0,
          -0.6,
          -46
        ],
        "fov": 43,
        "ease": "dollyOut"
      },
      {
        "t": 5.6,
        "pos": [
          0,
          -0.15,
          -1.8
        ],
        "target": [
          0,
          -1.8,
          -40
        ],
        "fov": 46,
        "ease": "inOutSine"
      },
      {
        "t": 7.3,
        "pos": [
          0.6,
          2.2,
          -13
        ],
        "target": [
          -1,
          -3,
          -56
        ],
        "fov": 50,
        "ease": "inOutSine"
      },
      {
        "t": 8.9,
        "pos": [
          3.4,
          4.4,
          -44
        ],
        "target": [
          -2,
          6,
          -120
        ],
        "fov": 46,
        "ease": "inOutSine"
      },
      {
        "t": 10,
        "pos": [
          6,
          6,
          -76
        ],
        "target": [
          -4,
          12.3,
          -140
        ],
        "fov": 42,
        "ease": "outCubic"
      }
    ],
    "prompt": "Plan cinématique, 10.0 s, 16:9, 1080p, 30 i/s.\nSujet : Le hublot de l'icebreaker — Sortie de cabine vers la cathedrale de glace.\n\nMOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :\n  0.0 → 1.6 s · resserrage de focale (40° → 38°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 0.12, 6.60) → (0.00, 0.06, 4.60) · visée (0.00, 0.00, -60.00) → (0.00, -0.02, -60.00)\n  1.6 → 3.1 s · focale stable (38°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 0.06, 4.60) → (0.00, 0.02, 2.95) · visée (0.00, -0.02, -60.00) → (0.00, -0.06, -60.00)\n  3.1 → 4.3 s · ouverture de focale (38° → 43°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 0.02, 2.95) → (0.00, -0.05, 1.05) · visée (0.00, -0.06, -60.00) → (0.00, -0.60, -46.00)\n  4.3 → 5.6 s · travelling avant, ouverture de focale (43° → 46°) — amplitude faible, poussée continue puis freinage\n      caméra (0.00, -0.05, 1.05) → (0.00, -0.15, -1.80) · visée (0.00, -0.60, -46.00) → (0.00, -1.80, -40.00)\n  5.6 → 7.3 s · travelling avant, élévation de caméra (grue), ouverture de focale (46° → 50°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, -0.15, -1.80) → (0.60, 2.20, -13.00) · visée (0.00, -1.80, -40.00) → (-1.00, -3.00, -56.00)\n  7.3 → 8.9 s · travelling avant, travelling latéral vers la droite, élévation de caméra (grue), tilt vers le haut, resserrage de focale (50° → 46°) — amplitude large, mouvement sinusoïdal, sans à-coup\n      caméra (0.60, 2.20, -13.00) → (3.40, 4.40, -44.00) · visée (-1.00, -3.00, -56.00) → (-2.00, 6.00, -120.00)\n  8.9 → 10.0 s · travelling avant, tilt vers le haut, resserrage de focale (46° → 42°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (3.40, 4.40, -44.00) → (6.00, 6.00, -76.00) · visée (-2.00, 6.00, -120.00) → (-4.00, 12.30, -140.00)\n\nREPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :\n  0.0 s · Cabine — On est encore a l'interieur. Le hublot cadre tout.\n  2.9 s · Le hublot — La banquise apparait dans le cercle de verre.\n  4.6 s · Passage — La camera traverse le hublot : la coque disparait du cadre.\n  7.3 s · Deploiement — Le fjord gelé se deploie, champ de banquise et brume.\n  10.0 s · Monument — La cathedrale de glace ferme le plan.\n\nMATIÈRE / LUMIÈRE :\n  heure bleue polaire : ciel nuit profond, horizon cyan pâle, aurores boréales vertes et violettes au fond, brume basse, glace vive très réfléchissante, neige fine continue.\n\nCONTRAINTES DE COMPOSITION :\n  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;\n  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;\n  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;\n  — la première et la dernière image doivent être stables pendant au moins 4 images.\n\nRÉFÉRENCE DE BLOCKING :\n  assets/video/01-hublot-icebreaker-blocking.mp4 (passe blocking, 300 images)\n  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.\n\nCORRESPONDANCE : Concept 1 de la video : hublot d'avion -> skyline de Londres -> Big Ben."
  },
  "2": {
    "id": "concept-2",
    "title": "La fenetre du tunnel de glace",
    "subtitle": "Sortie par l'ouverture, pic dans les nuages, fondu au blanc",
    "reference": "Concept 2 de la video : fenetre -> montagne dans les nuages -> fondu au blanc.",
    "slug": "02-fenetre-tunnel",
    "duration": 10,
    "fps": 30,
    "poses": 9,
    "frames": 300,
    "env": "tundra",
    "whiteout": [
      8.2,
      9
    ],
    "beats": [
      {
        "t": 0,
        "label": "Tunnel",
        "text": "On est a l'interieur du tunnel de glace, l'ouverture ferme le plan."
      },
      {
        "t": 2.5,
        "label": "Ouverture",
        "text": "L'ouverture ovale givree cadre le paysage."
      },
      {
        "t": 3.4,
        "label": "Passage",
        "text": "La camera traverse la fenetre : le tunnel sort du champ."
      },
      {
        "t": 5.5,
        "label": "Le pic",
        "text": "Le pic emerge de la mer de nuages, centre et facette."
      },
      {
        "t": 8.2,
        "label": "Plongee",
        "text": "La camera plonge dans les nuages."
      },
      {
        "t": 10,
        "label": "Blanc",
        "text": "Fondu total au blanc : transition vers la section suivante."
      }
    ],
    "camera": [
      {
        "t": 0,
        "pos": [
          0,
          0.35,
          26.5
        ],
        "target": [
          0,
          0.45,
          -28
        ],
        "fov": 44,
        "ease": "inOutSine"
      },
      {
        "t": 1.4,
        "pos": [
          0,
          0.42,
          20
        ],
        "target": [
          0,
          0.7,
          -34
        ],
        "fov": 44,
        "ease": "inOutSine"
      },
      {
        "t": 2.5,
        "pos": [
          0.08,
          0.62,
          9.6
        ],
        "target": [
          0,
          1.8,
          -46
        ],
        "fov": 46,
        "ease": "inOutSine"
      },
      {
        "t": 3.4,
        "pos": [
          0,
          1.15,
          -1.6
        ],
        "target": [
          0,
          5,
          -60
        ],
        "fov": 48,
        "ease": "inOutSine"
      },
      {
        "t": 4.4,
        "pos": [
          0,
          2.1,
          -9.5
        ],
        "target": [
          0,
          18,
          -78
        ],
        "fov": 47,
        "ease": "inOutSine"
      },
      {
        "t": 5.5,
        "pos": [
          0,
          3,
          -17.5
        ],
        "target": [
          0,
          23,
          -78
        ],
        "fov": 46,
        "ease": "inOutSine"
      },
      {
        "t": 6.8,
        "pos": [
          0.5,
          3.7,
          -25.5
        ],
        "target": [
          0,
          24,
          -78
        ],
        "fov": 47,
        "ease": "inOutSine"
      },
      {
        "t": 8.2,
        "pos": [
          0.3,
          2.4,
          -33
        ],
        "target": [
          0,
          8,
          -76
        ],
        "fov": 50,
        "ease": "inOutQuad"
      },
      {
        "t": 10,
        "pos": [
          0,
          -12.5,
          -47
        ],
        "target": [
          0,
          -18,
          -68
        ],
        "fov": 56,
        "ease": "inOutQuad"
      }
    ],
    "prompt": "Plan cinématique, 10.0 s, 16:9, 1080p, 30 i/s.\nSujet : La fenetre du tunnel de glace — Sortie par l'ouverture, pic dans les nuages, fondu au blanc.\n\nMOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :\n  0.0 → 1.4 s · travelling avant, focale stable (44°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 0.35, 26.50) → (0.00, 0.42, 20.00) · visée (0.00, 0.45, -28.00) → (0.00, 0.70, -34.00)\n  1.4 → 2.5 s · travelling avant, ouverture de focale (44° → 46°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 0.42, 20.00) → (0.08, 0.62, 9.60) · visée (0.00, 0.70, -34.00) → (0.00, 1.80, -46.00)\n  2.5 → 3.4 s · travelling avant, tilt vers le haut, ouverture de focale (46° → 48°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (0.08, 0.62, 9.60) → (0.00, 1.15, -1.60) · visée (0.00, 1.80, -46.00) → (0.00, 5.00, -60.00)\n  3.4 → 4.4 s · travelling avant, tilt vers le haut, resserrage de focale (48° → 47°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 1.15, -1.60) → (0.00, 2.10, -9.50) · visée (0.00, 5.00, -60.00) → (0.00, 18.00, -78.00)\n  4.4 → 5.5 s · travelling avant, tilt vers le haut, resserrage de focale (47° → 46°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 2.10, -9.50) → (0.00, 3.00, -17.50) · visée (0.00, 18.00, -78.00) → (0.00, 23.00, -78.00)\n  5.5 → 6.8 s · travelling avant, ouverture de focale (46° → 47°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 3.00, -17.50) → (0.50, 3.70, -25.50) · visée (0.00, 23.00, -78.00) → (0.00, 24.00, -78.00)\n  6.8 → 8.2 s · travelling avant, tilt vers le bas, ouverture de focale (47° → 50°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (0.50, 3.70, -25.50) → (0.30, 2.40, -33.00) · visée (0.00, 24.00, -78.00) → (0.00, 8.00, -76.00)\n  8.2 → 10.0 s · travelling avant, descente de caméra, tilt vers le bas, ouverture de focale (50° → 56°) — amplitude moyenne, départ lent, arrivée douce\n      caméra (0.30, 2.40, -33.00) → (0.00, -12.50, -47.00) · visée (0.00, 8.00, -76.00) → (0.00, -18.00, -68.00)\n\nREPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :\n  0.0 s · Tunnel — On est a l'interieur du tunnel de glace, l'ouverture ferme le plan.\n  2.5 s · Ouverture — L'ouverture ovale givree cadre le paysage.\n  3.4 s · Passage — La camera traverse la fenetre : le tunnel sort du champ.\n  5.5 s · Le pic — Le pic emerge de la mer de nuages, centre et facette.\n  8.2 s · Plongee — La camera plonge dans les nuages.\n  10.0 s · Blanc — Fondu total au blanc : transition vers la section suivante.\n\nMATIÈRE / LUMIÈRE :\n  ciel polaire très clair, blanc laiteux, contraste faible en fin de plan ; brume volumétrique dense ; cristaux de glace en suspension ; aucun objet chaud dans le cadre.\n\nCONTRAINTES DE COMPOSITION :\n  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;\n  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;\n  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;\n  — la première et la dernière image doivent être stables pendant au moins 4 images.\n\nRÉFÉRENCE DE BLOCKING :\n  assets/video/02-fenetre-tunnel-blocking.mp4 (passe blocking, 300 images)\n  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.\n\nCORRESPONDANCE : Concept 2 de la video : fenetre -> montagne dans les nuages -> fondu au blanc."
  },
  "3": {
    "id": "concept-3",
    "title": "La relique de glace explosee",
    "subtitle": "Vue eclatee, animation produit",
    "reference": "Concept 3 de la video : casque VR explose, orbite a 45 degres.",
    "slug": "03-relique-explosee",
    "duration": 5,
    "fps": 30,
    "poses": 6,
    "frames": 150,
    "env": "studio",
    "whiteout": null,
    "beats": [
      {
        "t": 0,
        "label": "Intact",
        "text": "La relique flotte intacte au-dessus du socle."
      },
      {
        "t": 1.6,
        "label": "Ouverture",
        "text": "Les couches se desserrent, la lueur du noyau apparait."
      },
      {
        "t": 3.5,
        "label": "Eclate",
        "text": "Vue eclatee : chaque composant trouve sa place."
      },
      {
        "t": 4.6,
        "label": "Detail",
        "text": "Le noyau cristallin et les anneaux, en detail."
      }
    ],
    "camera": [
      {
        "t": 0,
        "pos": [
          0,
          0.62,
          4.25
        ],
        "target": [
          0,
          0.35,
          0
        ],
        "fov": 38,
        "ease": "inOutSine"
      },
      {
        "t": 1,
        "pos": [
          0,
          0.6,
          4.2
        ],
        "target": [
          0,
          0.35,
          0
        ],
        "fov": 38,
        "ease": "inOutSine"
      },
      {
        "t": 1.6,
        "pos": [
          0.6,
          0.68,
          4.35
        ],
        "target": [
          0,
          0.37,
          0
        ],
        "fov": 38.5,
        "ease": "inOutSine"
      },
      {
        "t": 3.5,
        "pos": [
          5,
          1.35,
          5
        ],
        "target": [
          0,
          0.35,
          0
        ],
        "fov": 40,
        "ease": "inOutSine"
      },
      {
        "t": 4.6,
        "pos": [
          4.72,
          1.26,
          4.72
        ],
        "target": [
          0,
          0.33,
          0
        ],
        "fov": 39.2,
        "ease": "inOutSine"
      },
      {
        "t": 5,
        "pos": [
          4.9,
          1.3,
          4.9
        ],
        "target": [
          0,
          0.33,
          0
        ],
        "fov": 39.6,
        "ease": "outCubic"
      }
    ],
    "prompt": "Plan cinématique, 5.0 s, 16:9, 1080p, 30 i/s.\nSujet : La relique de glace explosee — Vue eclatee, animation produit.\n\nMOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :\n  0.0 → 1.0 s · focale stable (38°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 0.62, 4.25) → (0.00, 0.60, 4.20) · visée (0.00, 0.35, 0.00) → (0.00, 0.35, 0.00)\n  1.0 → 1.6 s · travelling arrière, travelling latéral vers la droite, ouverture de focale (38° → 39°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 0.60, 4.20) → (0.60, 0.68, 4.35) · visée (0.00, 0.35, 0.00) → (0.00, 0.37, 0.00)\n  1.6 → 3.5 s · travelling arrière, travelling latéral vers la droite, élévation de caméra (grue), ouverture de focale (39° → 40°) — amplitude large, mouvement sinusoïdal, sans à-coup\n      caméra (0.60, 0.68, 4.35) → (5.00, 1.35, 5.00) · visée (0.00, 0.37, 0.00) → (0.00, 0.35, 0.00)\n  3.5 → 4.6 s · travelling avant, travelling latéral vers la gauche, resserrage de focale (40° → 39°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (5.00, 1.35, 5.00) → (4.72, 1.26, 4.72) · visée (0.00, 0.35, 0.00) → (0.00, 0.33, 0.00)\n  4.6 → 5.0 s · focale stable (40°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (4.72, 1.26, 4.72) → (4.90, 1.30, 4.90) · visée (0.00, 0.33, 0.00) → (0.00, 0.33, 0.00)\n\nREPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :\n  0.0 s · Intact — La relique flotte intacte au-dessus du socle.\n  1.6 s · Ouverture — Les couches se desserrent, la lueur du noyau apparait.\n  3.5 s · Eclate — Vue eclatee : chaque composant trouve sa place.\n  4.6 s · Detail — Le noyau cristallin et les anneaux, en detail.\n\nMATIÈRE / LUMIÈRE :\n  fond sombre bleu nuit, éclairage produit latéral froid, reflets nets sur la glace, poussière de glace en suspension, halo lumineux derrière l’objet.\n\nCONTRAINTES DE COMPOSITION :\n  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;\n  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;\n  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;\n  — la première et la dernière image doivent être stables pendant au moins 4 images.\n\nRÉFÉRENCE DE BLOCKING :\n  assets/video/03-relique-explosee-blocking.mp4 (passe blocking, 150 images)\n  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.\n\nCORRESPONDANCE : Concept 3 de la video : casque VR explose, orbite a 45 degres."
  },
  "4": {
    "id": "concept-4",
    "title": "Le gardien de glace",
    "subtitle": "Rotation de camera, blocs feature gauche / droite",
    "reference": "Concept 4 de la video : samourai, orbite, pan gauche puis droite.",
    "slug": "04-gardien-glace",
    "duration": 12,
    "fps": 30,
    "poses": 8,
    "frames": 360,
    "env": "fjord",
    "whiteout": null,
    "beats": [
      {
        "t": 0,
        "label": "Face",
        "text": "Le gardien de glace, cadre serre, face camera."
      },
      {
        "t": 1.6,
        "label": "Degainage",
        "text": "La lame de glace sort du fourreau et s'illumine."
      },
      {
        "t": 3.2,
        "label": "Orbite",
        "text": "La camera tourne autour du gardien : cape et profondeur."
      },
      {
        "t": 6,
        "label": "Silhouette",
        "text": "La camera recule, la silhouette entiere se detache."
      },
      {
        "t": 9,
        "label": "Droite",
        "text": "Le gardien passe a droite : le tiers gauche reste libre."
      },
      {
        "t": 12,
        "label": "Gauche",
        "text": "Le gardien passe a gauche : le tiers droit reste libre."
      }
    ],
    "camera": [
      {
        "t": 0,
        "pos": [
          0,
          3.3,
          5.9
        ],
        "target": [
          0,
          3.78,
          0
        ],
        "fov": 36,
        "ease": "inOutSine"
      },
      {
        "t": 1.6,
        "pos": [
          0.05,
          3.42,
          5.3
        ],
        "target": [
          0,
          3.86,
          0
        ],
        "fov": 36,
        "ease": "inOutSine"
      },
      {
        "t": 3.2,
        "pos": [
          -3.4,
          2.9,
          8.35
        ],
        "target": [
          0.3,
          2.75,
          0
        ],
        "fov": 40,
        "ease": "inOutSine"
      },
      {
        "t": 4.4,
        "pos": [
          -8.75,
          3,
          3.2
        ],
        "target": [
          0.05,
          2.75,
          0
        ],
        "fov": 40,
        "ease": "inOutSine"
      },
      {
        "t": 5.4,
        "pos": [
          -6.05,
          3.05,
          7.7
        ],
        "target": [
          0,
          2.7,
          0
        ],
        "fov": 41,
        "ease": "inOutSine"
      },
      {
        "t": 6,
        "pos": [
          -2.4,
          3,
          10.9
        ],
        "target": [
          0,
          2.6,
          0
        ],
        "fov": 43,
        "ease": "whip"
      },
      {
        "t": 9,
        "pos": [
          0.05,
          2.95,
          10.7
        ],
        "target": [
          -3.1,
          2.6,
          0
        ],
        "fov": 43,
        "ease": "whip"
      },
      {
        "t": 12,
        "pos": [
          0.05,
          3.05,
          10.9
        ],
        "target": [
          3.1,
          2.6,
          0
        ],
        "fov": 43,
        "ease": "smooth"
      }
    ],
    "prompt": "Plan cinématique, 12.0 s, 16:9, 1080p, 30 i/s.\nSujet : Le gardien de glace — Rotation de camera, blocs feature gauche / droite.\n\nMOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :\n  0.0 → 1.6 s · travelling avant, focale stable (36°) — amplitude faible, mouvement sinusoïdal, sans à-coup\n      caméra (0.00, 3.30, 5.90) → (0.05, 3.42, 5.30) · visée (0.00, 3.78, 0.00) → (0.00, 3.86, 0.00)\n  1.6 → 3.2 s · travelling arrière, travelling latéral vers la gauche, descente de caméra, panoramique vers la droite, tilt vers le bas, ouverture de focale (36° → 40°) — amplitude large, mouvement sinusoïdal, sans à-coup\n      caméra (0.05, 3.42, 5.30) → (-3.40, 2.90, 8.35) · visée (0.00, 3.86, 0.00) → (0.30, 2.75, 0.00)\n  3.2 → 4.4 s · travelling avant, travelling latéral vers la gauche, focale stable (40°) — amplitude large, mouvement sinusoïdal, sans à-coup\n      caméra (-3.40, 2.90, 8.35) → (-8.75, 3.00, 3.20) · visée (0.30, 2.75, 0.00) → (0.05, 2.75, 0.00)\n  4.4 → 5.4 s · travelling arrière, travelling latéral vers la droite, ouverture de focale (40° → 41°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (-8.75, 3.00, 3.20) → (-6.05, 3.05, 7.70) · visée (0.05, 2.75, 0.00) → (0.00, 2.70, 0.00)\n  5.4 → 6.0 s · travelling arrière, travelling latéral vers la droite, ouverture de focale (41° → 43°) — amplitude moyenne, mouvement sinusoïdal, sans à-coup\n      caméra (-6.05, 3.05, 7.70) → (-2.40, 3.00, 10.90) · visée (0.00, 2.70, 0.00) → (0.00, 2.60, 0.00)\n  6.0 → 9.0 s · travelling latéral vers la droite, panoramique vers la gauche, focale stable (43°) — amplitude moyenne, balayage rapide puis stabilisation\n      caméra (-2.40, 3.00, 10.90) → (0.05, 2.95, 10.70) · visée (0.00, 2.60, 0.00) → (-3.10, 2.60, 0.00)\n  9.0 → 12.0 s · panoramique vers la droite, focale stable (43°) — amplitude faible, balayage rapide puis stabilisation\n      caméra (0.05, 2.95, 10.70) → (0.05, 3.05, 10.90) · visée (-3.10, 2.60, 0.00) → (3.10, 2.60, 0.00)\n\nREPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :\n  0.0 s · Face — Le gardien de glace, cadre serre, face camera.\n  1.6 s · Degainage — La lame de glace sort du fourreau et s'illumine.\n  3.2 s · Orbite — La camera tourne autour du gardien : cape et profondeur.\n  6.0 s · Silhouette — La camera recule, la silhouette entiere se detache.\n  9.0 s · Droite — Le gardien passe a droite : le tiers gauche reste libre.\n  12.0 s · Gauche — Le gardien passe a gauche : le tiers droit reste libre.\n\nMATIÈRE / LUMIÈRE :\n  heure bleue polaire : ciel nuit profond, horizon cyan pâle, aurores boréales vertes et violettes au fond, brume basse, glace vive très réfléchissante, neige fine continue.\n\nCONTRAINTES DE COMPOSITION :\n  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;\n  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;\n  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;\n  — la première et la dernière image doivent être stables pendant au moins 4 images.\n\nRÉFÉRENCE DE BLOCKING :\n  assets/video/04-gardien-glace-blocking.mp4 (passe blocking, 360 images)\n  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.\n\nCORRESPONDANCE : Concept 4 de la video : samourai, orbite, pan gauche puis droite."
  },
  "5": {
    "id": "concept-5",
    "title": "Survol du glacier",
    "subtitle": "Plaque ambiante plein ecran : drone au-dessus du champ de glaciers",
    "reference": "Plan plein ecran de deploiement (fin du concept 4 de la video) : respiration ambiante.",
    "slug": "05-survol-glacier",
    "duration": 6,
    "fps": 30,
    "poses": 4,
    "frames": 180,
    "env": "fjord",
    "whiteout": null,
    "beats": [
      {
        "t": 0,
        "label": "Survol",
        "text": "Le drone glisse au ras du champ de glaciers."
      },
      {
        "t": 4,
        "label": "Horizon",
        "text": "La banquise s'ouvre sur la chaine de montagnes."
      },
      {
        "t": 6,
        "label": "Immersion",
        "text": "L'aurore occupe le cadre, la neige referme le plan."
      }
    ],
    "camera": [
      {
        "t": 0,
        "pos": [
          -80,
          25,
          120
        ],
        "target": [
          -10,
          -10,
          -400
        ],
        "fov": 44,
        "ease": "linear"
      },
      {
        "t": 2,
        "pos": [
          -40,
          28,
          74
        ],
        "target": [
          0,
          -8,
          -400
        ],
        "fov": 44,
        "ease": "linear"
      },
      {
        "t": 4,
        "pos": [
          0,
          31,
          28
        ],
        "target": [
          0,
          -4,
          -400
        ],
        "fov": 45,
        "ease": "linear"
      },
      {
        "t": 6,
        "pos": [
          44,
          34,
          -18
        ],
        "target": [
          -10,
          2,
          -400
        ],
        "fov": 46,
        "ease": "linear"
      }
    ],
    "prompt": "Plan cinématique, 6.0 s, 16:9, 1080p, 30 i/s.\nSujet : Survol du glacier — Plaque ambiante plein ecran : drone au-dessus du champ de glaciers.\n\nMOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :\n  0.0 → 2.0 s · travelling avant, travelling latéral vers la droite, focale stable (44°) — amplitude faible, vitesse constante\n      caméra (-80.00, 25.00, 120.00) → (-40.00, 28.00, 74.00) · visée (-10.00, -10.00, -400.00) → (0.00, -8.00, -400.00)\n  2.0 → 4.0 s · travelling avant, travelling latéral vers la droite, ouverture de focale (44° → 45°) — amplitude moyenne, vitesse constante\n      caméra (-40.00, 28.00, 74.00) → (0.00, 31.00, 28.00) · visée (0.00, -8.00, -400.00) → (0.00, -4.00, -400.00)\n  4.0 → 6.0 s · travelling avant, travelling latéral vers la droite, ouverture de focale (45° → 46°) — amplitude moyenne, vitesse constante\n      caméra (0.00, 31.00, 28.00) → (44.00, 34.00, -18.00) · visée (0.00, -4.00, -400.00) → (-10.00, 2.00, -400.00)\n\nREPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :\n  0.0 s · Survol — Le drone glisse au ras du champ de glaciers.\n  4.0 s · Horizon — La banquise s'ouvre sur la chaine de montagnes.\n  6.0 s · Immersion — L'aurore occupe le cadre, la neige referme le plan.\n\nMATIÈRE / LUMIÈRE :\n  heure bleue polaire : ciel nuit profond, horizon cyan pâle, aurores boréales vertes et violettes au fond, brume basse, glace vive très réfléchissante, neige fine continue.\n\nCONTRAINTES DE COMPOSITION :\n  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;\n  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;\n  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;\n  — la première et la dernière image doivent être stables pendant au moins 4 images.\n\nRÉFÉRENCE DE BLOCKING :\n  assets/video/05-survol-glacier-blocking.mp4 (passe blocking, 180 images)\n  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.\n\nCORRESPONDANCE : Plan plein ecran de deploiement (fin du concept 4 de la video) : respiration ambiante."
  }
};
