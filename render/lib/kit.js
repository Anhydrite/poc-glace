/**
 * "Kit" de rendu : assemble renderer, scene, camera, environnement, lumiere,
 * materiaux, post-traitement et helpers de previz.
 *
 * Une scene ne fait que declarer :
 *   - ses poses de camera (keyframes)
 *   - ses props (via ctx.add)
 *   - une fonction update(t) qui anime les props
 *   - eventuellement des "controls" (brouillard, fondu au blanc, exposition)
 *
 * Le kit applique le meme chemin de camera pour les deux looks, ce qui rend la
 * comparaison previz/cinematique strictement juste.
 */
import * as THREE from 'three';
import { MaterialLibrary } from './materials.js';
import { createEnvironment } from './env.js';
import { createCameraRig } from './camera-rig.js';
import { setupLighting } from './atmosphere.js';
import { createComposer } from './post.js';
import { assemble } from './geometry.js';
import { makeRng } from './rng.js';

function hideLayers(spec) {
  return Array.isArray(spec.blockingHiddenLayers) ? spec.blockingHiddenLayers : [];
}

export function createRenderKit({ canvas, spec, look = 'cinematic', showHelpers = true, width, height, renderer: existing }) {
  const blocking = look === 'blocking';
  const size = { width: width ?? spec.size?.[0] ?? 1280, height: height ?? spec.size?.[1] ?? 720 };

  const renderer =
    existing ||
    new THREE.WebGLRenderer({
      canvas,
      antialias: !blocking,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
  renderer.setPixelRatio(1);
  renderer.setSize(size.width, size.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (blocking) {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
  } else {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = spec.post?.exposure ?? 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  const scene = new THREE.Scene();

  const env = createEnvironment(renderer, spec.env || 'fjord');
  if (blocking) {
    scene.background = new THREE.Color(spec.blockingBackground ?? 0x0f151c);
  } else {
    scene.background = env.background;
    if ('backgroundIntensity' in scene) scene.backgroundIntensity = spec.backgroundIntensity ?? 0.55;
    scene.environment = env.envMap;
    if ('environmentIntensity' in scene) scene.environmentIntensity = spec.environmentIntensity ?? 0.85;
  }

  const camera = new THREE.PerspectiveCamera(spec.camera?.keyframes?.[0]?.fov ?? 35, size.width / size.height, 0.05, 3000);

  const lib = new MaterialLibrary({ renderer, envMap: blocking ? null : env.envMap, look });
  const lighting = setupLighting({ scene, look, palette: env.palette, shadows: !blocking });

  const initialFog = spec.fog || { color: 0xbfe3ff, density: blocking ? 0 : 0.006 };
  if (!blocking) {
    scene.fog = new THREE.FogExp2(new THREE.Color(initialFog.color), initialFog.density);
  }

  const rig = createCameraRig({
    keyframes: spec.camera.keyframes,
    duration: spec.duration,
    fps: spec.fps ?? 30,
  });

  const composer = blocking
    ? null
    : createComposer({
        renderer,
        scene,
        camera,
        size,
        grain: spec.post?.grain ?? 0.055,
        bars: spec.post?.bars ?? 0.058,
        bloom: spec.post?.bloom,
      });

  /** Etat pilote par la scene (brouillard, exposition, fondus...). */
  const controls = {
    whiteout: 0,
    exposure: renderer.toneMappingExposure,
    fogDensity: initialFog.density,
    fogColor: new THREE.Color(initialFog.color),
    bloomStrength: spec.post?.bloom?.strength ?? 0.58,
    bloomThreshold: spec.post?.bloom?.threshold ?? 0.72,
    frost: spec.post?.frost ?? 0.5,
    chromatic: spec.post?.chromatic ?? 0.0016,
    saturation: spec.post?.saturation ?? 1.06,
    grain: spec.post?.grain ?? 0.055,
    sunIntensity: lighting.sun.intensity,
    hemiIntensity: lighting.hemi.intensity,
    backgroundIntensity: spec.backgroundIntensity ?? 0.55,
  };

  const updaters = [];
  const rng = makeRng(spec.seed ?? 7);

  const ctx = {
    THREE,
    renderer,
    scene,
    camera,
    lib,
    env,
    lighting,
    rig,
    controls,
    rng,
    look,
    blocking,
    size,
    duration: spec.duration,
    fps: spec.fps ?? 30,
    mat: (slot, overrides) => lib.get(slot, overrides),
    rngFor: (seed) => makeRng(seed),
    add(obj, opts) {
      assemble(obj, lib, opts);
      scene.add(obj);
      // Tout objet exposant userData.update(t, ctx) est anime automatiquement.
      if (typeof obj.userData?.update === 'function' && obj.userData.autoUpdate !== false) {
        updaters.push(obj.userData.update);
      }
      return obj;
    },
    onUpdate(fn) {
      updaters.push(fn);
    },
    update(fn) {
      updaters.push(fn);
    },
  };

  // Props de la scene.
  const props = spec.props ? spec.props(ctx) : null;
  if (props && typeof props.update === 'function') updaters.push(props.update);

  // En passe blocking, on masque les calques purement atmospheriques : le
  // playblast de la video ne montre que la geometrie et le cadrage.
  if (blocking) {
    const hidden = new Set(['lightShafts', 'aurora', 'snowfall', 'iceDust', ...hideLayers(spec)]);
    scene.traverse((o) => {
      if (o.name && hidden.has(o.name)) o.visible = false;
    });
  }

  // --- Helpers de previz (uniquement en blocking, et seulement si demandes) --
  // ATTENTION : la camera passe exactement par les poses cles ; tout marqueur
  // pose a ces endroits remplirait l'image. On ne dessine donc que la trace du
  // chemin et de petits cones discrets.
  let helpers = null;
  if (blocking && showHelpers) {
    helpers = new THREE.Group();
    helpers.name = 'previzHelpers';
    helpers.renderOrder = -1;
    const pts = rig.trajectory(320).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x59e0ff, transparent: true, opacity: 0.9, depthTest: false }),
    );
    line.renderOrder = -1;
    helpers.add(line);
    for (const k of rig.keyframes) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.26, 6),
        new THREE.MeshBasicMaterial({ color: 0xffb066, depthTest: false }),
      );
      cone.position.set(k.pos[0], k.pos[1], k.pos[2]);
      cone.renderOrder = -1;
      helpers.add(cone);
    }
    scene.add(helpers);
  }

  const tmpColor = new THREE.Color();

  function applyControls() {
    if (composer) {
      const g = composer.grade.uniforms;
      g.uWhiteout.value = controls.whiteout;
      g.uExposure.value = controls.exposure;
      g.uFrost.value = controls.frost;
      g.uChromatic.value = controls.chromatic;
      g.uSaturation.value = controls.saturation;
      g.uGrain.value = controls.grain;
      composer.bloomPass.strength = controls.bloomStrength;
      composer.bloomPass.threshold = controls.bloomThreshold;
    }
    if (scene.fog) {
      scene.fog.density = controls.fogDensity;
      scene.fog.color.copy(controls.fogColor);
    }
    lighting.sun.intensity = controls.sunIntensity;
    lighting.hemi.intensity = controls.hemiIntensity;
    if (!blocking && 'backgroundIntensity' in scene) scene.backgroundIntensity = controls.backgroundIntensity;
    // En blocking, le "fondu au blanc" doit rester lisible : on eclaircit le fond.
    if (blocking && controls.whiteout > 0.01) {
      scene.background = tmpColor.setRGB(
        0.06 + (1 - 0.06) * controls.whiteout,
        0.08 + (1 - 0.08) * controls.whiteout,
        0.11 + (1 - 0.11) * controls.whiteout,
      );
    }
  }

  function renderFrame(t) {
    lib.tick(t);
    lighting.update(t);
    for (const fn of updaters) fn(t, ctx);    rig.apply(camera, t, THREE);
    applyControls();
    if (composer) {
      composer.update(t);
      composer.composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  return {
    ctx,
    spec,
    renderer,
    scene,
    camera,
    lib,
    composer,
    rig,
    controls,
    size,
    renderFrame,
    resize(w, h) {
      size.width = w;
      size.height = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
    },
    dispose() {
      lib.dispose();
      composer?.dispose();
      lighting.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
      });
    },
  };
}
