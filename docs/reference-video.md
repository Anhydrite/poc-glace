# La vidéo de référence, et ce qui en a été retenu

Source : **Kyle Skelly — « Claude + Blender + Seedance 2.5 = Insane Websites »**
<https://youtu.be/mvfo3pUiCCA> (durée ≈ 9 min 19 s)

Ce document existe pour que le POC reste auditable : chaque élément du site doit pouvoir être
rapproché d'un passage précis de la vidéo. Les horodatages proviennent du transcript de la vidéo.

---

## 1. Le problème posé par la vidéo

> « When you're working with AI videos, one of the biggest problems is you never really know what
> you're going to get. » — *0:20*

> « Usually to generate video with specific camera movements and very certain compositions that work
> within a website, it involves a lot of guesswork, a lot of re-prompting. » — *8:39*

C'est exactement le problème que le POC essaie de rendre visible : dans le comparateur, on voit que
la composition n'est pas négociée avec un modèle, elle est **décidée**.

## 2. Le pipeline décrit

| Étape | Ce que dit la vidéo | Horodatage |
|---|---|---|
| Installer Blender 5.2 | « make sure you have the newest version of Blender, which is 5.2 » | 0:39 |
| Brancher Higgsfield | plugin Blender + « Higgsfield Bridge MCP » ajouté comme connecteur dans Claude | 0:45 – 1:13 |
| Bloquer la scène | « design me a scene with a private jet that's overlooking Big Ben […] keep it low poly and simple, **it's just for blocking** » | 2:31 – 2:41 |
| Exporter | « view → render playblast » ; sortie 1080p, conteneur MP4 | 3:44 – 3:49 |
| Faire écrire le prompt | « examine the video blocking video and give me a detailed second by second prompt for Seedance 2.5 » | 4:03 – 4:16 |
| Générer | Seedance 2.5, 10 s, 1080p, + image de référence du produit réel | 4:30, 6:00 |
| Poser dans la page | « as we scroll, we pan through that window » | 4:38 |

Phrase clé, qui justifie tout le POC :

> « So we mapped it out and visualized it in Blender. We got Claude to write the prompt, and then we
> got Seedance 2.5 to bring that prompt to life, **better than we could have described it via just
> text**. » — *4:41*

## 3. Les quatre plans de la vidéo, et leurs équivalents ici

### Concept 1 — hublot d'avion → skyline de Londres → Big Ben *(1:40 – 4:38)*
- Blocage : avion privé au-dessus de Big Ben, low poly, 10 s, « camera should pan out of the window
  and then down at the cityscape to reveal Big Ben ».
- Le premier essai en texte seul « doesn't quite have the pacing or the dynamic camera moves that we
  want ».
- **Équivalent POC** : `render/scenes/concept-1.js` — hublot d'icebreaker → fjord gelé → cathédrale
  de glace. Même structure : intérieur cadré serré, traversée d'un cadre, révélation d'un monument.

### Concept 2 — fenêtre → montagne dans les nuages → fondu au blanc *(4:52 – 5:20)*
- « the camera points out the window, revealing a mountain sticking up through the clouds. Then the
  camera pans down towards the clouds, through the clouds, **fading off into white** ».
- C'est le blanc qui « révèle la section suivante ».
- **Équivalent POC** : `concept-2.js` + la transition `stage__whiteout` du site (profil `[8.0, 9.6] s`).

### Concept 3 — vue éclatée d'un produit *(5:22 – 6:38)*
- « One thing that's really hard to visualize with AI video is exploded product animation. »
- Prompt de blocage : casque VR, éclaté, 5 s, angle 45°.
- Le prompt final est complété par une **image de référence du produit réel**.
- **Équivalent POC** : `concept-3.js` — relique de glace, 5 s, 6 couches, encart descriptif révélé à
  3,4 s.

### Concept 4 — le samouraï, plan continu avec deux balayages *(6:38 – 8:38)*
- Prompt de blocage très détaillé : personnage face caméra, rotation de 3 s, sortie de la lame,
  zoom arrière, puis deux balayages de 3 s.
- Objectif explicite : « **one continuous video** that just kind of fills the frame », avec des
  features « going down one side and then features going down the other ».
- Le modèle propose d'abord un plan, l'auteur le fait **retravailler** (« it would be better if the
  camera actually rotated fully around the character »).
- **Équivalent POC** : `concept-4.js` — gardien de glace, 12 s, dégainage, orbite, recul, puis
  balayages à 9 s et 12 s qui libèrent les tiers gauche puis droit.

## 4. Ce que le POC ajoute par rapport à la vidéo

La vidéo reste une démonstration : on voit le résultat, pas la preuve que les deux passes partagent
réellement le mouvement. Le POC rend cette preuve **mesurable** :

1. Le comparateur superpose les deux passes **image pour image** au même temps (`--split`) ;
2. les deux passes sont produites par le **même `camera-rig`**, alimenté par la même liste de poses
   (`render/scenes/concept-*.js`), sans aucun chemin de code alternatif ;
3. le test `tests/e2e.mjs` vérifie que la bascule entre les deux passes **conserve le temps courant**
   à moins d'une image ;
4. les prompts « Seedance » sont générés **depuis les poses de caméra** (`render/shot-list.mjs`), ce
   qui les rend non dérivables du plan.

## 5. Ce que le POC ne fait pas

- Il ne remplace pas la génération IA : la passe cinématique est un rendu temps réel (Three.js,
  WebGL logiciel hors ligne), pas Seedance 2.5. Ce qui est testé, c'est la **structure** du workflow
  — le contrat de mouvement — pas la qualité d'un modèle.
- Il n'utilise ni Blender ni Higgsfield : le blocage est un générateur de scène procédural piloté par
  des specs versionnées, ce qui rend le POC reproductible, déterministe et testable.
- Il ne vise pas le photoréalisme : les assets 3D sont stylisés et facettés, comme un *previz*.
