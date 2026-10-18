/**
 * CONCEPT 5 — "Survol du glacier" (plan plein ecran de respiration)
 * Equivalent de la "full screen video" qui se deploie apres les blocs feature
 * du concept 4 de la video : une plaque ambiante, sans narration et sans texte,
 * qui respire entre deux sections.
 *
 * Le plan : un drone glisse lateralement au-dessus d'un champ de glaciers. La
 * camera part du premier plan (tours de glace en silhouette), s'eleve
 * legerement et ouvre sur la chaine de montagnes de l'horizon, sous deux
 * rideaux d'aurore (vert puis violet) et des faisceaux de lumiere volumetriques.
 *
 * Toute la composition est calee sur les trois reperes du site :
 *   0 s  "Survol"    — on est au-dessus de la glace, tours au premier plan
 *   4 s  "Horizon"   — la banquise s'ouvre, la chaine de montagnes est lisible
 *   6 s  "Immersion" — l'aurore occupe le haut du cadre, la neige referme
 */
import * as THREE from 'three';
import {
  glacierField,
  glacialSea,
  iceField,
  iceShelf,
  cloudBank,
  mountain,
  shardGeometry,
} from '../lib/geometry.js';
import {
  createSnowfall,
  createIceDust,
  createLightShafts,
  createAuroraCurtain,
} from '../lib/atmosphere.js';

/** Niveau de la banquise / mer de glace. La camera vole 35 a 44 unites au-dessus. */
const SEA_Y = -10;

/**
 * Tour de glace facettee : un bloc principal enfonce sous la surface, plus des
 * lames d'accompagnement. Sert d'ancrage de premier plan (parallaxe franche).
 */
function iceTower({ rng, radius = 12, height = 40, slot = 'ice', blades = 2, stretch = [1, 1] }) {
  const group = new THREE.Group();
  group.name = 'iceTower';
  // Etirement horizontal : transforme une tour en crete de glacier allongee.
  group.scale.set(stretch[0], 1, stretch[1]);

  const main = new THREE.Mesh(
    shardGeometry({
      radius,
      height,
      sides: 4 + Math.floor(rng.next() * 3),
      rng,
      jitterAmt: 0.22,
      tip: 0.16,
    }),
  );
  // Base volontairement sous la banquise : jamais de decoupe flottante.
  main.position.y = height * 0.5 - Math.max(2, height * 0.08);
  main.rotation.y = rng.next() * Math.PI * 2;
  main.userData.slot = slot;
  main.userData.materialOverrides = { roughness: 0.44, clearcoatRoughness: 0.32, envMapIntensity: 0.8 };
  group.add(main);

  for (let i = 0; i < blades; i++) {
    const bh = height * (0.28 + rng.next() * 0.34);
    const br = radius * (0.28 + rng.next() * 0.32);
    const blade = new THREE.Mesh(
      shardGeometry({
        radius: br,
        height: bh,
        sides: 4 + Math.floor(rng.next() * 2),
        rng,
        jitterAmt: 0.26,
        tip: 0.2,
      }),
    );
    const a = (i / Math.max(1, blades)) * Math.PI * 2 + rng.next() * 1.4;
    blade.position.set(Math.cos(a) * radius * 0.78, bh * 0.5 - 2.4, Math.sin(a) * radius * 0.78);
    blade.rotation.set((rng.next() - 0.5) * 0.34, rng.next() * Math.PI * 2, (rng.next() - 0.5) * 0.34);
    blade.userData.slot = rng.next() < 0.4 ? 'iceGlass' : slot === 'ice' ? 'iceDeep' : 'ice';
    blade.userData.materialOverrides = { roughness: 0.44, clearcoatRoughness: 0.32, envMapIntensity: 0.8 };
    group.add(blade);
  }

  return group;
}

/**
 * Remplace les slots 'snow'/'frost' (normal map haute frequence = bruit de
 * "neige TV" sur les grandes facettes) par de la glace claire, matee pour ne
 * pas clipper en blanc pur.
 */
function calmSnow(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.slot === 'snow' || o.userData.slot === 'frost') {
      o.userData.slot = 'iceGlass';
      o.userData.materialOverrides = {
        ...(o.userData.materialOverrides || {}),
        roughness: 0.5,
        envMapIntensity: 0.75,
        transmission: 0.15,
      };
    }
  });
  return root;
}

