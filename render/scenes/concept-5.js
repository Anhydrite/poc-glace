/**
 * CONCEPT 5 — "Survol du glacier" (plan plein ecran de fin)
 * Equivalent de la "full screen video" qui se deploie apres les blocs feature
 * du concept 4 dans la video.
 *
 * NOTE : squelette fonctionnel destine a etre complete.
 */
import { glacierField, glacialSea, cloudBank, mountain } from '../lib/geometry.js';
import { createSnowfall, createAuroraCurtain, createLightShafts } from '../lib/atmosphere.js';
import * as THREE from 'three';

export default {
  id: 'concept-5',
  index: 5,
  title: 'Survol du glacier',
  subtitle: 'Plan plein ecran, respiration finale',
  reference: 'Plan plein ecran de deploiement (fin du concept 4 de la video).',
  duration: 6,
  fps: 30,
  size: [1280, 720],
  env: 'fjord',
  seed: 5505,
  fog: { color: 0xa8d6ee, density: 0.0045 },
  post: { grain: 0.05, bars: 0.058, frost: 0.35, bloom: { strength: 0.6, radius: 0.85, threshold: 0.72 } },
  camera: {
    keyframes: [
      { t: 0, pos: [0, 14, 40], target: [0, 4, 0], fov: 44, ease: 'inOutSine' },
      { t: 6, pos: [10, 9, -30], target: [0, 2, -70], fov: 46, ease: 'inOutSine' },
    ],
  },
  beats: [
    { t: 0, label: 'Survol', text: 'Le champ de glaciers.' },
    { t: 6, label: 'Horizon', text: "L'horizon se referme." },
  ],
  props(ctx) {
    const { rng } = ctx;
    const sea = glacialSea({ size: 900, segments: 80, rng });
    sea.position.y = -3;
    ctx.add(sea);

    const field = glacierField({ rng, count: 120, spread: 200 });
    ctx.add(field);

    const ridge = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const m = mountain({ rng, height: 60 + rng.next() * 60, radius: 40 + rng.next() * 30, ridges: 9 });
      m.position.set(-260 + i * 105, -6, -330 - rng.next() * 90);
      ridge.add(m);
    }
    ctx.add(ridge);

    const clouds = cloudBank({ rng, count: 26, spread: 120, y: 4, size: [50, 18] });
    clouds.position.z = -60;
    ctx.add(clouds);

    const aurora = createAuroraCurtain({ width: 800, height: 200, seed: 111, color: 0x63f2d4, opacity: 0.42 });
    aurora.position.set(0, 70, -520);
    ctx.add(aurora);

    const shafts = createLightShafts({ count: 7, length: 90, radius: 8, seed: 123, origin: [0, 45, -120] });
    ctx.add(shafts);

    const snow = createSnowfall({ count: 2400, area: 90, height: 40, seed: 131, size: 0.12 });
    snow.position.set(0, -8, -20);
    ctx.add(snow);

    return {
      update(t) {
        ctx.controls.fogDensity = 0.0045 + 0.0006 * Math.sin(t * 0.4);
      },
    };
  },
};
