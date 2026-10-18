/**
 * CONCEPT 3 — "La relique de glace explosee"
 *
 * Equivalent, dans la video, du concept "exploded view" (un casque VR qui
 * s'ouvre en montrant ses composants) : c'est LA demonstration que ce workflow
 * permet de piloter precisement un mouvement difficile a decrire en texte.
 * Ici la chronologie est explicite : l'artefact est intact, puis ses couches
 * se separent (coques, coques internes, anneaux, petales, eclats) pendant que
 * la camera effectue une orbite de 45 degres et recule legerement.
 *
 * Studio : fond sombre, lumiere laterale froide, poussiere de glace, halo
 * lumineux. L'artefact flotte au-dessus d'une plaque de glace vive
 * reflechissante portee par un socle hexagonal eclaire.
 *
 * Duree 5 s / 30 fps.
 */
import * as THREE from 'three';
import { glacialSea, shardGeometry, cloudBank } from '../lib/geometry.js';
import { createIceDust } from '../lib/atmosphere.js';

/* ------------------------------------------------------------------ */
/* Helpers locaux                                                      */
/* ------------------------------------------------------------------ */

/**
 * Lueur douce : plan additif a degrade radial.
 * C'est un shader custom, donc marque keepMaterial : la bibliotheque de
 * materiaux n'y touche pas (comme les faisceaux ou les aurores).
 */
function softGlow({ size = 9, color = 0x7fd8ff, intensity = 0.3, power = 2.2, name = 'studioHalo' }) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        float r = length((vUv - 0.5) * 2.0);
        float a = pow(smoothstep(1.0, 0.0, r), ${power.toFixed(1)}) * uIntensity;
        if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.name = name;
  mesh.userData.keepMaterial = true;
  mesh.renderOrder = -3; // dessine avant tout le reste : sert de lumiere de fond
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Reliquaire cristallin en couches imbriquees (version enrichie de
 * explodedArtifact). Chaque piece est declaree par un decalage "rest" (etat
 * intact) et un decalage "explode" (etat ouvert) ; userData.setExplode(k) fait
 * une interpolation absolue de k=0 (intact) a k=1 (eclate), donc rejouable
 * image par image sans derive.
 *
 * Couches, de l'exterieur vers l'interieur :
 *   - 2 coques de glace (hemispheres) qui se separent verticalement,
 *   - un collier metallique au plan equatorial,
 *   - 3 anneaux (metal / laiton / emissif) qui s'ouvrent radialement,
 *   - 6 petales de glace qui basculent de la verticale vers l'horizontale,
 *   - 2 pointes cristallines (haut / bas),
 *   - 9 eclats satellites qui derivent vers l'exterieur.
 */