/**
 * Varie teinte et echelle des blocs d'un champ de glaciers : sans ca, tout le
 * semis partage deux materiaux et deux tailles, et lit comme un motif repete.
 */
function varyField(root, rng) {
  // Variation volontairement contenue : au dela, les blocs se detachent de la
  // banquise (base hors de l'eau) et la silhouette part en echardes.
  const SLOTS = ['ice', 'ice', 'iceDeep', 'iceDeep'];
  for (const m of root.children) {
    m.userData.slot = SLOTS[Math.floor(rng.next() * SLOTS.length) % SLOTS.length];
    m.userData.materialOverrides = { roughness: 0.5, clearcoatRoughness: 0.4 };
    const sxz = 0.9 + rng.next() * 0.3;
    m.scale.set(sxz, 0.9 + rng.next() * 0.25, sxz);
  }
  return root;
}

/** Placage de neige sur la banquise : cassures claires dans la glace sombre. */
function snowShelf({ rng, radius = 18, y = SEA_Y + 0.35 }) {
  const shelf = iceShelf({ rng, radius, sides: 7 + Math.floor(rng.next() * 4), thickness: 0.9 + rng.next() * 0.8 });
  shelf.position.y = y;
  shelf.rotation.y = rng.next() * Math.PI * 2;
  // Les surcharges se lisent sur le mesh, pas sur le groupe.
  for (const part of shelf.children) {
    part.userData.materialOverrides = { roughness: 0.55, envMapIntensity: 0.7 };
  }
  return shelf;
}

/* Positions des tours de glace : elles bordent la trajectoire du drone pour
 * donner l'echelle et la vitesse (grand premier plan a gauche au demarrage,
 * masses plus lointaines qui ferment l'axe central). */
const TOWERS = [
  { p: [-100, 0, 26], r: 16, h: 46, slot: 'ice' },
  { p: [-158, 0, -34], r: 21, h: 58, slot: 'iceDeep' },
  { p: [-34, 0, 92], r: 9, h: 22, slot: 'iceGlass' },
  { p: [-26, 0, 44], r: 11, h: 31, slot: 'ice' },
  { p: [-58, 0, -18], r: 12, h: 27, slot: 'ice' },
  { p: [78, 0, -104], r: 11, h: 26, slot: 'iceDeep' },
  { p: [48, 0, -46], r: 13, h: 37, slot: 'ice' },
  { p: [104, 0, 12], r: 17, h: 49, slot: 'iceDeep' },
  { p: [18, 0, -104], r: 17, h: 42, slot: 'iceDeep' },
  { p: [-66, 0, -128], r: 12, h: 30, slot: 'iceGlass' },
  { p: [152, 0, -116], r: 22, h: 62, slot: 'iceDeep' },
  { p: [-208, 0, -84], r: 15, h: 41, slot: 'ice' },
  { p: [238, 0, -186], r: 20, h: 54, slot: 'ice' },
  { p: [-306, 0, -204], r: 18, h: 46, slot: 'iceGlass' },
  { p: [352, 0, -250], r: 24, h: 50, slot: 'iceDeep' },
  { p: [-392, 0, -268], r: 21, h: 44, slot: 'ice' },
  // Cretes allongees : masses de glacier qui donnent l'echelle du survol.
  { p: [-268, 0, -172], r: 18, h: 33, slot: 'ice', s: [2.7, 0.85] },
  { p: [142, 0, -214], r: 21, h: 39, slot: 'iceDeep', s: [2.2, 1.1] },
  { p: [-430, 0, -300], r: 20, h: 35, slot: 'ice', s: [3.0, 1.0] },
  { p: [436, 0, -330], r: 23, h: 41, slot: 'iceDeep', s: [2.4, 1.0] },
  { p: [-72, 0, -376], r: 26, h: 46, slot: 'ice', s: [3.2, 1.2] },
  { p: [286, 0, -452], r: 28, h: 44, slot: 'ice', s: [2.6, 1.1] },
];

