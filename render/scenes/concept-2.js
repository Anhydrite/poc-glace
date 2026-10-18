/**
 * CONCEPT 2 — "La fenetre du tunnel de glace"
 * Equivalent du concept 2 de la video : on sort par la fenetre, on decouvre un
 * pic qui emerge des nuages, puis la camera plonge dans les nuages et tout
 * disparait dans le blanc. Ce blanc sert de transition vers la section suivante.
 *
 * NOTE : ce fichier est un squelette fonctionnel destine a etre complete.
 */
import { mountain, cloudBank, cloudSea, shardGeometry } from '../lib/geometry.js';
import { createSnowfall, createLightShafts } from '../lib/atmosphere.js';
import * as THREE from 'three';

export default {
  id: 'concept-2',
  index: 2,
  title: 'La fenetre du tunnel de glace',
  subtitle: 'Pan dans les nuages de givre, fondu au blanc',
  reference: 'Concept 2 de la video : fenetre -> montagne dans les nuages -> fondu au blanc.',
  duration: 10,
  fps: 30,
  size: [1280, 720],
  env: 'tundra',
  seed: 2202,
  fog: { color: 0xdceeff, density: 0.006 },
  post: { grain: 0.05, bars: 0.058, frost: 0.55, bloom: { strength: 0.5, radius: 0.8, threshold: 0.75 } },
  camera: {
    keyframes: [
      { t: 0, pos: [0, 0, 4], target: [0, 0, -20], fov: 40, ease: 'inOutSine' },
      { t: 10, pos: [0, -10, -40], target: [0, 0, -80], fov: 52, ease: 'inOutSine' },
    ],
  },
  beats: [
    { t: 0, label: 'Fenetre', text: 'Depuis le tunnel.' },
    { t: 10, label: 'Blanc', text: 'Fondu au blanc.' },
  ],
  props(ctx) {
    const { rng } = ctx;
    const peak = mountain({ rng, height: 34, radius: 20, ridges: 9 });
    peak.position.set(0, -22, -60);
    ctx.add(peak);

    const clouds = cloudBank({ rng, count: 28, spread: 70, y: 0, size: [40, 14] });
    clouds.position.z = -55;
    ctx.add(clouds);

    const floor = cloudSea({ rng, size: 320, y: -14 });
    ctx.add(floor);

    for (let i = 0; i < 10; i++) {
      const r = new THREE.Mesh(shardGeometry({ radius: 0.9, height: 4.5, sides: 5, rng, tip: 0.4 }));
      const a = rng.next() * Math.PI * 2;
      r.position.set(Math.cos(a) * 4, -2 + rng.next() * 4, Math.sin(a) * 4);
      r.userData.slot = 'ice';
      ctx.add(r);
    }

    const snow = createSnowfall({ count: 1800, area: 60, height: 30, seed: 5, size: 0.12 });
    snow.position.set(0, -8, -10);
    ctx.add(snow);

    const shafts = createLightShafts({ count: 5, length: 80, radius: 7, seed: 17, origin: [0, 40, -60] });
    ctx.add(shafts);

    return {
      update(t) {
        const k = Math.min(1, Math.max(0, (t - 6.5) / 3.0));
        ctx.controls.whiteout = k * k;
        ctx.controls.fogDensity = 0.006 + 0.05 * k * k;
      },
    };
  },
};
