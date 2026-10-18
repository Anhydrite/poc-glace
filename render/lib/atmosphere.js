/**
 * Atmosphere : neige, poussiere de glace, faisceaux volumetriques, aurores,
 * brouillard. Tous les mouvements sont des fonctions deterministes de t, ce qui
 * permet de rendre la sequence dans n'importe quel ordre sans derive.
 */
import * as THREE from 'three';
import { makeRng } from './rng.js';

/* ------------------------------------------------------------------ */
/* Particules                                                          */
/* ------------------------------------------------------------------ */

export function createSnowfall({ count = 2600, area = 90, height = 40, seed = 11, size = 0.16, opacity = 0.85 } = {}) {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (rng.next() - 0.5) * area;
    positions[i * 3 + 1] = rng.next() * height;
    positions[i * 3 + 2] = (rng.next() - 0.5) * area;
    seeds[i * 3 + 0] = 0.4 + rng.next() * 1.6; // vitesse de chute
    seeds[i * 3 + 1] = rng.next() * Math.PI * 2; // phase de derive
    seeds[i * 3 + 2] = 0.5 + rng.next() * 1.4; // amplitude de derive
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), area);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: height },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uColor: { value: new THREE.Color(0xe8f7ff) },
      uPixelRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      uniform float uTime; uniform float uHeight; uniform float uSize; uniform float uPixelRatio; uniform float uOpacity;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float fall = mod(p.y - uTime * aSeed.x * 1.8, uHeight);
        p.y = fall;
        p.x += sin(uTime * 0.35 + aSeed.y) * aSeed.z;
        p.z += cos(uTime * 0.28 + aSeed.y * 1.7) * aSeed.z * 0.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPixelRatio * 320.0 / max(0.001, -mv.z);
        vAlpha = uOpacity * smoothstep(0.0, 6.0, -mv.z) * (0.35 + 0.65 * fract(aSeed.y * 3.7));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.05, r) * vAlpha;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'snowfall';
  points.userData.update = (t) => {
    mat.uniforms.uTime.value = t;
  };
  points.userData.material = mat;
  return points;
}

export function createIceDust({ count = 700, area = 26, height = 10, seed = 23, size = 0.09 } = {}) {
  const snow = createSnowfall({ count, area, height, seed, size, opacity: 0.6 });
  snow.name = 'iceDust';
  snow.userData.material.uniforms.uColor.value = new THREE.Color(0x9fe4ff);
  return snow;
}

/* ------------------------------------------------------------------ */
/* Faisceaux volumetriques                                             */
/* ------------------------------------------------------------------ */

export function createLightShafts({ count = 7, length = 46, radius = 5, seed = 31, origin = [0, 26, -18], opacity = 0.07, color = 0xa9e6ff } = {}) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  group.name = 'lightShafts';
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
      varying vec2 vUv;
      void main(){
        // Faisceau : gaussienne horizontale, fondu vertical doux.
        float x = (vUv.x - 0.5) * 2.0;
        float beam = exp(-x * x * 6.0) * smoothstep(1.0, 0.55, abs(x));
        float fade = smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
        float flick = 0.82 + 0.18 * sin(uTime * 0.7 + vUv.y * 7.0);
        float a = beam * fade * uOpacity * flick;
        if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });

  const anchors = [];
  for (let i = 0; i < count; i++) {
    const w = radius * (2.2 + rng() * 3.4);
    const l = length * (0.65 + rng() * 0.7);
    const geo = new THREE.PlaneGeometry(w, l, 1, 1);
    const m = new THREE.Mesh(geo, mat);
    const x = origin[0] + (rng() - 0.5) * 60;
    const yy = origin[1] + (rng() - 0.5) * 24;
    const z = origin[2] + (rng() - 0.5) * 60;
    m.position.set(x, yy, z);
    m.rotation.z = (rng() - 0.5) * 0.28;
    m.renderOrder = 5;
    m.userData.keepMaterial = true;
    group.add(m);
    anchors.push(m);
  }

  group.userData.material = mat;
  group.userData.update = (t, ctx) => {
    mat.uniforms.uTime.value = t;
    // Billboard "axe Y" : les faisceaux font toujours face a la camera.
    const cam = ctx?.camera;
    if (cam) {
      for (const m of anchors) {
        const dx = cam.position.x - m.position.x;
        const dz = cam.position.z - m.position.z;
        m.rotation.y = Math.atan2(dx, dz);
      }
    }
  };
  return group;
}

