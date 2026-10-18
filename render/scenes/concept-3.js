/**
 * CONCEPT 3 — "La relique de glace explosee"
 * Equivalent du concept 3 de la video : animation produit "exploded view".
 *
 * NOTE : squelette fonctionnel destine a etre complete.
 */
import { explodedArtifact, glacialSea } from '../lib/geometry.js';
import { createIceDust } from '../lib/atmosphere.js';

export default {
  id: 'concept-3',
  index: 3,
  title: 'La relique de glace explosee',
  subtitle: 'Vue eclatee, animation produit',
  reference: 'Concept 3 de la video : casque VR explose, orbite a 45 degres.',
  duration: 5,
  fps: 30,
  size: [1280, 720],
  env: 'studio',
  seed: 3303,
  fog: { color: 0x9ecbe6, density: 0.003 },
  post: { grain: 0.06, bars: 0.058, frost: 0.3, bloom: { strength: 0.6, radius: 0.7, threshold: 0.68 } },
  camera: {
    keyframes: [
      { t: 0, pos: [0, 0.4, 5.2], target: [0, 0, 0], fov: 38, ease: 'inOutSine' },
      { t: 5, pos: [3.2, 1.6, 3.6], target: [0, 0.1, 0], fov: 44, ease: 'inOutSine' },
    ],
  },
  beats: [
    { t: 0, label: 'Assemble', text: 'La relique est intacte.' },
    { t: 5, label: 'Eclate', text: 'Les couches se separent.' },
  ],
  props(ctx) {
    const { rng } = ctx;
    const base = glacialSea({ size: 200, segments: 30, rng });
    base.position.y = -2.4;
    ctx.add(base);

    const artifact = explodedArtifact({ rng, scale: 1.15 });
    artifact.position.y = 0.4;
    ctx.add(artifact);

    const dust = createIceDust({ count: 600, area: 8, height: 5, seed: 41, size: 0.06 });
    dust.position.y = 0.5;
    ctx.add(dust);

    return {
      update(t) {
        const k = Math.min(1, Math.max(0, (t - 0.8) / 2.6));
        const eased = k * k * (3 - 2 * k);
        artifact.userData.setExplode(eased);
        artifact.rotation.y = t * 0.12;
      },
    };
  },
};