function iceRelic(rng, { scale = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'iceRelic';

  const parts = [];
  const register = (mesh, rest, explode, anim = {}, parent = group) => {
    mesh.position.set(rest[0], rest[1], rest[2]);
    const baseRot = mesh.rotation.clone();
    parts.push({ mesh, rest, explode, baseRot, ...anim });
    parent.add(mesh);
    return mesh;
  };

  // --- Noyau ---------------------------------------------------------
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0));
  core.userData.slot = 'crystal';
  core.castShadow = true;
  register(core, [0, 0, 0], [0, 0, 0], { pulse: 0.07 });

  const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0));
  heart.userData.slot = 'emissive';
  heart.userData.color = 0xb2f4ff;
  register(heart, [0, 0, 0], [0, 0, 0], { pulse: 0.26 });

  // --- Coques imbriquees (separent verticalement) --------------------
  for (const shell of [
    { r: 0.68, open: 0.36, slot: 'ice' },
    { r: 0.44, open: 0.3, slot: 'iceDeep' },
  ]) {
    for (const sign of [1, -1]) {
      const thetaStart = sign > 0 ? 0 : Math.PI / 2;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(shell.r, 14, 8, 0, Math.PI * 2, thetaStart, Math.PI / 2),
      );
      mesh.userData.slot = shell.slot;
      mesh.userData.materialOverrides = { side: THREE.DoubleSide };
      mesh.castShadow = true;
      register(mesh, [0, 0, 0], [0, sign * shell.open, 0], { tiltX: sign * 0.26 });
    }
  }

  // --- Collier equatorial -------------------------------------------
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.705, 0.05, 8, 36));
  collar.rotation.x = Math.PI / 2;
  collar.userData.slot = 'metalWarm';
  collar.castShadow = true;
  register(collar, [0, 0, 0], [0, 0.03, 0], { scaleOpen: 0.12 });

  // --- Anneaux (ouverture radiale) ----------------------------------
  const rings = new THREE.Group();
  rings.name = 'relicRings';
  group.add(rings);
  for (const d of [
    { r: 0.84, tube: 0.038, slot: 'metal', rot: [Math.PI / 2, 0, 0], open: 0.32, lift: 0.14 },
    { r: 0.92, tube: 0.032, slot: 'metalWarm', rot: [Math.PI / 2 + 0.6, 0.5, 0], open: 0.26, lift: -0.12 },
    { r: 0.52, tube: 0.014, slot: 'emissive', rot: [Math.PI / 2, 0, 0], open: 0.7, lift: 0.0, color: 0x8fe6ff },
  ]) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(d.r, d.tube, 8, 44));
    mesh.rotation.set(d.rot[0], d.rot[1], d.rot[2]);
    mesh.userData.slot = d.slot;
    if (d.color != null) mesh.userData.color = d.color;
    register(mesh, [0, 0, 0], [0, d.lift, 0], { scaleOpen: d.open }, rings);
  }

  // --- Petales (basculent de la verticale vers l'horizontale) -------
  const petals = new THREE.Group();
  petals.name = 'relicPetals';
  group.add(petals);
  const PETAL_COUNT = 6;
  for (let i = 0; i < PETAL_COUNT; i++) {
    const a = (i / PETAL_COUNT) * Math.PI * 2 + 0.3;
    const petal = new THREE.Group();
    petal.rotation.y = Math.PI / 2 - a; // l'axe local +Z pointe vers l'exterieur
    petals.add(petal);

    const geo = shardGeometry({ radius: 0.1, height: 0.66, sides: 4, rng, tip: 0.16 });
    geo.translate(0, 0.31, 0); // pivot a la base de la lame
    const blade = new THREE.Mesh(geo);
    blade.userData.slot = 'ice';
    blade.userData.materialOverrides = { side: THREE.DoubleSide };
    register(blade, [0, 0, 0.88], [0, 0.04, 0.24], { tiltX: 1.34 }, petal);
  }

  // --- Pointes cristallines (haut / bas) ----------------------------
  const spireGeo = shardGeometry({ radius: 0.12, height: 0.3, sides: 5, rng, tip: 0.2 });
  for (const sign of [1, -1]) {
    const spire = sign > 0 ? new THREE.Mesh(spireGeo) : new THREE.Mesh(spireGeo.clone());
    spire.userData.slot = 'crystal';
    register(spire, [0, sign * 0.6, 0], [0, sign * 0.3, 0], { tiltY: sign * 0.5 });
  }

  // --- Eclats satellites --------------------------------------------
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.7;
    const r = 1.02 + rng() * 0.2;
    const y = (rng() - 0.5) * 0.7;
    const shard = new THREE.Mesh(
      shardGeometry({ radius: 0.045 + rng() * 0.045, height: 0.18 + rng() * 0.24, sides: 5, rng, tip: 0.3 }),
    );
    shard.userData.slot = rng() < 0.5 ? 'crystal' : 'ice';
    shard.rotation.set(rng() * Math.PI * 0.6, rng() * Math.PI * 2, rng() * Math.PI * 0.6);
    register(
      shard,
      [Math.cos(a) * r, y, Math.sin(a) * r],
      [Math.cos(a) * 0.42, (rng() - 0.5) * 0.5, Math.sin(a) * 0.42],
      { spinY: (rng() - 0.5) * 3.0 },
    );
  }

  group.userData.parts = parts;
  group.userData.rings = rings;
  group.userData.petals = petals;
  group.userData.pulseParts = parts.filter((p) => p.pulse);
  group.userData.explode = 0;
  group.userData.setExplode = (k) => {
    const e = k < 0 ? 0 : k > 1 ? 1 : k;
    group.userData.explode = e;
    for (const p of parts) {
      p.mesh.position.set(
        p.rest[0] + p.explode[0] * e,
        p.rest[1] + p.explode[1] * e,
        p.rest[2] + p.explode[2] * e,
      );
      p.mesh.rotation.set(
        p.baseRot.x + (p.tiltX ?? 0) * e,
        p.baseRot.y + ((p.tiltY ?? 0) + (p.spinY ?? 0)) * e,
        p.baseRot.z + (p.tiltZ ?? 0) * e,
      );
      if (p.scaleOpen) {
        const s = 1 + p.scaleOpen * e;
        p.mesh.scale.set(s, s, s);
      }
    }
  };

  group.scale.setScalar(scale);
  return group;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const ARTIFACT_Y = 0.35;

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
  backgroundIntensity: 0.14,
  environmentIntensity: 0.8,
  fog: { color: 0x08131c, density: 0.02 },
  post: {
    grain: 0.024,
    bars: 0.058,
    frost: 0.1,
    chromatic: 0.001,
    saturation: 1.08,
    exposure: 0.85,
    bloom: { strength: 0.4, radius: 0.7, threshold: 0.8 },
  },
  blockingBackground: 0x0e141c,

  camera: {
    keyframes: [
      // Cadrage serre, frontal : l'artefact est intact.
      { t: 0.0, pos: [0.0, 0.62, 4.25], target: [0, 0.35, 0], fov: 38, ease: 'inOutSine' },
      { t: 1.0, pos: [0.0, 0.6, 4.2], target: [0, 0.35, 0], fov: 38, ease: 'inOutSine' },
      // Ouverture : la camera amorce son orbite.
      { t: 1.6, pos: [0.6, 0.68, 4.35], target: [0, 0.37, 0], fov: 38.5, ease: 'inOutSine' },
      // Etat eclate atteint : 45 degres d'azimut, leger recul.
      { t: 3.5, pos: [5.0, 1.35, 5.0], target: [0, 0.35, 0], fov: 40, ease: 'inOutSine' },
      // Respiration finale : micro-mouvement, cadrage stable.
      { t: 4.6, pos: [4.72, 1.26, 4.72], target: [0, 0.33, 0], fov: 39.2, ease: 'inOutSine' },
      { t: 5.0, pos: [4.9, 1.3, 4.9], target: [0, 0.33, 0], fov: 39.6, ease: 'outCubic' },
    ],
  },

  /** Reperes narratifs : utilises par le site pour reveler les contenus. */
  beats: [
    { t: 0.0, label: 'Intact', text: 'La relique flotte intacte au-dessus du socle.' },
    { t: 1.6, label: 'Ouverture', text: 'Les couches se desserrent, la lueur du noyau apparait.' },
    { t: 3.5, label: 'Eclate', text: 'Vue eclatee : chaque composant trouve sa place.' },
    { t: 4.6, label: 'Detail', text: 'Le noyau cristallin et les anneaux, en detail.' },
  ],

  props(ctx) {
    const { rng } = ctx;

    // --- Decor : plaque de glace vive sombre et reflechissante --------
    const plate = glacialSea({ size: 170, segments: 28, rng });
    plate.position.y = -2.1;
    plate.userData.materialOverrides = { roughness: 0.15, metalness: 0.36, envMapIntensity: 1.6 };
    plate.receiveShadow = true;
    ctx.add(plate, { castShadow: false });

    // --- Socle hexagonal eclaire --------------------------------------
    const plinth = new THREE.Group();
    plinth.name = 'studioPlinth';

    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.62, 0.6, 6), null);
    body.position.y = -1.8;
    body.userData.slot = 'dark';
    body.castShadow = true;
    body.receiveShadow = true;
    plinth.add(body);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, 0.06, 6), null);
    top.position.y = -1.47;
    top.userData.slot = 'iceDeep';
    top.receiveShadow = true;
    plinth.add(top);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.46, 0.1, 6, 1, true), null);
    rim.position.y = -1.52;
    rim.userData.slot = 'metal';
    plinth.add(rim);

    // Cercles lumineux du socle (lecture "levitation").
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12 - i * 0.32, 0.012, 6, 36), null);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.435 + i * 0.004;
      ring.userData.slot = 'emissive';
      ring.userData.color = 0x9ff0ff;
      plinth.add(ring);
    }
    ctx.add(plinth);

    // --- Sujet : la relique -------------------------------------------
    const relic = iceRelic(rng, { scale: 1 });
    relic.position.y = ARTIFACT_Y;
    ctx.add(relic);

    // --- Halo studio + lueur de levitation ----------------------------
    const halo = softGlow({ size: 7.5, color: 0x6fc8f0, intensity: 0.18, name: 'studioHalo' });
    halo.position.set(0, ARTIFACT_Y, 0);
    ctx.add(halo);

    const lift = softGlow({ size: 1.7, color: 0x9ff0ff, intensity: 0.08, power: 1.8, name: 'levitationGlow' });
    lift.position.set(0, -1.15, 0);
    ctx.add(lift);

    // --- Brume basse (casse la platitude de la plaque) ----------------
    const mist = cloudBank({
      rng,
      count: 6,
      spread: 7,
      y: -1.8,
      size: [8, 2.6],
      color: 0x5f8cb0,
      opacityScale: 0.13,
    });
    ctx.add(mist);

    // --- Poussiere de glace ------------------------------------------
    const dust = createIceDust({ count: 380, area: 6, height: 5, seed: 41, size: 0.04 });
    dust.position.set(0, 0.3, 0);
    ctx.add(dust);

    // Les decors purement cinematiques n'ont pas de sens en previz plate.
    halo.visible = !ctx.blocking;
    lift.visible = !ctx.blocking;
    mist.visible = !ctx.blocking;

    // --- Eclairage : lumiere laterale froide + lueur de socle ---------
    if (!ctx.blocking) {
      ctx.lighting.rim.intensity = 1.8;
      ctx.lighting.rim.position.set(-14, 5.5, 6);
      ctx.lighting.fill.intensity = 0.24;

      const plinthLight = new THREE.PointLight(0x9fe4ff, 1.6, 7, 2.0);
      plinthLight.position.set(0, -1.1, 0);
      plinthLight.name = 'plinthGlowLight';
      ctx.add(plinthLight);
    }

    const baseBloom = ctx.controls.bloomStrength;
    // Exposition studio : niveau constant, legerement releve a l'ouverture.
    const sunTarget = 1.6;
    const hemiTarget = 0.34;

    return {
      deps: [plate, plinth, relic, halo, lift, mist, dust],
      update(t) {
        // Ouverture : intact (t<=1) -> eclate stable (t>=3.5).
        const raw = Math.min(1, Math.max(0, (t - 1.0) / 2.5));
        const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        relic.userData.setExplode(k);

        // Vie des pieces : anneaux et petales tournent lentement.
        relic.userData.rings.rotation.y = 0.22 * t;
        relic.userData.petals.rotation.y = -0.05 * t;

        // Respiration finale.
        const breath = Math.max(0, (t - 3.5) / 1.5);
        relic.position.y = ARTIFACT_Y + Math.sin(breath * Math.PI * 2) * 0.015 * breath;

        // Noyau pulse.
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
        for (const p of relic.userData.pulseParts) p.mesh.scale.setScalar(1 + p.pulse * pulse);

        // Les lueurs s'intensifient au fil de l'ouverture.
        ctx.controls.bloomStrength = baseBloom * (0.8 + 0.4 * k);
        ctx.controls.sunIntensity = sunTarget * (0.95 + 0.12 * k);
        ctx.controls.hemiIntensity = hemiTarget * (0.9 + 0.15 * k);

        // Halo et lueur : face camera (l'orbite change leur orientation).
        const cam = ctx.rig.sample(t).pos;
        halo.lookAt(cam[0], cam[1], cam[2]);
        lift.lookAt(cam[0], cam[1], cam[2]);
      },
    };
  },
};
