/**
 * CONCEPT 1 — "Le hublot de l'icebreaker"
 * Equivalent, dans la video, du concept avion prive -> skyline de Londres ->
 * Big Ben : la camera sort d'un hublot, balaie le paysage, puis se pose sur un
 * point de interesse monumental (ici une cathedrale de glace).
 */
import * as THREE from 'three';
import {
  cabinInterior,
  crystalSpire,
  glacierField,
  iceField,
  glacialSea,
  mountain,
  cloudBank,
} from '../lib/geometry.js';
import { createSnowfall, createIceDust, createLightShafts, createAuroraCurtain } from '../lib/atmosphere.js';

const SEA_Y = -4.2;
const DECK_Y = -2.2;

/** Coque basse-polys de l'icebreaker : repere de lecture "on sort du bateau". */
function icebreakerHull(rng) {
  const group = new THREE.Group();
  group.name = 'icebreakerHull';

  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3.6, 0);
  hullShape.lineTo(-3.2, 6);
  hullShape.lineTo(-1.0, 11.5); // etrave
  hullShape.lineTo(1.0, 11.5);
  hullShape.lineTo(3.2, 6);
  hullShape.lineTo(3.6, 0);
  hullShape.closePath();
  const hull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hullShape, { depth: 2.0, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.35, bevelSegments: 1, steps: 1 }),
    null,
  );
  hull.geometry.rotateX(Math.PI / 2);
  hull.geometry.rotateY(Math.PI);
  hull.position.set(0, DECK_Y - 0.1, 13.5);
  hull.userData.slot = 'metal';
  group.add(hull);

  // Pont.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.3, 16), null);
  deck.position.set(0, DECK_Y - 0.15, 6.5);
  deck.userData.slot = 'metal';
  group.add(deck);

  // Superstructures.
  for (let i = 0; i < 3; i++) {
    const w = 5.6 - i * 0.9;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, 3.4), null);
    box.position.set(0, DECK_Y + 0.75 + i * 1.5, 14 - i * 2.6);
    box.userData.slot = 'dark';
    group.add(box);
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.14, 0.06), null);
    win.position.set(0, DECK_Y + 1.15 + i * 1.5, 12.3 - i * 2.6);
    win.userData.slot = 'emissive';
    win.userData.color = 0xffd9a0;
    group.add(win);
  }

  // Mat + feu de navigation.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.6, 6), null);
  mast.position.set(0, DECK_Y + 7.4, 11.2);
  mast.userData.slot = 'metal';
  group.add(mast);
  const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), null);
  lamp.position.set(0, DECK_Y + 9.75, 11.2);
  lamp.userData.slot = 'emissive';
  lamp.userData.color = 0xfff0c0;
  group.add(lamp);

  // Bollards / details pour la silhouette.
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.5, 5), null);
    b.position.set(-3.2 + (i % 2) * 6.4, DECK_Y + 0.25, 1 + Math.floor(i / 2) * 4.5);
    b.userData.slot = 'metal';
    group.add(b);
  }

  group.position.z = -2.5;
  return group;
}

