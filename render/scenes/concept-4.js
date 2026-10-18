/**
 * CONCEPT 4 — "Le gardien de glace"
 * Equivalent, dans la video, du concept du samourai : un personnage face camera
 * qui degaine sa lame de glace, que la camera orbite puis recule, avant deux
 * balayages rapides qui le rangent dans le tiers droit puis dans le tiers
 * gauche du cadre (les deux cotes libres accueillent les blocs "feature" du
 * site).
 *
 * Le chemin de camera est strictement le meme dans les deux passes
 * (blocking / cinematic) : seule la matiere change.
 */
import * as THREE from 'three';
import { iceGuardian, glacialSea, iceField, crystalSpire } from '../lib/geometry.js';
import { createSnowfall, createIceDust, createLightShafts } from '../lib/atmosphere.js';

const GROUND_Y = 0;
const GUARDIAN_SCALE = 1.35;
/** Ordonnee du point le plus bas du gardien dans son repere local (scale 1) :
 *  sert a le poser exactement sur la plaine de glace. */
const GUARDIAN_FOOT_Y = 2.06;

/**
 * Le pivot du groupe "blade" du helper est au milieu de la lame : le pommeau
 * (le point que tient la main) se trouve donc a -1.4 dans son repere local.
 * On epingle ce pommeau sur la main droite, ce qui permet de faire pivoter la
 * lame autour de la main (fourreau -> degainee) sans jamais la decoller.
 */
const BLADE_HILT_OFFSET = 1.4;
const HAND_LOCAL = new THREE.Vector3(0.62, -0.3, 0.6);
const BLADE_SHEATHED = { x: -1.85, z: 0.0 }; // le long de la hanche, pointe arriere
const BLADE_DRAWN = { x: 0.08, z: -0.3 }; // haute, pointe au-dessus de l'epaule

