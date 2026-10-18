# Ajouter une sixième séquence

Le POC est fait pour être étendu : une séquence = **un fichier de spec** + **quelques lignes de HTML**.
Tout le reste (rendu, encodage, prompts, scrub, timeline) est générique.

## 1. Écrire la spec de scène

Créer `render/scenes/concept-6.js` en prenant `render/scenes/concept-1.js` comme modèle :

```js
export default {
  id: 'concept-6',
  index: 6,
  title: 'Titre court',
  subtitle: 'Sous-titre',
  reference: 'À quel passage de la vidéo cela correspond.',
  duration: 8,          // secondes
  fps: 30,
  size: [1280, 720],
  env: 'fjord',         // 'fjord' | 'tundra' | 'studio'
  seed: 6606,           // toute la génération procédurale en dépend
  fog: { color: 0x86badd, density: 0.0035 },
  post: { grain: 0.055, bars: 0.058, frost: 0.4, bloom: { strength: 0.5, radius: 0.8, threshold: 0.8 } },
  camera: { keyframes: [ /* { t, pos, target, fov, ease } — au moins 2 */ ] },
  beats: [ { t: 0, label: 'Début', text: 'Ce que le site affichera à cet instant.' } ],
  props(ctx) {
    // construire la scène avec les helpers de render/lib/*
    return { update(t) { /* animation */ } };
  },
};
```

Déclarer la scène dans `render/scenes/index.js`, et son slug dans :

- `render/capture.mjs` → `CONCEPTS`
- `render/shot-list.mjs` → `SLUGS`
- `tools/build.mjs` → `CONCEPTS`

## 2. Régler la scène visuellement

```bash
node render/capture.mjs shots --concept 6 --look cinematic --times 0,2,4,6,8 --ss 1
node render/capture.mjs shots --concept 6 --look blocking  --times 0,2,4,6,8 --ss 1
```

Chaque commande écrit un `_montage.png` dans `render/out/`. C'est la boucle de travail : regarder,
critiquer, corriger.

Si une image est inexplicable, isoler les calques :

```bash
node render/diag.mjs --concept 6 --t 4 --hides "lightShafts,aurora|cloudBank|glacialSea"
```

Le paramètre `hide` accepte une liste de noms de groupes séparés par des virgules ; `|` sépare des
variantes rendues côte à côte.

## 3. Rendre les deux passes

```bash
node render/capture.mjs movie --concept 6 --look blocking
node render/capture.mjs movie --concept 6 --look cinematic
```

Puis régénérer les prompts (ils sont dérivés des poses de caméra) :

```bash
node render/shot-list.mjs
```

## 4. Poser la section dans le site

Dans `site/index.html`, dupliquer un bloc `section.story` et adapter :

- `id`, `data-concept="6"`, `data-scroll="3"` (longueur du scroll, en hauteurs de fenêtre) ;
- `data-concept-slug="06-mon-slug"` sur le conteneur `[data-scroll-video]` ;
- les `poster` des deux `<video>` (les fichiers sont générés par `tools/build.mjs`) ;
- les `data-enter` / `data-exit` des textes, **en secondes de la vidéo**.

Les sources des `<video>` ne sont **jamais** écrites dans le HTML : `ScrollVideo.resolveSources()`
les déduit de `data-concept-slug` et du nom du calque (`layer--cinematic` / `layer--blocking`).

## 5. Vérifier

```bash
node tools/build.mjs
node tests/assets.mjs
node tests/determinism.mjs --concept 6
node tests/e2e.mjs
```

`tests/determinism.mjs --concept 6` vérifie deux choses : que le rendu ne dépend pas de l'ordre
d'échantillonnage, et que la pose de caméra est identique dans les deux passes. Si la seconde
échoue, c'est que la scène a introduit un mouvement propre à une passe — ce que le workflow
interdit.

## Règles à respecter (elles ne sont pas négociables)

1. **Aucune matière ne déplace la caméra.** Le chemin de caméra est dans `camera.keyframes` et nulle
   part ailleurs.
2. **Aucun aléa hors de `ctx.rng`.** Sinon le rendu n'est plus reproductible, et la comparaison
   previz/final n'a plus de sens.
3. **Les matériaux passent par les slots.** Une scène ne construit pas de `THREE.Material` pour un
   prop : elle pose `mesh.userData.slot = 'ice'` et la bibliothèque choisit l'implémentation selon le
   look. Un `ShaderMaterial` custom doit être marqué `userData.keepMaterial = true`.
4. **Nommer les groupes atmosphériques** `lightShafts`, `aurora`, `snowfall`, `iceDust` : la passe
   blocking les masque automatiquement.
5. **Un updater ne doit pas dépendre de l'image précédente.** `render/lib/kit.js` applique la caméra
   avant les updaters, mais toute accumulation (`position.x += …`) casserait le déterminisme.
