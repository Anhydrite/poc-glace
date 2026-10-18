# BORÉAL — POC « storytelling piloté par le scroll », thème glace

Ce dépôt est un **POC** construit pour éprouver, de bout en bout, la nouveauté présentée dans la
vidéo *« Claude + Blender + Seedance 2.5 = Insane Websites »* (Kyle Skelly,
<https://youtu.be/mvfo3pUiCCA>) :

> **blocker une prise de vue en 3D low-poly → en tirer un prompt seconde par seconde →
> générer la matière cinématique → poser la vidéo dans une page et la piloter par le scroll.**

Le POC est **entièrement local** : aucune ressource réseau, aucune CDN, aucune police distante,
aucun service externe. Les vidéos sont **générées sur la machine** à partir de specs de scène
versionnées, et le site est un site statique sans dépendance runtime.

---

## 1. La nouveauté de la vidéo, en une phrase

Le problème de départ est classique : quand on demande une vidéo à un générateur, on décrit un
mouvement **en texte** et on espère. Le résultat est joli mais la composition est aléatoire — donc
inutilisable comme section de site, où le texte a besoin de zones libres précises.

Le workflow de la vidéo supprime le hasard en **inversant l'ordre** :

| # | Étape | Entrée | Sortie |
|---|-------|--------|--------|
| 1 | **Blocker** la prise de vue (formes simples, poses de caméra) | une intention en une phrase | un chemin de caméra |
| 2 | **Exporter** un playblast volontairement pauvre | le chemin de caméra | la passe **blocking** |
| 3 | **Faire écrire** le prompt par un LLM qui *regarde* le playblast | la passe blocking | un prompt **daté** seconde par seconde |
| 4 | **Générer** la matière (Seedance 2.5 / Higgsfield + image de référence) | le prompt daté | la passe **cinématique** |
| 5 | **Poser** la vidéo dans la page | la passe cinématique | une section scrollable |

Le point clé : **le chemin de caméra est l'artefact partagé**. Il est décidé avant la génération et
ne bouge plus. C'est pour cette raison qu'on peut écrire « ce bloc de texte apparaît à la seconde 9,
quand la caméra a fini son balayage » — et que ça reste vrai.

## 2. Ce que ce POC rejoue, et avec quoi

| Dans la vidéo | Dans ce POC |
|---|---|
| Blender 5.2 + plugin Higgsfield | générateur de scène procédural (Three.js) piloté par des **specs JS versionnées** |
| Playblast basse fidélité | passe `--look blocking` : matériaux plats, ombres coupées, calques atmosphériques masqués |
| Claude lit le playblast et rédige le prompt | `render/shot-list.mjs` dérive mécaniquement un prompt daté des poses de caméra |
| Seedance 2.5 (Higgsfield) | passe `--look cinematic` : glace physique, brouillard volumétrique, bloom, grain, étalonnage |
| Site sans code | site statique écrit à la main, zéro dépendance réseau |
| Scrub vidéo au scroll | moteur maison `site/src/scroll-video.js` |

**Ce qui n'est pas remplacé :** la passe cinématique est rendue par un moteur temps réel, pas par un
modèle génératif. Elle prouve la **structure** du workflow — le chemin de caméra partagé, la
séparation mouvement/matière — pas la qualité d'un générateur vidéo. C'est un choix assumé : il rend
le POC reproductible, testable et déterministe.

---

## 3. Ce que contient le site

Cinq séquences, une par « concept » de la vidéo, plus la démonstration du pipeline.

| # | Section | Trick de la vidéo mis en œuvre |
|---|---------|-------------------------------|
| 01 | **Le hublot de l'icebreaker** | scrub vidéo au scroll, traverse d'un cadre (hublot → monument) |
| — | **Comparateur préviz / final** | les deux passes, même temps, même chemin de caméra, côte à côte |
| 02 | **La fenêtre du tunnel de glace** | scrub, puis **fondu au blanc** qui sert de transition de section |
| 03 | **La relique explosée** | vue éclatée, encart descriptif révélé **à l'instant du plan** |
| 04 | **Le gardien de glace** | rotation, puis **balayages gauche/droite** qui libèrent la place des blocs texte |
| 05 | **Survol du glacier** | **déploiement** d'un cadre vers le plein écran, toujours scrubé |
| — | **Workflow en 5 étapes** | les prompts datés, générés depuis les specs |
| — | **FAQ** | les limites réelles du procédé |

Le sélecteur en haut de page bascule **toutes** les séquences entre la passe cinématique et la passe
blocking, **en conservant le temps courant** : on voit le mouvement identique, seule la matière
change.

---

## 4. Architecture

```
render/                      # pipeline de production des vidéos
  lib/
    kit.js                   # assemble renderer/scene/camera/env/lumière/matériaux/post
    camera-rig.js            # interpolation des poses de caméra (Catmull-Rom + easings)
    materials.js             # slots de matériaux, déclinés en deux "looks"
    geometry.js              # générateurs procéduraux (glace, cabine, tunnel, artefact, gardien)
    atmosphere.js            # neige, poussière, faisceaux, aurores
    env.js                   # environnement lumineux procédural (equirect + PMREM)
    post.js                  # bloom + étalonnage + givre + grain (passe cinématique)
    rng.js / easing.js       # déterminisme et courbes
  scenes/
    concept-1.js … concept-5.js   # specs de scène (poses de caméra + props + beats)
  capture.mjs                # rendu PNG par PNG + encodage ffmpeg
  shot-list.mjs              # génère les prompts datés depuis les specs
  diag.mjs                   # isolation de calques (diagnostic visuel)
  smoke-webgl.mjs            # vérifie que WebGL fonctionne en headless
  index.html, entry.js       # harnais navigateur (canvas + API __renderFrame)

site/
  index.html                 # structure de la page
  src/
    main.js                  # amorçage, mode de rendu, révélations statiques, prompts
    scroll-video.js          # moteur de scrub (scroll → currentTime)
    timeline.js              # textes ancrés au TEMPS de la vidéo
    compare.js               # comparateur à poignée (souris + clavier + balayage)
    styles.css               # design system
    prompts.generated.js     # généré par render/shot-list.mjs

tools/
  serve.mjs                  # serveur statique (support des requêtes Range : indispensable au seek)
  build.mjs                  # bundle JS/CSS + copie des assets + posters

assets/video/                # 10 MP4 générés (5 concepts × 2 passes)
assets/img/                  # posters
tests/
  e2e.mjs                    # vérifications navigateur (scrub, timeline, comparateur, replis)
  determinism.mjs            # déterminisme du rendu + chemin de caméra partagé
  assets.mjs                 # intégrité des 10 MP4
docs/
  reference-video.md         # la vidéo de référence, passage par passage
  prompts-seedance.md        # prompts générés, lisibles
  extending.md               # ajouter une sixième séquence (règles à respecter)
  visual-review.md           # protocole de revue visuelle, défauts trouvés et corrigés
```

### Pourquoi deux passes plutôt qu'un filtre à l'affichage ?

Parce que le **contrat** du workflow est le mouvement, pas l'image. Les deux passes sont produites
par le *même* `camera-rig` alimenté par la *même* liste de poses clés. Il n'existe aucun chemin de
code où l'une pourrait dériver de l'autre. Le comparateur du site ne compare donc pas deux rendus
« à peu près » : il compare deux fois le même plan.

### La recette qui rend le scrub fluide

1. **GOP court** — une image-clé toutes les 7 à 8 images (`-g 7 -keyint_min 7 -sc_threshold 0`) :
   un `seek` ne décode jamais plus d'une poignée d'images.
2. **`-movflags +faststart`** — l'index du fichier est en tête, la première image est disponible
   immédiatement.
3. **Une seule boucle `requestAnimationFrame`** pour toutes les séquences, avec un **seuil
   d'écriture** : on n'assigne `currentTime` que si l'écart dépasse une fraction d'image.
4. **Positions de sections mises en cache**, recalculées au `resize` uniquement.
5. **Repli propre** : si la vidéo n'est pas scrubbable (mouvement réduit, erreur de chargement,
   appareil modeste), le site passe en mode poster et affiche **tout** le texte.