/* ------------------------------------------------------------------ */
/* Aurores                                                             */
/* ------------------------------------------------------------------ */

export function createAuroraCurtain({ width = 420, height = 120, seed = 41, color = 0x5ff0d0, opacity = 0.55 } = {}) {
  const geo = new THREE.PlaneGeometry(width, height, 96, 24);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(color) },
      uColorB: { value: new THREE.Color(0x7b7bff) },
      uOpacity: { value: opacity },
      uSeed: { value: seed * 0.137 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x * 0.012 + uTime * 0.13) * 9.0;
        p.y += cos(p.x * 0.019 - uTime * 0.09) * 4.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity; uniform float uSeed;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
      }
      void main(){
        vec2 p = vec2(vUv.x * 3.4 + uTime * 0.035, vUv.y * 2.2 - uTime * 0.02);
        float n = noise(p) * 0.55 + noise(p * 2.7) * 0.3 + noise(p * 6.1) * 0.15;
        float curtain = smoothstep(0.0, 0.62, vUv.y) * smoothstep(1.0, 0.30, vUv.y);
        float strands = smoothstep(0.42, 0.92, n);
        float a = curtain * strands * uOpacity;
        if (a < 0.003) discard;
        vec3 col = mix(uColorA, uColorB, n);
        gl_FragColor = vec4(col * (0.8 + n), a);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'auroraCurtain';
  mesh.frustumCulled = false;
  mesh.userData.keepMaterial = true;
  const grp = new THREE.Group();
  grp.name = 'aurora';
  grp.add(mesh);
  grp.userData.material = mat;
  grp.userData.mesh = mesh;
  grp.userData.update = (t) => {
    mat.uniforms.uTime.value = t;
  };
  return grp;
}

/* ------------------------------------------------------------------ */
/* Eclairage                                                           */
/* ------------------------------------------------------------------ */

export function setupLighting({ scene, look = 'cinematic', palette, shadows = true }) {
  const blocking = look === 'blocking';
  const group = new THREE.Group();
  group.name = 'lighting';

  const hemi = new THREE.HemisphereLight(
    new THREE.Color(palette?.horizon ? hexToInt(palette.horizon) : 0xbfe6ff),
    new THREE.Color(palette?.ground ? hexToInt(palette.ground) : 0x0a1420),
    blocking ? 2.1 : 0.85,
  );
  group.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, blocking ? 1.9 : 3.1);
  sun.position.set(18, 26, 14);
  if (shadows && !blocking) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.035;
  }
  group.add(sun);
  group.add(sun.target);

  const rim = new THREE.DirectionalLight(0x6fe6ff, blocking ? 0 : 1.35);
  rim.position.set(-22, 8, -18);
  group.add(rim);

  const fill = new THREE.DirectionalLight(0x8aa0ff, blocking ? 0 : 0.5);
  fill.position.set(6, -14, 16);
  group.add(fill);

  const bounce = new THREE.PointLight(0x2f7fae, blocking ? 0 : 0.8, 60, 2.2);
  bounce.position.set(0, -4, 0);
  group.add(bounce);

  scene.add(group);

  return {
    group,
    hemi,
    sun,
    rim,
    fill,
    bounce,
    update(_t) {},
    dispose() {
      scene.remove(group);
      group.traverse((o) => o.dispose?.());
    },
  };
}

function hexToInt(hex) {
  if (typeof hex === 'number') return hex;
  return parseInt(String(hex).replace('#', ''), 16);
}
