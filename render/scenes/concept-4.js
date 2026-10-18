/**
 * CONCEPT 4 — "Le gardien de glace"
 * Equivalent du concept 4 de la video : personnage face camera, sort sa lame,
 * la camera tourne autour, recule, puis balaie a gauche puis a droite pour
 * laisser la place aux blocs "feature" de chaque cote.
 *
 * NOTE : squelette fonctionnel destine a etre complete.
 */
import { iceGuardian, glacialSea, iceField } from '../lib/geometry.js';
import { createSnowfall, createIceDust, createLightShafts } from '../lib/atmosphere.js';

export default {
  id: 'concept-4',
  index: 4,
  title: 'Le gardien de glace',
  subtitle: 'Rotation de camera, blocs feature gauche / droite',
  reference: 'Concept 4 de la video : samourai, orbite, pan gauche puis droite.',
  duration: 12,
  fps: 30,
  size: [1280, 720],
  env: 'fjord',
  seed: 4404,
  fog: { color: 0x93c9e8, density: 0.0055 },
  post: { grain: 0.055, bars: 0.058, frost: 0.45, bloom: { strength: 0.65, radius: 0.8, threshold: 0.7 } },
  camera: {
    keyframes: [
      { t: 0, pos: [0, 0.6, 6.2], target: [0, 0.4, 0], fov: 38, ease: 'inOutSine' },
      { t: 3, pos: [4.6, 1.2, 3.6], target: [0, 0.3, 0], fov: 38, ease: 'inOutSine' },
      { t: 6, pos: [0.6, 0.9, 7.4], target: [0, 0.2, 0], fov: 40, ease: 'inOutSine' },
      { t: 9, pos: [-4.2, 0.8, 5.2], target: [1.4, 0.3, 0], fov: 40, ease: 'whip' },
      { t: 12, pos: [4.4, 0.9, 5.0], target: [-1.4, 0.3, 0], fov: 40, ease: 'whip' },
    ],
  },
  beats: [
    { t: 0, label: 'Face', text: 'Le gardien, cadré plein centre.' },
    { t: 3, label: 'Lame', text: 'La lame de glace sort du fourreau.' },
    { t: 6, label: 'Recul', text: 'La camera recule, la silhouette entiere apparait.' },
    { t: 9, label: 'Droite', text: 'Le gardien passe a droite : place au bloc feature gauche.' },
    { t: 12, label: 'Gauche', text: 'Le gardien passe a gauche : place au bloc feature droit.' },
  ],
  props(ctx) {
    const { rng } = ctx;
    const sea = glacialSea({ size: 400, segments: 60, rng });
    sea.position.y = -2.4;
    ctx.add(sea);

    const floes = iceField({ rng, count: 18, spread: 60, height: -2.2 });
    ctx.add(floes);

    const guardian = iceGuardian({ rng, scale: 1.25 });
    ctx.add(guardian);

    const snow = createSnowfall({ count: 2200, area: 50, height: 26, seed: 71, size: 0.12 });
    snow.position.set(0, -4, -4);
    ctx.add(snow);

    const dust = createIceDust({ count: 500, area: 10, height: 5, seed: 83, size: 0.07 });
    dust.position.set(0, 0.5, 0);
    ctx.add(dust);

    const shafts = createLightShafts({ count: 6, length: 60, radius: 6, seed: 97, origin: [0, 30, -14] });
    ctx.add(shafts);

    const armR = guardian.userData.arms[1];
    const bladeGroup = guardian.userData.blade;

    return {
      update(t) {
        // Sortie de la lame : rotation du groupe lame + leger recul du bras.
        const draw = Math.min(1, Math.max(0, (t - 1.6) / 1.6));
        const e = draw * draw * (3 - 2 * draw);
        bladeGroup.rotation.z = 0.25 - e * 1.35;
        bladeGroup.rotation.x = -1.1 + e * 0.9;
        bladeGroup.position.set(0.9 - e * 0.2, -0.4 + e * 0.5, 0.9 + e * 0.4);
        if (armR) {
          armR.upper.rotation.z = 0.16 + e * 0.28;
          armR.lower.rotation.x = -0.75 - e * 0.35;
        }
        ctx.controls.bloomStrength = 0.65 + 0.22 * e;
        ctx.controls.fogDensity = 0.0055 + 0.001 * Math.sin(t * 0.5);
      },
    };
  },
};
