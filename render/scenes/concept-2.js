/**
 * CONCEPT 2 — "La fenetre du tunnel de glace"
 * Equivalent du concept 2 de la video : la camera sort par une fenetre, revele
 * un pic qui emerge d'une mer de nuages, puis plonge dans les nuages jusqu'a un
 * fondu total au blanc qui sert de transition vers la section suivante du site.
 *
 * LECTURE DU PLAN
 *   t=0        interieur du tunnel de glace, l'ouverture ovale givree ferme le
 *              plan au loin (petit point clair au bout du boyau).
 *   t=2.5      la camera s'est avancee : l'ouverture ovale cadre presque toute
 *              l'image et laisse apparaitre le pic au dela.
 *   t=3.4      traversee de l'ouverture : la paroi et le tunnel sortent du champ.
 *   t=4-8      le pic est revele, centre, silhouette facettee au-dessus de la mer
 *              de nuages ; les faisceaux et l'aurore donnent l'echelle.
 *   t=8.2-9.0  plongee dans les nuages, montee en densite de brouillard et
 *              bascule vers le blanc.
 *   9.0-10.0   image BLANCHE uniforme (transition de section pour le site),
 *              ctx.controls.whiteout vaut exactement 1.0.
 *
 * Le tunnel est retourne (rotation Y de PI) : son ouverture fait face a la
 * camera (qui regarde vers -Z) et la montagne se trouve au dela de l'ouverture.
 */
import * as THREE from 'three';
import {
  iceTunnel,
  mountain,
  cloudBank,
  cloudSea,
  shardGeometry,
} from '../lib/geometry.js';
import {
  createSnowfall,
  createIceDust,
  createLightShafts,
  createAuroraCurtain,
} from '../lib/atmosphere.js';

/* ------------------------------------------------------------------ */
/* Echelle du decor                                                    */
/* ------------------------------------------------------------------ */

const TUNNEL_LENGTH = 34;
const TUNNEL_RADIUS = 4.2;
const OPENING_RADIUS = 2.7; // demi-axe vertical de l'ouverture ovale
const OPENING_SCALE_X = 1.24; // l'ouverture est plus large que haute
const OPENING_Y = 0.2; // centre de l'ouverture (hauteur)
const WALL_THICKNESS = 0.5;
// Plan (monde) de la paroi percee. La camera demarre a z>0 et regarde vers -Z.
const OPENING_Z = 0.42;

const PEAK = { x: 0, baseY: -16, z: -78, height: 42, radius: 22 };

const FOG_BASE = { color: 0xcfe4f2, density: 0.0056 };
const FOG_BASE_COLOR = new THREE.Color(FOG_BASE.color);
const WHITE = new THREE.Color(0xffffff);

// Fondu au blanc : atteint 1.0 a 9.0 et y reste jusqu'a 10.0 (derniere seconde
// blanche, exigee par le transition de section du site).
const WHITE_START = 8.2;
const WHITE_FULL = 9.0;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* ------------------------------------------------------------------ */
/* Fabriques locales                                                   */
/* ------------------------------------------------------------------ */

/** Paroi de glace percée d'une ouverture ovale (la "fenetre" du tunnel). */
function openingWall({ outer, holeX, holeY, thickness }) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, holeX, holeY, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.16,
    bevelThickness: 0.14,
    bevelSegments: 1,
    curveSegments: 44,
  });
  geo.translate(0, 0, -thickness / 2);
  const mesh = new THREE.Mesh(geo);
  mesh.userData.slot = 'iceDeep';
  // Volume massif : on coupe la transmission (trop couteuse pour un si gros mesh).
  mesh.userData.materialOverrides = { transmission: 0, envMapIntensity: 0.85 };
  return mesh;
}

/** Eclats de givre disposes en couronne sur le pourtour de l'ouverture.
 *  Coordonnees locales au tunnel (le groupe est retourne d'un PI en Y). */
function openingFrost(rng, { frameR, scaleX, count = 24, z }) {
  const group = new THREE.Group();
  group.name = 'openingFrost';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.22;
    const rr = frameR * (1.04 + rng() * 0.34);
    const x = Math.cos(a) * rr * scaleX;
    const y = Math.sin(a) * rr;
    const shard = new THREE.Mesh(
      shardGeometry({ radius: 0.1 + rng() * 0.16, height: 0.4 + rng() * 0.9, sides: 5, rng, tip: 0.35 }),
    );
    shard.position.set(x, OPENING_Y + y, z + (rng() - 0.5) * 0.24);
    shard.rotation.set((rng() - 0.5) * 1.2, Math.atan2(x, y) + rng() * 2, (rng() - 0.5) * 1.2);
    shard.userData.slot = 'frost';
    group.add(shard);
  }
  return group;
}