const BLADE_GLOW = 0x9fe8ff;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v) => {
  const k = clamp01(v);
  return k * k * (3 - 2 * k);
};
const lerp = (a, b, k) => a + (b - a) * k;

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
  backgroundIntensity: 0.26,
  environmentIntensity: 0.72,
  fog: { color: 0x86badd, density: 0.0036 },
  post: {
    grain: 0.05,
    bars: 0.058,
    frost: 0.42,
    chromatic: 0.0014,
    saturation: 1.12,
    exposure: 0.88,
    bloom: { strength: 0.4, radius: 0.55, threshold: 0.88 },
  },
  blockingBackground: 0x121a22,

  camera: {
    keyframes: [
      // Plan hero : cadrage serre (buste + heaume), tete detachee sur le ciel.
      { t: 0.0, pos: [0.0, 3.3, 5.9], target: [0.0, 3.78, 0], fov: 36, ease: 'inOutSine' },
      // Legere poussee pendant l'amorce du degainage.
      { t: 1.6, pos: [0.05, 3.42, 5.3], target: [0.0, 3.86, 0], fov: 36, ease: 'inOutSine' },
      // Lame sortie : on a bascule du cote libre (la lame est du cote oppose).
      { t: 3.2, pos: [-3.4, 2.9, 8.35], target: [0.3, 2.75, 0], fov: 40, ease: 'inOutSine' },
      // Orbite : on decouvre l'epaisseur du personnage et sa cape.
      { t: 4.4, pos: [-8.75, 3.0, 3.2], target: [0.05, 2.75, 0], fov: 40, ease: 'inOutSine' },
      // Retour dans l'axe en commencant a reculer.
      { t: 5.4, pos: [-6.05, 3.05, 7.7], target: [0.0, 2.7, 0], fov: 41, ease: 'inOutSine' },
      // Recul : silhouette entiere, personnage centre.
      { t: 6.0, pos: [-2.4, 3.0, 10.9], target: [0.0, 2.6, 0], fov: 43, ease: 'whip' },
      // Balayage rapide : le gardien part dans le tiers droit.
      { t: 9.0, pos: [0.05, 2.95, 10.7], target: [-3.1, 2.6, 0], fov: 43, ease: 'whip' },
      // Second balayage rapide : le gardien part dans le tiers gauche.
      { t: 12.0, pos: [0.05, 3.05, 10.9], target: [3.1, 2.6, 0], fov: 43, ease: 'smooth' },
    ],
  },

  /** Reperes narratifs : utilises par le site pour reveler les contenus. */
  beats: [
    { t: 0.0, label: 'Face', text: 'Le gardien de glace, cadre serre, face camera.' },
    { t: 1.6, label: 'Degainage', text: 'La lame de glace sort du fourreau et s\'illumine.' },
    { t: 3.2, label: 'Orbite', text: 'La camera tourne autour du gardien : cape et profondeur.' },
    { t: 6.0, label: 'Silhouette', text: 'La camera recule, la silhouette entiere se detache.' },
    { t: 9.0, label: 'Droite', text: 'Le gardien passe a droite : le tiers gauche reste libre.' },
    { t: 12.0, label: 'Gauche', text: 'Le gardien passe a gauche : le tiers droit reste libre.' },
  ],

  props(ctx) {
    const { rng } = ctx;

    // --- Plaine de glace vive -------------------------------------------
    const sea = glacialSea({ size: 900, segments: 88, rng });
    sea.position.y = GROUND_Y;
    ctx.add(sea, { castShadow: false });
    // --- Floes -----------------------------------------------------------
    // iceField repartit ses blocs de facon isotrope : on les redistribue en
    // deux couronnes (moyenne puis lointaine) pour laisser l'avant-scene et le
    // corridor de camera parfaitement degages autour du gardien.
    const floes = iceField({ rng, count: 24, spread: 90, height: GROUND_Y });
    const half = floes.children.length / 2;
    floes.children.forEach((shelf, i) => {
      const far = i >= half;
      const k = (i % half) / Math.max(1, half - 1); // 0 -> 1 le long du balayage
      const dir = i % 2 === 0 ? 1 : -1;
      const angle = dir * (far ? 0.1 + k * 1.5 : 0.3 + k * 0.78) + (rng.next() - 0.5) * 0.14;
      const radius = far ? 46 + rng.next() * 74 : 16 + rng.next() * 18;
      shelf.position.set(Math.sin(angle) * radius, GROUND_Y - 0.35 + rng.next() * 0.6, -Math.cos(angle) * radius);
      shelf.rotation.y = rng.next() * Math.PI * 2;
      if (far) shelf.scale.setScalar(1.5 + rng.next() * 1.1);
    });
    // Les calottes de banquise sont en "snow" : ce slot porte une normal map de
    // bruit pur qui lit comme de la neige TV des qu'on s'en approche. On les
    // passe en glace claire (aucune perturbation de normale).
    floes.traverse((o) => {
      if (o.isMesh && o.userData.slot === 'snow') {
        o.userData.slot = 'ice';
        o.userData.color = 0xc6e6ff;
      }
    });
    ctx.add(floes);

    // --- Fleches de glace tres lointaines (profondeur) --------------------
    const spires = new THREE.Group();
    spires.name = 'distantSpires';
    const spireLayout = [
      [-54, -150],
      [-19, -212],
      [26, -176],
      [64, -246],
      [7, -306],
    ];
    for (const [x, z] of spireLayout) {
      const spire = crystalSpire({ rng, height: 20 + rng.next() * 16, radius: 2.6 + rng.next() * 1.6 });
      spire.scale.setScalar(0.9 + rng.next() * 0.7);
      spire.rotation.y = rng.next() * Math.PI * 2;
      spire.position.set(x, GROUND_Y - 0.6, z);
      spires.add(spire);
    }
    ctx.add(spires);

    // --- Le gardien -------------------------------------------------------
    const guardian = iceGuardian({ rng, scale: GUARDIAN_SCALE });
    guardian.position.y = GUARDIAN_FOOT_Y * GUARDIAN_SCALE;
    const body = guardian.userData.body;
    const bladeGroup = guardian.userData.blade;
    const arms = guardian.userData.arms;
    const armR = arms[1];

    // Coeur de glace lumineux, incruste dans le plastron.
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), null);
    core.position.set(0, 0.45, 0.5);
    core.userData.slot = 'emissive';
    core.userData.color = BLADE_GLOW;
    body.add(core);

    // Visiere elargie + fentes d'yeux : le heaume doit se lire dans le plan hero.
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), null);
    visor.position.set(0, 1.04, 0.22);
    visor.userData.slot = 'emissive';
    visor.userData.color = BLADE_GLOW;
    body.add(visor);
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.05), null);
      eye.position.set(sign * 0.1, 1.06, 0.24);
      eye.userData.slot = 'emissive';
      eye.userData.color = BLADE_GLOW;
      body.add(eye);
    }
    // Cape : le helper en fournit un panneau plat, illisible des que l'orbite
    // le prend de profil. On le remplace par une vraie chape (coque de cone
    // ouverte sur l'avant) qui tient la silhouette sous tous les angles.
    guardian.userData.cape.visible = false;
    const cloak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.98, 1.95, 9, 3, true, Math.PI * 0.25, Math.PI * 1.5),
      null,
    );
    cloak.position.set(0, -0.33, -0.1);
    cloak.userData.slot = 'iceGlass';
    cloak.userData.color = 0xa8d8f2;
    cloak.userData.materialOverrides = { side: THREE.DoubleSide, transmission: 0.05, roughness: 0.16 };
    body.add(cloak);

    // Lame : pommeau epingle sur la main, pose initiale au fourreau.
    bladeGroup.rotation.set(BLADE_SHEATHED.x, 0, BLADE_SHEATHED.z);

    // Point lumineux qui accompagne la lame (la passe blocking reste plate :
    // il n'est allume qu'en cinematique).
    const bladeLight = new THREE.PointLight(BLADE_GLOW, 0, 7, 2.0);
    bladeLight.position.set(0, 1.0, 0);
    bladeGroup.add(bladeLight);

    ctx.add(guardian);

    let bladeMat = null;
    bladeGroup.traverse((o) => {
      if (!bladeMat && o.isMesh && o.userData.slot === 'blade') bladeMat = o.material;
    });

    // --- Atmosphere -------------------------------------------------------
    const snow = createSnowfall({ count: 2600, area: 72, height: 34, seed: 71, size: 0.12, opacity: 0.9 });
    snow.position.set(0, -4, -6);
    ctx.add(snow);

    const dust = createIceDust({ count: 700, area: 15, height: 8, seed: 83, size: 0.06 });
    dust.position.set(0, 0.2, 0);
    ctx.add(dust);

    const shafts = createLightShafts({ count: 6, length: 110, radius: 7, seed: 97, origin: [0, 44, -70], opacity: 0.05 });
    ctx.add(shafts);

    const snowMat = snow.userData.material;
    const shaftMat = shafts.userData.material;
    const snowOpacity = snowMat.uniforms.uOpacity.value;
    const shaftOpacity = shaftMat.uniforms.uOpacity.value;

    const baseBloom = ctx.controls.bloomStrength;
    const baseFog = ctx.controls.fogDensity;
    const baseExposure = ctx.controls.exposure;
    const bladeAxis = new THREE.Vector3();
    const bladeEuler = new THREE.Euler();

    return {
      update(t) {
        // Ouverture : la neige et les faisceaux montent, l'image se pose.
        const open = smooth01(t / 1.7);
        snowMat.uniforms.uOpacity.value = snowOpacity * (0.18 + 0.82 * open);
        shaftMat.uniforms.uOpacity.value = shaftOpacity * open;
        ctx.controls.exposure = baseExposure * (0.84 + 0.16 * smooth01(t / 1.4));

        // Degainage : rotation de la lame autour de la main + ouverture du bras.
        const draw = smooth01((t - 1.6) / 1.6);
        const settle = smooth01((t - 3.2) / 3.4);
        const rotX = lerp(BLADE_SHEATHED.x, BLADE_DRAWN.x, draw);
        const rotZ = lerp(BLADE_SHEATHED.z, BLADE_DRAWN.z, draw);
        bladeGroup.rotation.set(rotX, 0, rotZ);
        bladeEuler.set(rotX, 0, rotZ, 'XYZ');
        bladeAxis.set(0, 1, 0).applyEuler(bladeEuler);
        bladeGroup.position.copy(HAND_LOCAL).addScaledVector(bladeAxis, BLADE_HILT_OFFSET);

        if (armR) {
          armR.upper.rotation.z = 0.16 + 0.42 * draw;
          armR.upper.rotation.y = -0.24 * draw;
          armR.lower.rotation.x = -0.75 + 0.5 * draw;
        }

        // La lame s'illumine : bloom + intensite d'emission + point froid.
        const glow = draw * (1 - 0.42 * settle);
        ctx.controls.bloomStrength = baseBloom + 0.14 * glow;
        if (bladeMat && 'emissiveIntensity' in bladeMat) bladeMat.emissiveIntensity = 0.35 + 0.85 * glow;
        bladeLight.intensity = ctx.blocking ? 0 : 2 * draw * draw * (1 - 0.3 * settle);

        // Vie du personnage : respiration + chape qui bouge.
        body.scale.y = 1 + 0.006 * Math.sin(t * 1.7);
        cloak.rotation.x = 0.05 * Math.sin(t * 1.25);
        cloak.rotation.z = 0.04 * Math.sin(t * 0.9 + 1.1);

        // Respiration du brouillard, qui s'allege pendant le degainage.
        ctx.controls.fogDensity = baseFog + 0.00055 * Math.sin(t * 0.8) - 0.0007 * draw;
      },
    };
  },
};