---

## 5. Utilisation

```bash
npm install

# 1. Générer les prompts datés depuis les specs (rapide)
node render/shot-list.mjs

# 2. Rendre les vidéos (10 MP4 : 5 concepts × 2 passes)
node render/capture.mjs all                  # ~2 à 4 min par séquence et par passe
node render/capture.mjs movie --concept 1 --look cinematic
node render/capture.mjs shots --concept 4 --look blocking --times 0,3,9,12

# 3. Construire le site
node tools/build.mjs

# 4. Servir + vérifier
node tools/serve.mjs                          # http://127.0.0.1:4321/dist/index.html
node tests/e2e.mjs                            # 20 vérifications navigateur + captures
```

Le rendu est **déterministe** : même spec + même look ⇒ même séquence, image pour image.

---

## 6. Ce qui a été vérifié, et comment

Trois suites, toutes exécutables :

```bash
node tests/assets.mjs        # les 10 MP4 : présence, décodage, durée, débit, absence de placeholder
node tests/determinism.mjs   # déterminisme du rendu + chemin de caméra partagé
node tests/e2e.mjs           # 35 vérifications dans un vrai navigateur + captures
```

### `tests/assets.mjs`
Vérifie que les dix fichiers existent, sont décodables (H.264), durent exactement la durée déclarée
par la spec de scène, et ne sont pas des vidéos de test laissées par erreur.