/** Cristaux luminescents sur les parois du tunnel (lecture "glace vive").
 *  Positionnes le long de la courbe du tunnel, donc en coordonnees locales. */
function tunnelGlints(rng, { curve, count = 16 }) {
  const group = new THREE.Group();
  group.name = 'tunnelGlints';
  for (let i = 0; i < count; i++) {
    const u = 0.05 + (i / count) * 0.92;
    const p = curve.getPointAt(Math.min(0.999, u));
    const a = rng() * Math.PI * 2;
    const m = new THREE.Mesh(
      shardGeometry({ radius: 0.07 + rng() * 0.08, height: 0.2 + rng() * 0.3, sides: 5, rng, tip: 0.4 }),
    );
    m.position.set(
      p.x + Math.cos(a) * TUNNEL_RADIUS * 0.9,
      p.y + Math.sin(a) * TUNNEL_RADIUS * 0.9,
      p.z,
    );
    m.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    m.userData.slot = 'emissive';
    m.userData.color = 0x8fdcff;
    group.add(m);
  }
  return group;
}

/** Eclatement de givre : les eclats partent du centre, s'ecartent puis se
 *  dissolvent (mise a l'echelle -> invisible). Pur fonction de t. */
function frostBurst(rng, { start, duration = 1.1, center, spread = 2.6, count = 12, slot = 'frost' }) {
  const group = new THREE.Group();
  group.name = 'frostBurst';
  const parts = [];
  for (let i = 0; i < count; i++) {
    const dir = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
    if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
    dir.normalize();
    const shard = new THREE.Mesh(
      shardGeometry({ radius: 0.06 + rng() * 0.1, height: 0.26 + rng() * 0.46, sides: 5, rng, tip: 0.3 }),
    );
    shard.position.set(center[0], center[1], center[2]);
    shard.visible = false;
    shard.userData.slot = slot;
    group.add(shard);
    parts.push({ shard, dir, dist: spread * (0.35 + rng() * 0.65) });
  }
  group.userData.update = (t) => {
    const k = (t - start) / duration;
    const active = k >= 0 && k <= 1;
    const e = active ? k * k * (3 - 2 * k) : 0;
    for (const p of parts) {
      p.shard.visible = active;
      if (!active) continue;
      p.shard.position.set(
        center[0] + p.dir.x * p.dist * e,
        center[1] + p.dir.y * p.dist * e,
        center[2] + p.dir.z * p.dist * e,
      );
      p.shard.scale.setScalar(Math.max(0.02, 1 - e));
    }
  };
  return group;
}

/** Remplace la matiere "rock" bruitee du helper par une glace vive facettee :
 *  la silhouette du pic doit rester nette (pas de bruit de normal map). */