/* Chaine de montagnes de l'horizon, en trois plans de profondeur. */
const RANGES = [
  { z: -660, h: [64, 96], r: [90, 140], xs: [-560, -320, -80, 170, 430] },
  { z: -880, h: [96, 148], r: [140, 220], xs: [-720, -430, -150, 160, 470, 780] },
  { z: -1110, h: [140, 200], r: [200, 300], xs: [-940, -520, -70, 380, 840] },
];

export default {
  id: 'concept-5',
  index: 5,
  title: 'Survol du glacier',
  subtitle: 'Plaque ambiante plein ecran : drone au-dessus du champ de glaciers',
  reference: 'Plan plein ecran de deploiement (fin du concept 4 de la video) : respiration ambiante.',
  duration: 6,
  fps: 30,
  size: [1280, 720],
  env: 'fjord',
  seed: 5505,
  backgroundIntensity: 0.3,
  environmentIntensity: 0.7,
  fog: { color: 0x538fb4, density: 0.0016 },
  post: {
    grain: 0.042,
    bars: 0.058,
    frost: 0.2,
    chromatic: 0.0014,
    saturation: 1.2,
    exposure: 0.94,
    bloom: { strength: 0.3, radius: 0.85, threshold: 0.85 },
  },
  blockingBackground: 0x121a22,

  camera: {
    // Travelling lateral (+x) avec legere montee ; la visee reste loin devant
    // (z = -400) pour que le panoramique soit doux et sans a-coup. Easing
    // lineaire partout : la vitesse est continue aux poses cles (les tangentes
    // Catmull-Rom du rig assurent la courbe).
    keyframes: [
      { t: 0.0, pos: [-80.0, 25.0, 120.0], target: [-10.0, -10.0, -400], fov: 44, ease: 'linear' },
      { t: 2.0, pos: [-40.0, 28.0, 74.0], target: [0.0, -8.0, -400], fov: 44, ease: 'linear' },
      { t: 4.0, pos: [0.0, 31.0, 28.0], target: [0.0, -4.0, -400], fov: 45, ease: 'linear' },
      { t: 6.0, pos: [44.0, 34.0, -18.0], target: [-10.0, 2.0, -400], fov: 46, ease: 'linear' },
    ],
  },

  beats: [
    { t: 0.0, label: 'Survol', text: 'Le drone glisse au ras du champ de glaciers.' },
    { t: 4.0, label: 'Horizon', text: "La banquise s'ouvre sur la chaine de montagnes." },
    { t: 6.0, label: 'Immersion', text: "L'aurore occupe le cadre, la neige referme le plan." },
  ],

  props(ctx) {
    const { rng } = ctx;
    const deps = [];
    // Pas d'ombres portees : la carte d'ombre du kit couvre 120x120 unites au
    // centre de la scene, ce qui creerait une limite visible en plein vol.
    const NO_SHADOW = { castShadow: false, receiveShadow: false };

    // --- Banquise / mer de glace -------------------------------------------
    const sea = glacialSea({ size: 2400, segments: 110, rng });
    sea.position.y = SEA_Y;
    // La glace profonde doit rester sombre : on calme la reflexion d'environnement
    // (sinon, vue quasi rasante, la banquise renvoie tout le ciel et devient un aplat clair).
    sea.userData.materialOverrides = { color: 0x0f1e2c, envMapIntensity: 0.22, roughness: 0.7, metalness: 0.04 };
    ctx.add(sea, NO_SHADOW);
    deps.push(sea);

    // --- Champs de glaciers ------------------------------------------------
    const nearField = glacierField({ rng, count: 120, spread: 210 });
    nearField.position.set(0, SEA_Y + 0.6, 26);
    ctx.add(varyField(nearField, rng), NO_SHADOW);
    deps.push(nearField);

    const midField = glacierField({ rng, count: 220, spread: 400 });
    midField.position.set(-30, SEA_Y, -300);
    ctx.add(varyField(midField, rng), NO_SHADOW);
    deps.push(midField);

    const farField = glacierField({ rng, count: 340, spread: 820 });
    farField.position.set(60, SEA_Y - 1, -620);
    ctx.add(varyField(farField, rng), NO_SHADOW);
    deps.push(farField);

    // --- Tours de glace (premier plan + masses d'echelle) ------------------
    const towers = new THREE.Group();
    towers.name = 'iceTowers';
    for (const t of TOWERS) {
      const tower = iceTower({
        rng,
        radius: t.r,
        height: t.h,
        slot: t.slot,
        blades: 2 + Math.floor(rng.next() * 3),
        stretch: t.s || [1, 1],
      });
      tower.position.set(t.p[0], SEA_Y, t.p[2]);
      towers.add(tower);
    }
    ctx.add(towers, NO_SHADOW);
    deps.push(towers);

    // --- Plaques de neige sur la banquise ----------------------------------
    const slabs = new THREE.Group();
    slabs.name = 'snowSlabs';
    for (let i = 0; i < 34; i++) {
      const [dx, dz] = rng.disc(430);
      const slab = snowShelf({ rng, radius: 6 + rng.next() * 16 });
      slab.position.set(dx, slab.position.y, dz - 90);
      slabs.add(slab);
    }
    ctx.add(calmSnow(slabs), NO_SHADOW);
    deps.push(slabs);

    const floes = iceField({ rng, count: 54, spread: 320, height: SEA_Y + 0.9 });
    floes.position.z = 10;
    ctx.add(calmSnow(floes), NO_SHADOW);
    deps.push(floes);

    // --- Chaine de montagnes de l'horizon ----------------------------------
    const ridge = new THREE.Group();
    ridge.name = 'distantRidge';
    for (const range of RANGES) {
      for (const x of range.xs) {
        const m = mountain({
          rng,
          height: range.h[0] + rng.next() * (range.h[1] - range.h[0]),
          radius: range.r[0] + rng.next() * (range.r[1] - range.r[0]),
          ridges: 8 + Math.floor(rng.next() * 3),
          snowLine: 0.5,
          snowSlot: 'iceDeep',
        });
        // Slots sans normal map : sur ces cones lointains, le bruit de la
        // normal map de rock/frost lit comme une trame textile.
        for (const part of m.children) {
          part.userData.slot = 'iceDeep';
          part.userData.color = 0x35566e;
          part.userData.materialOverrides = { roughness: 0.62, clearcoatRoughness: 0.5, envMapIntensity: 0.6 };
        }
        m.position.set(x + (rng.next() - 0.5) * 80, SEA_Y - 2, range.z + (rng.next() - 0.5) * 90);
        m.rotation.y = rng.next() * Math.PI * 2;
        // La calotte de la lib (2e enfant du groupe mountain) est legerement
        // plus large que le cone qui la porte : avec un slot clair elle depasse
        // en "ailettes". On la garde donc dans la meme famille de teinte que le
        // cone, juste plus claire : le raccord devient invisible et on lit
        // quand meme une ligne de neige sur les sommets.
        const cap = m.children[1];
        if (cap) cap.userData.color = 0x8fb0c8;
        ridge.add(m);
      }
    }
    ctx.add(ridge, NO_SHADOW);
    deps.push(ridge);

    // --- Nuages / brume ----------------------------------------------------
    // Bancs bas dans la vallee : donnent la profondeur aerienne au-dessus de la
    // glace sans jamais couvrir tout le cadre.
    const lowClouds = cloudBank({
      rng,
      count: 14,
      spread: 240,
      y: -3,
      size: [52, 16],
      color: 0x8fb6d4,
      opacityScale: 0.2,
    });
    lowClouds.position.z = -70;
    ctx.add(lowClouds, NO_SHADOW);
    deps.push(lowClouds);

    // Bande de brume a l'horizon : detache les montagnes de la banquise.
    const haze = cloudBank({
      rng,
      count: 10,
      spread: 420,
      y: 18,
      size: [200, 52],
      color: 0x7fa8c8,
      opacityScale: 0.1,
    });
    haze.position.z = -540;
    ctx.add(haze, NO_SHADOW);
    deps.push(haze);

    // --- Aurores boreales --------------------------------------------------
    const auroraGreen = createAuroraCurtain({
      width: 2200,
      height: 460,
      seed: 61,
      color: 0x2ff2a0,
      opacity: 0.5,
    });
    // Teinte de melange : par defaut la lib tire vers un violet fixe, ce qui
    // bleuit tous les rideaux. On garde le vert du cote vert du spectre.
    auroraGreen.userData.material.uniforms.uColorB.value.setHex(0x1c9c66);
    auroraGreen.position.set(-80, 300, -900);
    auroraGreen.rotation.set(0, 0.22, 0.1);
    ctx.add(auroraGreen);
    deps.push(auroraGreen);

    const auroraViolet = createAuroraCurtain({
      width: 2600,
      height: 600,
      seed: 97,
      color: 0x9a72ff,
      opacity: 0.3,
    });
    auroraViolet.userData.material.uniforms.uColorB.value.setHex(0x6a45e0);
    auroraViolet.position.set(230, 440, -1250);
    auroraViolet.rotation.set(0, -0.18, -0.09);
    ctx.add(auroraViolet);
    deps.push(auroraViolet);

    // --- Faisceaux volumetriques ------------------------------------------
    // Grands rayons derriere les montagnes (lumiere rasante d'aurore).
    const highShafts = createLightShafts({
      count: 7,
      length: 520,
      radius: 11,
      seed: 71,
      origin: [10, 290, -860],
      opacity: 0.032,
    });
    ctx.add(highShafts);
    deps.push(highShafts);

    // Rayons plus proches, qui traversent le champ de glaciers.
    const fieldShafts = createLightShafts({
      count: 6,
      length: 240,
      radius: 7,
      seed: 79,
      origin: [-20, 70, -250],
      opacity: 0.022,
    });
    ctx.add(fieldShafts);
    deps.push(fieldShafts);

    // --- Particules --------------------------------------------------------
    const snowWide = createSnowfall({ count: 2600, area: 400, height: 210, seed: 131, size: 0.4, opacity: 0.22 });
    snowWide.position.set(-20, SEA_Y, 40);
    ctx.add(snowWide);
    deps.push(snowWide);

    const snowNear = createSnowfall({ count: 3200, area: 250, height: 120, seed: 137, size: 0.26, opacity: 0.5 });
    snowNear.position.set(-20, SEA_Y + 4, 40);
    ctx.add(snowNear);
    deps.push(snowNear);

    const dust = createIceDust({ count: 600, area: 130, height: 40, seed: 149, size: 0.14 });
    dust.position.set(-20, SEA_Y + 1, 40);
    ctx.add(dust);
    deps.push(dust);

    // --- Animation ---------------------------------------------------------
    // Les aurores, faisceaux et particules animent deja leur uTime via leur
    // propre userData.update. Ici : derive des nuages + respiration tres legere
    // de l'etalonnage pour que la plaque reste vivante sans jamais "pomper".
    const cloudDrift = [];
    for (const c of [...lowClouds.children, ...haze.children]) {
      cloudDrift.push({
        mesh: c,
        speed: c.userData.driftSpeed,
        dir: c.userData.driftDir,
        x0: c.position.x,
        z0: c.position.z,
      });
    }

    ctx.controls.hemiIntensity = 1.05;
    ctx.controls.sunIntensity *= 0.82;
    const baseFog = ctx.controls.fogDensity;
    const baseSun = ctx.controls.sunIntensity;
    const baseBloom = ctx.controls.bloomStrength;
    const greenOpacity = auroraGreen.userData.material.uniforms.uOpacity;
    const violetOpacity = auroraViolet.userData.material.uniforms.uOpacity;
    const greenBase = greenOpacity.value;
    const violetBase = violetOpacity.value;

    return {
      deps,
      update(t) {
        const k = Math.min(1, Math.max(0, t / ctx.duration));

        for (const d of cloudDrift) {
          d.mesh.position.x = d.x0 + Math.cos(d.dir) * t * d.speed * 0.5;
          d.mesh.position.z = d.z0 + Math.sin(d.dir) * t * d.speed * 0.5;
        }

        // Legere respiration : le plan s'eclaircit d'un souffle vers l'aurore.
        ctx.controls.fogDensity = baseFog * (1 - 0.09 * k) + baseFog * 0.015 * Math.sin(t * 0.8);
        ctx.controls.sunIntensity = baseSun * (1 + 0.06 * k);
        ctx.controls.bloomStrength = baseBloom * (0.94 + 0.14 * k);
        ctx.controls.exposure = 0.94 + 0.03 * k;
        greenOpacity.value = greenBase * (1 + 0.1 * Math.sin(t * 0.65));
        violetOpacity.value = violetBase * (1 + 0.13 * Math.sin(t * 0.48 + 1.9));
      },
    };
  },
};