### `tests/determinism.mjs`
Deux propriétés dont dépend tout le reste :

1. **Indépendance à l'ordre d'échantillonnage** — rendre les mêmes instants dans un ordre différent
   produit les mêmes images. Le test compare d'abord les empreintes SHA-256 ; si elles diffèrent, il
   mesure l'écart réel (lecteur PNG interne, aucune dépendance) et ne tolère qu'un écart de
   **± 1/255 sur moins de 0,5 % des pixels**.
   Cette tolérance n'est pas un confort : le rendu hors-ligne passe par un rasteriseur **logiciel**
   (SwiftShader) dont le JIT peut contracter les opérations flottantes différemment d'une compilation
   à l'autre. On l'a mesuré : sur le concept 05, l'écart apparaît parfois, toujours sur la même bande
   d'aurore (dont le bruit est calculé avec des `sin`), toujours à ± 1/255, sur ~0,1 % des pixels. Au
   delà de ces bornes, le test échoue — et il a effectivement attrapé une vraie dépendance à l'ordre
   (les updaters qui tournaient avant l'application de la caméra, corrigé dans `render/lib/kit.js`).
2. **Chemin de caméra partagé** — pour un même instant, la pose de caméra (position, orientation,
   focale) est **identique** dans les deux looks. Le test mesure un **écart nul** sur toutes les poses
   testées des cinq concepts : c'est la vérification opérationnelle du workflow de la vidéo — le
   mouvement est l'artefact partagé, la matière n'est qu'un habillage.

### `tests/e2e.mjs`
Ne se contente pas de charger la page. Il mesure :

- le temps de la vidéo **écrit par le scroll**, son **amplitude** et sa **monotonie** ;
- le scrub **dans les deux sens** (on remonte, le temps recule) ;
- la bascule final/prévisualisation **conserve le temps courant** (±1 image) et change bien de calque ;
- les textes ancrés au temps apparaissent **aux instants attendus** ;
- le fondu au blanc du concept 2 **atteint 1** en fin de séquence, et ne s'ouvre **pas** avant ;
- le cadre de la section 05 se **déploie** effectivement (0 → 1) ;
- les blocs du concept 4 sont bien **de part et d'autre** du cadre ;
- le comparateur répond à la **souris**, au **clavier** et au **balayage automatique** ;
- les deux passes ont la **même durée** pour chaque séquence (même nombre d'images) ;
- le **repli « mouvement réduit »** : bascule en mode poster, aucun contenu masqué, aucune exception ;
- **aucune requête externe**, **aucune requête échouée**, **aucune erreur console**, **aucune
  exception de page** — sur desktop, en mouvement réduit et sur mobile (390 px, zéro débordement
  horizontal).

Les captures produites par le test sont écrites dans `render/out/site/` et nommées d'après la
section **et** la progression dans le plan (par exemple `04-monument.png`, `10-gardien-droite.png`).

## 7. Limites assumées

- La passe cinématique est un rendu temps réel, pas une génération IA : elle valide le
  **workflow**, pas la qualité d'un modèle.
- Le rendu hors-ligne se fait en WebGL logiciel (SwiftShader) : la résolution cible est 1280×720
  avec super-échantillonnage optionnel (`--ss 1.25`), pas du 4K.
- Le scrub vidéo au scroll reste dépendant du décodeur : sur un appareil très lent, le mode poster
  prend le relais.
- Les assets 3D sont procéduraux et stylisés ; ils ne cherchent pas le photoréalisme mais la
  lisibilité d'un *previz*.
- Les vidéos sont commitables mais volumineuses (~37 Mo) : elles sont ignorées par Git et
  régénérables par `npm run render:all`.
- Le rendu hors-ligne n'est pas **bit-à-bit** reproductible : le rasteriseur logiciel introduit
  parfois un écart de ± 1/255 sur une fraction infime des pixels (voir `tests/determinism.mjs`). Le
  mouvement, la composition et le cadrage, eux, sont exactement reproductibles — et c'est ce qui
  compte pour ce POC.
- La revue visuelle n'a pas pu être déléguée à l'agent visuel prévu (crédits épuisés et modèle par
  défaut absent du registre). Elle a été faite manuellement selon un protocole traçable, et a
  trouvé deux défauts réels depuis corrigés : voir `docs/visual-review.md`.

## 7 bis. Dette technique identifiée (et non masquée)

Ces points ont été relevés pendant la construction, en particulier en faisant écrire quatre scènes
par des agents différents à partir du même kit. Ils sont listés ici parce qu'ils sont réels, pas
parce qu'ils bloquent le POC.

1. **`materials.js` — bruit de normal map trop haute fréquence.** `noiseTexture()` génère un bruit
   blanc pixel par pixel, utilisé comme `normalMap` par les slots `snow` et `frost`. De près, cela
   lit comme du « bruit de neige TV ». Il faudrait un bruit lissé (value/fbm) et/ou un fondu par
   distance. Contournement actuel : les grandes surfaces ne prennent pas ces slots.
2. **`post.js` — coût de la passe de transmission.** Un seul matériau transmissif déclenche un rendu
   complet supplémentaire de la scène. Un drapeau `spec.post.transmission = false` (ou
   `spec.quality`) permettrait de tenir le budget de rendu sur des scènes larges.
3. **`geometry.js` — `iceGuardian.blade`.** Le pivot du groupe lame est au *milieu* de la lame et
   non au pommeau ; chaque scène doit recalculer la prise à la main. Un point de prise exposé
   serait plus propre.
4. **`geometry.js` — cape du gardien.** Le helper fournit un simple plan, invisible de profil ;
   une coque de cône serait directement utilisable.
5. **`geometry.js` — `iceShelf()`.** La calotte de neige est posée à `y = thickness * 0.72` alors
   que le corps s'extrude jusqu'à `thickness` : les volumes se chevauchent légèrement.
6. **`camera-rig.js` — poses tenues.** Il est impossible de maintenir une pose entre deux keyframes
   identiques sans tangentes parasites ; un mode `hold` explicite serait utile.
7. **`kit.js` — frustum d'ombre fixe.** Le frustum d'ombre directionnelle fait ±60 unités autour de
   l'origine, ce qui est inadapté à un plan aérien large. Un `shadowBounds` par spec serait mieux.
8. **`kit.js` — `near = 0.05` pour `far = 3000`.** Précision de profondeur faible sur les scènes
   étendues ; `logarithmicDepthBuffer` ou un `near` dérivé de la scène serait préférable.

## 8. Référence

Kyle Skelly, *Claude + Blender + Seedance 2.5 = Insane Websites*, YouTube, <https://youtu.be/mvfo3pUiCCA>.
Le transcript complet de la vidéo a servi de cahier des charges pour les cinq concepts et pour le
pipeline. Les correspondances sont notées dans `render/scenes/concept-*.js` (champ `reference`) et
dans `docs/prompts-seedance.md`.