export default {
  id: 'concept-1',
  index: 1,
  title: "Le hublot de l'icebreaker",
  subtitle: 'Sortie de cabine vers la cathedrale de glace',
  reference: 'Concept 1 de la video : hublot d\'avion -> skyline de Londres -> Big Ben.',
  duration: 10,
  fps: 30,
  size: [1280, 720],
  env: 'fjord',
  seed: 1101,
  backgroundIntensity: 0.3,
  environmentIntensity: 0.7,
  fog: { color: 0x5f93b8, density: 0.0019 },
  post: {
    grain: 0.055,
    bars: 0.058,
    frost: 0.34,
    chromatic: 0.0015,
    saturation: 1.16,
    exposure: 0.92,
    bloom: { strength: 0.44, radius: 0.82, threshold: 0.86 },
  },
  blockingBackground: 0x121a22,

  camera: {
    keyframes: [
      { t: 0.0, pos: [0.0, 0.12, 6.6], target: [0, 0.0, -60], fov: 40, ease: 'inOutSine' },
      { t: 1.6, pos: [0.0, 0.06, 4.6], target: [0, -0.02, -60], fov: 38, ease: 'inOutSine' },
      { t: 3.1, pos: [0.0, 0.02, 2.95], target: [0, -0.06, -60], fov: 38, ease: 'inOutSine' },
      { t: 4.3, pos: [0.0, -0.05, 1.05], target: [0, -0.6, -46], fov: 43, ease: 'dollyOut' },
      { t: 5.6, pos: [0.0, -0.15, -1.8], target: [0, -1.8, -40], fov: 46, ease: 'inOutSine' },
      { t: 7.3, pos: [0.6, 2.2, -13.0], target: [-1.0, -3.0, -56], fov: 50, ease: 'inOutSine' },
      { t: 8.9, pos: [3.4, 4.4, -44.0], target: [-2.0, 6.0, -120], fov: 46, ease: 'inOutSine' },
      { t: 10.0, pos: [6.0, 6.0, -76.0], target: [-4.0, 12.3, -140], fov: 42, ease: 'outCubic' },
    ],
  },

  /** Reperes narratifs : utilises par le site pour reveler les contenus. */
  beats: [
    { t: 0.0, label: 'Cabine', text: "On est encore a l'interieur. Le hublot cadre tout." },
    { t: 2.9, label: 'Le hublot', text: 'La banquise apparait dans le cercle de verre.' },
    { t: 4.6, label: 'Passage', text: "La camera traverse le hublot : la coque disparait du cadre." },
    { t: 7.3, label: 'Deploiement', text: 'Le fjord gelé se deploie, champ de banquise et brume.' },
    { t: 10.0, label: 'Monument', text: 'La cathedrale de glace ferme le plan.' },
  ],

  props(ctx) {
    const { rng } = ctx;
    const deps = [];

    // --- Interieur -------------------------------------------------------
    const cabin = cabinInterior({ rng, radius: 1.02, width: 8, height: 4.4, depth: 9 });
    ctx.add(cabin);
    deps.push(cabin);

    const hull = icebreakerHull(rng);
    ctx.add(hull);
    deps.push(hull);

    // --- Exterieur -------------------------------------------------------
    const sea = glacialSea({ size: 1600, segments: 120, rng });
    sea.position.y = SEA_Y;
    ctx.add(sea, { castShadow: false });
    deps.push(sea);

    const floes = iceField({ rng, count: 34, spread: 150, height: SEA_Y });
    ctx.add(floes);
    deps.push(floes);

    // Cathedrale de glace : point d'interet final.
    const cathedral = crystalSpire({ rng, height: 30, radius: 4.4 });
    cathedral.scale.setScalar(1.1);
    cathedral.position.set(-4, SEA_Y, -140);
    ctx.add(cathedral);
    deps.push(cathedral);

    // Couronne de fleches secondaires (profondeur du plan, jamais dans le
    // meme plan que l'hero : elles doivent rester plus petites a l'ecran).
    const satellites = new THREE.Group();
    satellites.name = 'satelliteSpires';
    const spireLayout = [
      [-30, -0.55, -235],
      [-58, 0.4, -290],
      [34, -0.3, -250],
      [64, 0.55, -330],
      [-18, 0.25, -390],
      [26, -0.6, -450],
    ];
    for (const [x, s, z] of spireLayout) {
      const sp = crystalSpire({ rng, height: 18 + rng.next() * 14, radius: 2.4 + rng.next() * 1.4 });
      sp.scale.setScalar(0.95 + rng.next() * 0.6);
      sp.position.set(x, SEA_Y, z);
      satellites.add(sp);
    }
    ctx.add(satellites);
    deps.push(satellites);

    // Glacier de fond (masse).
    const glacier = glacierField({ rng, count: 46, spread: 300 });
    glacier.position.set(0, SEA_Y - 1.5, -420);
    ctx.add(glacier);
    deps.push(glacier);

    // Relief lointain.
    const ridge = new THREE.Group();
    ridge.name = 'distantRidge';
    for (let i = 0; i < 9; i++) {
      const m = mountain({ rng, height: 34 + rng.next() * 42, radius: 80 + rng.next() * 70, ridges: 8, snowLine: 0.62, snowSlot: 'frost' });
      const a = -1.6 + (i / 8) * 3.2;
      m.position.set(Math.sin(a) * 400, SEA_Y - 10, -Math.cos(a) * 430);
      ridge.add(m);
    }
    ctx.add(ridge);
    deps.push(ridge);

    // Brume : bancs de nuages bas qui donnent la profondeur atmospherique.
    const clouds = cloudBank({ rng, count: 20, spread: 120, y: 3, size: [40, 16], color: 0x7aa3c4, opacityScale: 0.62 });
    clouds.position.z = -80;
    ctx.add(clouds);
    deps.push(clouds);

    const farClouds = cloudBank({ rng, count: 14, spread: 220, y: 34, size: [130, 34], color: 0x5f8cb0, opacityScale: 0.34 });
    farClouds.position.z = -300;
    ctx.add(farClouds);
    deps.push(farClouds);

    // Aurores.
    const aurora = createAuroraCurtain({ width: 1100, height: 260, seed: 61, color: 0x49e8c0, opacity: 0.42 });
    aurora.position.set(-80, 96, -520);
    ctx.add(aurora);
    deps.push(aurora);
    const aurora2 = createAuroraCurtain({ width: 1400, height: 320, seed: 91, color: 0x4f6aff, opacity: 0.26 });
    aurora2.position.set(-300, 152, -700);
    ctx.add(aurora2);
    deps.push(aurora2);

    // Faisceaux volumetriques.
    const shafts = createLightShafts({ count: 6, length: 150, radius: 6, seed: 71, origin: [0, 70, -200], opacity: 0.045 });
    ctx.add(shafts);
    deps.push(shafts);

    // Particules.
    const snow = createSnowfall({ count: 2800, area: 70, height: 34, seed: 13, size: 0.13, opacity: 0.9 });
    snow.position.set(0, -6, -6);
    ctx.add(snow);
    deps.push(snow);

    const dust = createIceDust({ count: 900, area: 16, height: 6, seed: 29, size: 0.07 });
    dust.position.set(0, -1, 2);
    ctx.add(dust);
    deps.push(dust);

    // Animation : derive douce des nuages + leger scintillement des lumieres.
    const cloudDrift = [];
    for (const c of [...clouds.children, ...farClouds.children]) {
      cloudDrift.push({ mesh: c, speed: c.userData.driftSpeed, dir: c.userData.driftDir, x0: c.position.x, z0: c.position.z });
    }
    const lamp = hull.children.find((c) => c.userData.slot === 'emissive');

    const baseSun = ctx.controls.sunIntensity;
    const baseBloom = ctx.controls.bloomStrength;

    return {
      deps,
      update(t) {
        for (const d of cloudDrift) {
          d.mesh.position.x = d.x0 + Math.cos(d.dir) * t * d.speed * 0.6;
          d.mesh.position.z = d.z0 + Math.sin(d.dir) * t * d.speed * 0.6;
        }
        if (lamp) lamp.scale.setScalar(1 + Math.sin(t * 2.4) * 0.16);
        // La lumiere s'ouvre progressivement quand on quitte la cabine.
        const openness = Math.min(1, Math.max(0, (t - 1.2) / 3.4));
        ctx.controls.sunIntensity = baseSun * (0.55 + 0.45 * openness);
        ctx.controls.bloomStrength = baseBloom * (0.75 + 0.35 * Math.min(1, Math.max(0, (t - 4.0) / 4.0)));
        ctx.controls.fogDensity = 0.0019 + 0.0007 * Math.min(1, Math.max(0, (t - 5.5) / 4.5));
        ctx.controls.frost = 0.34 + 0.1 * Math.max(0, 1 - t / 3);
      },
    };
  },
};
