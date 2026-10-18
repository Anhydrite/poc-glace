# Revue visuelle — méthode, résultats, correctifs

## Pourquoi ce document existe

La consigne de travail prévoit qu'une revue visuelle soit faite par un agent visuel dédié
(`visual-agent`). Dans cet environnement, **cette délégation n'a pas pu aboutir** :

| Tentative | Résultat |
|---|---|
| `visual-agent` sans modèle explicite | `Unknown subagent model 'minimax/MiniMax-M3' in the active Pi model registry` |
| `visual-agent` avec `commandcode/MiniMaxAI/MiniMax-M3` | `400 — insufficient credits` |
| `visual-agent` avec `commandcode/google/gemini-3.8-flash` | `400 — insufficient credits` |

La revue a donc été faite **manuellement**, mais de façon systématique et traçable : chaque point de
la checklist correspond à une capture produite automatiquement par `tests/e2e.mjs` dans
`render/out/site/`, et chaque défaut trouvé a été corrigé **puis re-vérifié** par une assertion
automatisée.

## Protocole

1. `node tools/build.mjs` — construire le site.
2. `node tests/e2e.mjs` — parcourir la page dans un vrai navigateur, capturer **13 vues** ancrées sur
   les sections (et non sur des fractions de document), plus une vue mobile, une vue
   « mouvement réduit », et exécuter les vérifications géométriques.
3. Lire chaque capture et la confronter à la checklist ci-dessous.
4. Pour tout défaut : corriger, ajouter une assertion qui l'aurait attrapé, relancer.

Les captures sont **reproductibles** : `node tests/e2e.mjs` les régénère à l'identique.

## Checklist et résultat

| # | Point vérifié | Résultat | Preuve |
|---|---|---|---|
| A | Thème et cohérence « glace » (palette, lumière, matière) | conforme | `01-hero`, `04-monument`, `12-deploiement` |
| B | Lisibilité du texte posé sur les vidéos | conforme | tous les `beat` / `feature` des captures |
| C | Comparateur : séparation nette, **même image des deux côtés** | conforme | `05-compare-50-50` |
| D | Fondu au blanc de la section 03 jusqu'au blanc complet | conforme | `07-blanc` |
| E | Section 05 : cartes de part et d'autre, sans collision avec le sujet | conforme | `10-gardien-droite`, `11-gardien-gauche` |
| F | Section 06 : déploiement du cadre réduit vers le plein écran | conforme | `12-deploiement` |
| G | Mobile 390 × 844 : pas de débordement, pas de texte coupé | conforme | `10-mobile` |
| H | Artefacts (surexposition, bords durs, 3D coupée, texte superposé…) | 2 défauts trouvés, corrigés | voir ci-dessous |

## Défauts trouvés et corrigés

### 1. Le titre du héros était invisible en haut de page — **gênant**
- **Où** : tout premier écran, avant tout scroll.
- **Ce qu'on voyait** : seul le sur-titre « CONCEPT 01 · LE HUBLOT » apparaissait ; le `<h1>`
  « Franchir le hublot » et le paragraphe d'accroche restaient invisibles jusqu'à ce que
  l'utilisateur commence à scroller.
- **Cause** : les textes du héros étaient ancrés à `data-enter="0.05"` / `0.12` en **secondes de
  vidéo**. Au scroll 0, le temps de la vidéo vaut exactement 0, donc la condition `temps >= 0.05`
  était fausse. Le décalage d'apparition était confié au temps du plan au lieu d'un délai CSS.
- **Correction** : `data-enter="0"` pour les quatre éléments du héros, l'effet d'escalier étant
  obtenu par `transition-delay` (0 / 90 / 190 / 320 ms).
- **Assertion ajoutée** : « le titre du héros est visible sans avoir à scroller » — mesure l'opacité
  calculée et la boîte englobante à `scrollY = 0`.

### 2. En mode « mouvement réduit », tous les textes se superposaient — **bloquant**
- **Où** : tout le site, avec `prefers-reduced-motion: reduce` (ou si les vidéos ne se chargent pas).
- **Ce qu'on voyait** : les cinq repères narratifs de la section 01 s'affichaient **en même temps, au
  même endroit**, produisant un amas illisible (« La cathédrale », « Le hublot », « Passage »
  superposés). Le repli dégradait plus qu'il n'aidait.
- **Cause** : le repli se contentait de forcer `.is-in` sur tous les éléments ancrés au temps, sans
  changer leur mise en page — or ces éléments sont tous en `position: absolute` dans une scène
  collante, conçus pour apparaître **un par un**.
- **Correction** : un vrai **mode statique** en CSS (`body.no-scrub`). Les séquences cessent d'être
  des scènes collantes et redeviennent des articles : la vidéo est remplacée par son image d'affiche
  en 16/9, et tous les textes sont remis dans le flux, empilés verticalement. Le HUD, l'indicateur de
  scroll, le comparateur et le fondu au blanc sont masqués (ils n'ont plus de sens).
- **Assertions ajoutées** : « aucun contenu ne reste masqué » (0 / 44) et « aucun texte superposé »
  (calcul des intersections de boîtes : 13 blocs, 0 chevauchement).

## Défauts trouvés et **acceptés** (avec justification)

| Défaut | Gravité | Décision |
|---|---|---|
| La passe cinématique reste stylisée (facettes visibles, montagnes en « tente ») | cosmétique | Assumé : c'est un *previz* habillé, pas une génération photoréaliste. Documenté dans le README. |
| Les plans du concept 02 et 05 sont plus pâles que les autres | cosmétique | Cohérent avec le sujet (brume, blanc, altitude). Aucune correction. |
| La barre noire du letterbox est « cuite » dans les vidéos | cosmétique | C'est le rendu cinématique voulu ; elle disparaît en mode blocking, ce qui rend le comparateur plus lisible. |

## Ce qui fonctionne particulièrement bien

1. **Le comparateur** : à 50/50, la couture entre les deux passes tombe sur la même arête de glace et
   le même flocon — la démonstration « même chemin de caméra, matière différente » est immédiatement
   lisible, sans explication.
2. **Le fondu au blanc** de la section 03 : la vidéo finit blanche, le site ajoute son propre voile
   sur le même profil (`[8.2, 9.0] s`), et la section suivante émerge du blanc. Aucune couture.
3. **Le mode statique** : le repli n'est pas une dégradation, c'est une mise en page différente mais
   propre — le contenu reste intégralement lisible.

## Note d'outillage

Les deux défauts ci-dessus n'étaient **pas** détectables par une lecture de code : ils n'apparaissent
que dans des états particuliers (scroll 0 exact, média `prefers-reduced-motion`). Ils ont été trouvés
en lisant les captures produites par le test — ce qui plaide pour que la capture d'écran fasse partie
de la suite de tests, et pas seulement de la revue manuelle.