function icyPeak(m) {
  for (const c of m.children) {
    if (c.userData.slot === 'rock') {
      c.userData.slot = 'iceDeep';
      c.userData.materialOverrides = { transmission: 0, envMapIntensity: 0.85, roughness: 0.36 };
    } else if (c.userData.slot === 'snow') {
      c.userData.slot = 'figure';
      c.userData.materialOverrides = { transmission: 0, envMapIntensity: 1.15 };
    }
  }
  return m;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
export default {
  id: 'concept-2',
  index: 2,
  title: 'La fenetre du tunnel de glace',
  subtitle: "Sortie par l'ouverture, pic dans les nuages, fondu au blanc",
  reference: 'Concept 2 de la video : fenetre -> montagne dans les nuages -> fondu au blanc.',

  /** Plage du fondu au blanc, consommee par le site pour sa propre transition. */
  whiteout: [8.2, 9.0],
  duration: 10,
  fps: 30,
  size: [1280, 720],
  env: 'tundra',
  seed: 2202,
  backgroundIntensity: 0.5,
  environmentIntensity: 0.9,
  fog: { color: FOG_BASE.color, density: FOG_BASE.density },
  post: {
    grain: 0.05,
    bars: 0.058,
    frost: 0.46,
    chromatic: 0.0014,
    saturation: 1.15,
    exposure: 1.0,
    bloom: { strength: 0.52, radius: 0.82, threshold: 0.72 },
  },
  blockingBackground: 0x141c24,

  camera: {
    keyframes: [
      // Dans le tunnel, l'ouverture est un petit ovale clair au bout du boyau.
      { t: 0.0, pos: [0.0, 0.35, 26.5], target: [0.0, 0.45, -28], fov: 44, ease: 'inOutSine' },
      { t: 1.4, pos: [0.0, 0.42, 20.0], target: [0.0, 0.7, -34], fov: 44, ease: 'inOutSine' },
      // L'ouverture cadre l'image et laisse voir le pic au dela.
      { t: 2.5, pos: [0.08, 0.62, 9.6], target: [0.0, 1.8, -46], fov: 46, ease: 'inOutSine' },
      // Traversee : la paroi et le tunnel sortent du champ.
      { t: 3.4, pos: [0.0, 1.15, -1.6], target: [0.0, 5.0, -60], fov: 48, ease: 'inOutSine' },
      { t: 4.4, pos: [0.0, 2.1, -9.5], target: [0.0, 18.0, -78], fov: 47, ease: 'inOutSine' },
      // Le pic, centre et plein cadre.
      { t: 5.5, pos: [0.0, 3.0, -17.5], target: [0.0, 23.0, -78], fov: 46, ease: 'inOutSine' },
      { t: 6.8, pos: [0.5, 3.7, -25.5], target: [0.0, 24.0, -78], fov: 47, ease: 'inOutSine' },
      // Plongee dans la mer de nuages.
      { t: 8.2, pos: [0.3, 2.4, -33.0], target: [0.0, 8.0, -76], fov: 50, ease: 'inOutQuad' },
      { t: 10.0, pos: [0.0, -12.5, -47.0], target: [0.0, -18.0, -68], fov: 56, ease: 'inOutQuad' },
    ],
  },

  /** Reperes narratifs utilises par le site pour reveler les contenus. */
  beats: [
    { t: 0.0, label: 'Tunnel', text: "On est a l'interieur du tunnel de glace, l'ouverture ferme le plan." },
    { t: 2.5, label: 'Ouverture', text: "L'ouverture ovale givree cadre le paysage." },
    { t: 3.4, label: 'Passage', text: 'La camera traverse la fenetre : le tunnel sort du champ.' },
    { t: 5.5, label: 'Le pic', text: 'Le pic emerge de la mer de nuages, centre et facette.' },
    { t: 8.2, label: 'Plongee', text: 'La camera plonge dans les nuages.' },
    { t: 10.0, label: 'Blanc', text: 'Fondu total au blanc : transition vers la section suivante.' },
  ],

  props(ctx) {
    const { rng } = ctx;
    const deps = [];

    /* --- Tunnel de glace ------------------------------------------------ */
    const tunnel = iceTunnel({
      rng,
      length: TUNNEL_LENGTH,
      radius: TUNNEL_RADIUS,
      openingRadius: OPENING_RADIUS,
    });
    // Origine du tunnel (local z=0) posee au plan de l'ouverture, puis retournee
    // pour faire face a la camera (qui regarde vers -Z).
    tunnel.position.set(0, 0, OPENING_Z);
    tunnel.rotation.y = Math.PI;

    // Le boyau massif ne transmet pas (cout) et ne projette pas d'ombre.
    for (const c of tunnel.children) {
      if (c.isMesh && c.userData.slot === 'iceDeep') {
        c.userData.materialOverrides = { transmission: 0, envMapIntensity: 0.85 };
      }
    }

    // Le helper sème 14 eclats directement sur les parois : brut, un eclat proche
    // de la camera remplit l'image d'un aplat bleu clair qui lit comme un bloc
    // flottant. On n'en garde qu'un sur trois, recale sur la paroi, reduit, et
    // teinte comme la glace profonde du boyau : ce sont des concretions, pas des
    // volumes poses dans l'air.
    let ribIndex = 0;
    for (const c of tunnel.children) {
      if (c.isMesh && c.userData.slot === 'ice') {
        if (ribIndex++ % 3 !== 0) {
          c.visible = false;
          continue;
        }
        c.scale.multiplyScalar(0.22);
        c.position.x *= 1.18;
        c.position.y *= 1.18;
        // Meme matiere que la paroi du boyau : les concretions lisent comme un
        // relief de la glace profonde, pas comme des blocs poses dans l'air.
        // (Et pas de transmission : un seul materiau transmissif suffit a
        // declencher une passe de rendu supplementaire de toute la scene.)
        c.userData.slot = 'iceDeep';
        c.userData.materialOverrides = { transmission: 0, roughness: 0.42 };
      }
    }

    // Encadrement givre de l'ouverture : recale sur la face interieure de la
    // paroi (le helper le posait a l'exterieur, donc invisible de l'interieur).
    // Le tunnel est retourne d'un PI en Y : worldZ = OPENING_Z - localZ.
    const localZ = (worldZ) => OPENING_Z - worldZ;
    const WALL_FACE_Z = OPENING_Z + WALL_THICKNESS * 0.5; // face cote camera
    const frame = tunnel.children.find((c) => c.userData.slot === 'frost');
    const frameR = frame ? frame.geometry.parameters.radius : OPENING_RADIUS * 1.05;
    if (frame) {
      frame.scale.set(OPENING_SCALE_X, 1, 1);
      frame.position.set(0, OPENING_Y, localZ(WALL_FACE_Z - 0.05));
    }

    // Paroi percee + liseré lumineux froid autour de l'ouverture.
    const wall = openingWall({
      outer: 4.3,
      holeX: frameR * OPENING_SCALE_X,
      holeY: frameR,
      thickness: WALL_THICKNESS,
    });
    wall.position.set(0, OPENING_Y, 0);
    tunnel.add(wall);

    const lip = new THREE.Mesh(new THREE.TorusGeometry(frameR * 0.94, 0.05, 6, 48));
    lip.scale.set(OPENING_SCALE_X, 1, 1);
    lip.position.set(0, OPENING_Y, localZ(WALL_FACE_Z + 0.03));
    lip.userData.slot = 'emissive';
    lip.userData.color = 0x9fe8ff;
    tunnel.add(lip);

    // Givre en couronne + cristaux luminescents dans le boyau.
    tunnel.add(openingFrost(rng, { frameR, scaleX: OPENING_SCALE_X, count: 24, z: localZ(WALL_FACE_Z + 0.06) }));
    tunnel.add(tunnelGlints(rng, { curve: tunnel.userData.curve, count: 16 }));

    tunnel.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = true;
      }
    });
    ctx.add(tunnel);
    deps.push(tunnel);

    // Lumiere interieure : le tunnel ne doit jamais etre un aplat noir.
    const tunnelLights = new THREE.Group();
    tunnelLights.name = 'tunnelLights';
    const lightLayout = [
      { pos: [0, 2.6, 22.0], color: 0xbfe8ff, intensity: 30, dist: 30 },
      { pos: [0, -1.4, 13.0], color: 0x9fd6f2, intensity: 16, dist: 24 },
      { pos: [0, 2.2, 3.4], color: 0xcdeeff, intensity: 18, dist: 20 },
    ];
    for (const l of lightLayout) {
      const p = new THREE.PointLight(l.color, ctx.blocking ? 0 : l.intensity, l.dist, 2.0);
      p.position.set(l.pos[0], l.pos[1], l.pos[2]);
      tunnelLights.add(p);
    }
    ctx.add(tunnelLights);
    deps.push(tunnelLights);

    /* --- Montagne heroique --------------------------------------------- */
    const peak = icyPeak(mountain({
      rng,
      height: PEAK.height,
      radius: PEAK.radius,
      ridges: 11,
      snowLine: 0.34,
      snowSlot: 'snow',
    }));
    peak.position.set(PEAK.x, PEAK.baseY, PEAK.z);
    ctx.add(peak);
    deps.push(peak);
    // Pics secondaires : profondeur du plan, toujours plus petits a l'ecran.
    const satellites = new THREE.Group();
    satellites.name = 'satellitePeaks';
    const satLayout = [
      [-72, 0.62, -150],
      [66, 0.7, -168],
      [-128, 0.5, -236],
      [120, 0.56, -250],
      [-40, 0.42, -320],
      [44, 0.46, -340],
    ];
    for (const [x, s, z] of satLayout) {
      const m = mountain({
        rng,
        height: PEAK.height * s,
        radius: PEAK.radius * (0.6 + rng() * 0.35),
        ridges: 9,
        snowLine: 0.3,
        snowSlot: 'snow',
      });
      m.position.set(x, PEAK.baseY - 4, z);
      satellites.add(icyPeak(m));
    }
    ctx.add(satellites);
    deps.push(satellites);

    // Relief de premier plan : donne une ligne d'horizon lisible dans
    // l'ouverture a t=0 et une assise au pic pendant le revele.
    const foothills = new THREE.Group();
    foothills.name = 'foothills';
    const foothillLayout = [
      [-30, 11, -68],
      [8, 9, -60],
      [34, 12, -72],
    ];
    for (const [x, h, z] of foothillLayout) {
      const m = icyPeak(mountain({ rng, height: h, radius: h * 1.1, ridges: 8, snowLine: 0.5, snowSlot: 'snow' }));
      m.position.set(x, PEAK.baseY + 1, z);
      foothills.add(m);
    }
    ctx.add(foothills);
    deps.push(foothills);

    /* --- Mer de nuages -------------------------------------------------- */
    // Mer de nuages : couche dense sous laquelle la camera plongera.
    const floor = cloudSea({ rng, size: 300, y: -7, rows: 42 });
    // La nappe doit lire comme une mer de nuages claire (le helper laisse la
    // couleur par defaut, trop grise) : on l'eclaircit et on la densifie.
    for (const c of floor.children) {
      c.userData.materialOverrides = { color: 0xd9e9f6, soft: 0.36 };
      c.userData.opacity = Math.min(0.9, (c.userData.opacity ?? 0.4) * 1.35);
    }
    ctx.add(floor);
    deps.push(floor);

    // Bancs qui viennent laper la base du pic (le "revele" du concept).
    const bankA = cloudBank({
      rng,
      count: 30,
      spread: 82,
      y: -5,
      size: [40, 13],
      color: 0xc4dbec,
      opacityScale: 1.0,
    });
    bankA.position.set(0, 0, -44);
    ctx.add(bankA);
    deps.push(bankA);

    // Nappe accrochee a la base du pic : il emerge de la mer de nuages.
    const baseMist = cloudBank({
      rng,
      count: 22,
      spread: 62,
      y: -2,
      size: [56, 17],
      color: 0xcfe3f2,
      opacityScale: 0.9,
    });
    baseMist.position.set(0, 0, -70);
    ctx.add(baseMist);
    deps.push(baseMist);

    const bankB = cloudBank({
      rng,
      count: 16,
      spread: 150,
      y: 7,
      size: [72, 22],
      color: 0xadc8dd,
      opacityScale: 0.5,
    });
    bankB.position.set(0, 0, -125);
    ctx.add(bankB);
    deps.push(bankB);

    const bankC = cloudBank({
      rng,
      count: 10,
      spread: 220,
      y: 26,
      size: [140, 38],
      color: 0x9dbdd6,
      opacityScale: 0.26,
    });
    bankC.position.set(0, 0, -230);
    ctx.add(bankC);
    deps.push(bankC);

    // Petit banc juste au dela de l'ouverture : vend l'emergence du pic.
    const nearClouds = cloudBank({
      rng,
      count: 12,
      spread: 28,
      y: -2.5,
      size: [20, 7],
      color: 0xc7dced,
      opacityScale: 0.75,
    });
    nearClouds.position.set(0, 0, -14);
    ctx.add(nearClouds);
    deps.push(nearClouds);

    /* --- Ciel : aurore discrete + faisceaux ----------------------------- */
    const aurora = createAuroraCurtain({ width: 950, height: 220, seed: 71, color: 0x8fe9ff, opacity: 0.2 });
    aurora.position.set(-60, 106, -560);
    ctx.add(aurora);
    deps.push(aurora);

    const aurora2 = createAuroraCurtain({ width: 1350, height: 280, seed: 97, color: 0xb7d4ff, opacity: 0.1 });
    aurora2.position.set(-240, 176, -760);
    ctx.add(aurora2);
    deps.push(aurora2);

    const shafts = createLightShafts({
      count: 6,
      length: 150,
      radius: 7,
      seed: 41,
      origin: [0, 58, -120],
      opacity: 0.05,
      color: 0xbfe8ff,
    });
    ctx.add(shafts);
    deps.push(shafts);

    /* --- Particules ----------------------------------------------------- */
    const snow = createSnowfall({ count: 2600, area: 92, height: 44, seed: 13, size: 0.13, opacity: 0.85 });
    snow.position.set(0, -10, -28);
    ctx.add(snow);
    deps.push(snow);

    const dust = createIceDust({ count: 900, area: 14, height: 6, seed: 29, size: 0.07 });
    dust.position.set(0, 0.4, 8);
    ctx.add(dust);
    deps.push(dust);

    /* --- Eclatements de givre ------------------------------------------- */
    const bursts = new THREE.Group();
    bursts.name = 'frostBursts';
    bursts.add(frostBurst(rng, { start: 1.5, duration: 1.3, center: [0, 0.5, 6.0], spread: 3.0, count: 12 }));
    bursts.add(frostBurst(rng, { start: 2.7, duration: 1.1, center: [0.2, 0.4, 1.2], spread: 3.4, count: 16 }));
    bursts.add(frostBurst(rng, { start: 3.5, duration: 1.2, center: [0, 0.8, -3.5], spread: 5.5, count: 18 }));
    ctx.add(bursts);
    deps.push(bursts);

    /* --- Voile blanc de la passe blocking -------------------------------- */
    // Le fondu au blanc est un post-traitement (absent en blocking). Pour que le
    // previz montre aussi la transition, on plaque un voile blanc devant la
    // camera, uniquement dans cette passe.
    let veil = null;
    if (ctx.blocking) {
      const veilMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), veilMat);
      veil.name = 'previzWhiteVeil';
      veil.frustumCulled = false;
      veil.renderOrder = 999;
      veil.userData.keepMaterial = true;
      veil.position.set(0, 0, -0.5);
      ctx.camera.add(veil);
      ctx.scene.add(ctx.camera); // la camera doit etre dans le graphe pour ses enfants
    }

    /* --- Animation ------------------------------------------------------- */
    const cloudDrift = [];
    for (const c of [
      ...floor.children,
      ...bankA.children,
      ...baseMist.children,
      ...bankB.children,
      ...bankC.children,
      ...nearClouds.children,
    ]) {
      cloudDrift.push({ mesh: c, speed: c.userData.driftSpeed, dir: c.userData.driftDir, x0: c.position.x, z0: c.position.z });
    }

    const glints = [];
    const glintGroup = tunnel.children.find((c) => c.name === 'tunnelGlints');
    if (glintGroup) {
      glintGroup.children.forEach((m, i) => {
        glints.push({ mesh: m, base: 0.8 + rng() * 0.5, rate: 1.2 + rng() * 1.4, phase: i * 0.9 });
      });
    }

    const baseBloom = ctx.controls.bloomStrength;
    const baseSun = ctx.controls.sunIntensity;

    return {
      deps,
      update(t) {
        // Derive des nuages (deterministe).
        for (const d of cloudDrift) {
          d.mesh.position.x = d.x0 + Math.cos(d.dir) * t * d.speed * 0.5;
          d.mesh.position.z = d.z0 + Math.sin(d.dir) * t * d.speed * 0.5;
        }

        // Scintillement des cristaux de glace.
        for (const g of glints) {
          g.mesh.scale.setScalar(g.base * (0.72 + 0.42 * Math.sin(t * g.rate + g.phase)));
        }

        // Fondu au blanc : 8.2 -> 9.0, puis blanc tenu jusqu'a 10.0.
        const w = clamp01((t - WHITE_START) / (WHITE_FULL - WHITE_START));
        const eased = w * w * (3 - 2 * w);
        ctx.controls.whiteout = eased;
        ctx.controls.fogDensity = FOG_BASE.density + 0.055 * eased * eased;
        ctx.controls.fogColor.copy(FOG_BASE_COLOR).lerp(WHITE, eased);

        // Objectif : givre marque dans le tunnel, qui se degage a l'exterieur.
        const outside = clamp01((t - 1.6) / 2.2);
        ctx.controls.frost = 0.46 - 0.16 * outside;
        ctx.controls.bloomStrength = baseBloom * (0.8 + 0.35 * outside);
        ctx.controls.sunIntensity = baseSun * (0.9 + 0.15 * outside);

        if (veil) veil.material.opacity = eased;
      },
    };
  },
};
