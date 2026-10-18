/**
 * Bibliotheque de materiaux "glace".
 *
 * Principe central du POC, directement derive de la video : la MEME scene est
 * rendue deux fois.
 *
 *  - look "blocking"  : equivalent du playblast / solid-view de Blender. Couleurs
 *                       plates, pas d'ombres, pas de post-traitement. Sert a
 *                       valider uniquement la composition et le mouvement.
 *  - look "cinematic" : equivalent du rendu Seedance 2.5. Glace physique
 *                       (transmission, clearcoat, iridescence), ombres douces,
 *                       brouillard volumetrique, bloom, grain.
 *
 * Les scenes ne demandent jamais un THREE.Material concret : elles demandent un
 * "slot" semantique (ice, snow, metal...) et la bibliotheque choisit
 * l'implementation adaptee au look courant. C'est ce qui garantit que le
 * mouvement est identique d'une passe a l'autre.
 */
import * as THREE from 'three';

/** Couleurs du viewport "solid" de Blender, pour l'authenticite du blocking. */
const BLOCKING_COLORS = {
  ice: 0x9fc6e8,
  iceDeep: 0x4a7ba6,
  iceGlass: 0xbfe3ff,
  frost: 0xd6e9f7,
  snow: 0xe8eef4,
  rock: 0x4a5560,
  metal: 0x8b98a5,
  metalWarm: 0xc79a5b,
  glass: 0x9ec9e0,
  emissive: 0xf0c56a,
  cloud: 0xcfd8e0,
  water: 0x16283c,
  crystal: 0xa8e0ff,
  figure: 0xdbe7f2,
  blade: 0x8ff0ff,
  dark: 0x39424d,
  accent: 0xff8f5a,
  grid: 0x3a4a58,
};

export const SLOTS = Object.keys(BLOCKING_COLORS);

/** Palette de la passe cinematique : plus contrastee, plus profonde, plus froide.
 *  (La palette blocking reste volontairement plate et neutre, comme le
 *  viewport "solid" de Blender.) */
const CINEMATIC_COLORS = {
  ice: 0x9ccff2,
  iceDeep: 0x2f6f9e,
  iceGlass: 0xcdeeff,
  frost: 0xb9d5e8,
  snow: 0x9dbdd6,
  rock: 0x36434f,
  metal: 0x8695a4,
  metalWarm: 0xb98a52,
  glass: 0xcfeaff,
  emissive: 0x7fe6ff,
  cloud: 0x6f96b8,
  water: 0x16283c,
  crystal: 0x9fe0ff,
  figure: 0xc2d8ea,
  blade: 0x8ff0ff,
  dark: 0x2a343f,
  accent: 0xff8f5a,
  grid: 0x3a4a58,
};

export class MaterialLibrary {
  constructor({ renderer, envMap, look = 'cinematic', globalSeed = 1 }) {
    this.renderer = renderer;
    this.envMap = envMap; // THREE.EnvironmentTexture
    this.look = look;
    this.cache = new Map();
    this.tracked = new Set();
    this._noiseTex = null;
  }

  get isBlocking() {
    return this.look === 'blocking';
  }

  get isCinematic() {
    return this.look !== 'blocking';
  }

  noiseTexture() {
    if (this._noiseTex) return this._noiseTex;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    let s = 1337;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        for (let c = 0; c < 4; c++) {
          // bruit colore doux pour casser les surfaces trop lisses
          const n = 128 + (rnd() - 0.5) * 90;
          img.data[i + c] = Math.max(0, Math.min(255, n));
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.repeat.set(1, 1);
    this._noiseTex = tex;
    return tex;
  }

  /**
   * @param {string} slot nom semantique du materiau
   * @param {object} [overrides] surcharges (couleur, roughness, ...) + options de rendu
   */
  get(slot, overrides = {}) {
    const key = slot + '|' + JSON.stringify(overrides);
    if (this.cache.has(key)) return this.cache.get(key);

    const m = this.isBlocking ? this._blocking(slot, overrides) : this._cinematic(slot, overrides);
    this.cache.set(key, m);
    this.tracked.add(m);
    return m;
  }

  _baseColor(slot, overrides) {
    if (overrides.color != null) return overrides.color;
    const table = this.isBlocking ? BLOCKING_COLORS : CINEMATIC_COLORS;
    return table[slot] ?? 0xbfd4e2;
  }

  _blocking(slot, o) {
    const color = this._baseColor(slot, o);
    const params = {
      color,
      flatShading: o.flatShading !== false,
      transparent: o.opacity != null && o.opacity < 1,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
    };
    let mat;
    if (slot === 'emissive' || slot === 'blade') {
      mat = new THREE.MeshBasicMaterial({ color, transparent: params.transparent, opacity: params.opacity, side: params.side });
    } else {
      mat = new THREE.MeshLambertMaterial(params);
    }
    // Micro-variation des teintes pour eviter l'aspect "un seul aplat".
    if (!(slot === 'emissive' || slot === 'blade') && o.tint !== false) {
      const c = new THREE.Color(color);
      const hsl = {};
      c.getHSL(hsl);
      c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + (o.tintShift ?? 0))));
      mat.color = c;
    }
    mat.name = `blocking:${slot}`;
    return mat;
  }

  _cinematic(slot, o) {
    const color = this._baseColor(slot, o);
    const common = {
      envMap: this.envMap,
      envMapIntensity: o.envMapIntensity ?? 1.2,
      side: o.side ?? THREE.FrontSide,
    };

    const noTransmission = ['cloud', 'grid', 'emissive', 'blade', 'water', 'dark'];
    const isVolumetric = ['cloud', 'grid'].includes(slot);

    let mat;
    switch (slot) {
      case 'ice':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.3,
          metalness: 0,
          clearcoat: o.clearcoat ?? 1.0,
          clearcoatRoughness: o.clearcoatRoughness ?? 0.08,
          sheen: 0.4,
          sheenRoughness: 0.45,
          sheenColor: new THREE.Color(0x8fd0ff),
          transmission: o.transmission ?? 0.22,
          thickness: o.thickness ?? 2.2,
          ior: 1.31,
          attenuationColor: new THREE.Color(0x1d5f92),
          attenuationDistance: o.attenuationDistance ?? 3.6,
          iridescence: o.iridescence ?? 0.42,
          iridescenceIOR: 1.34,
          iridescenceThicknessRange: [120, 520],
          flatShading: true,
          envMapIntensity: o.envMapIntensity ?? 1.35,
        });
        break;
      case 'iceGlass':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: 0.04,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          transmission: o.transmission ?? 0.92,
          thickness: o.thickness ?? 2.4,
          ior: 1.31,
          attenuationColor: new THREE.Color(0x5fb6d9),
          attenuationDistance: 5.5,
          iridescence: 0.3,
          iridescenceIOR: 1.33,
          transparent: false,
        });
        break;
      case 'iceDeep':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.38,
          metalness: 0,
          clearcoat: 0.5,
          clearcoatRoughness: 0.3,
          sheen: 0.25,
          sheenColor: new THREE.Color(0x76b8e6),
          transmission: o.transmission ?? 0.1,
          thickness: 3.4,
          ior: 1.31,
          attenuationColor: new THREE.Color(0x0b2c4c),
          attenuationDistance: 1.4,
          envMapIntensity: o.envMapIntensity ?? 1.0,
          flatShading: true,
        });
        break;
      case 'frost':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.78,
          metalness: 0,
          sheen: 0.7,
          sheenColor: new THREE.Color(0xcfeaff),
          clearcoat: 0.25,
          clearcoatRoughness: 0.6,
          transmission: 0,
          flatShading: true,
          normalMap: this.noiseTexture(),
          normalScale: new THREE.Vector2(0.09, 0.09),
        });
        break;
      case 'snow':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.68,
          metalness: 0,
          sheen: 0.85,
          sheenRoughness: 0.6,
          sheenColor: new THREE.Color(0xeaf6ff),
          clearcoat: 0.12,
          clearcoatRoughness: 0.75,
          envMapIntensity: o.envMapIntensity ?? 1.05,
          normalMap: this.noiseTexture(),
          normalScale: new THREE.Vector2(0.11, 0.11),
          flatShading: true,
        });
        break;
      case 'rock':
        mat = new THREE.MeshStandardMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.88,
          metalness: 0.05,
          normalMap: this.noiseTexture(),
          normalScale: new THREE.Vector2(0.09, 0.09),
          flatShading: true,
        });
        break;
      case 'metal':
        mat = new THREE.MeshStandardMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.42,
          metalness: o.metalness ?? 0.92,
          envMapIntensity: o.envMapIntensity ?? 1.4,
          normalMap: this.noiseTexture(),
          normalScale: new THREE.Vector2(0.04, 0.04),
        });
        break;
      case 'metalWarm':
        mat = new THREE.MeshStandardMaterial({
          ...common,
          color,
          roughness: 0.34,
          metalness: 0.95,
          envMapIntensity: 1.5,
        });
        break;
      case 'glass':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: 0.02,
          metalness: 0,
          transmission: o.transmission ?? 0.98,
          thickness: 0.25,
          ior: 1.45,
          transparent: true,
          opacity: o.opacity ?? 0.35,
          side: THREE.DoubleSide,
        });
        break;
      case 'emissive':
        mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: o.opacity != null, opacity: o.opacity ?? 1 });
        break;
      case 'blade':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          emissive: new THREE.Color(o.emissive ?? 0x59e6ff),
          emissiveIntensity: o.emissiveIntensity ?? 2.6,
          roughness: 0.08,
          metalness: 0,
          transmission: 0.7,
          thickness: 0.6,
          ior: 1.34,
          clearcoat: 1,
          transparent: true,
          opacity: 0.92,
        });
        break;
      case 'water':
        // Glace vive : sombre, legerement reflechissante, facettee.
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.34,
          metalness: o.metalness ?? 0.24,
          envMapIntensity: o.envMapIntensity ?? 1.05,
          clearcoat: 0.5,
          clearcoatRoughness: 0.28,
          flatShading: true,
        });
        break;
      case 'crystal':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: 0.06,
          metalness: 0,
          transmission: o.transmission ?? 0.85,
          thickness: 0.9,
          ior: 1.4,
          iridescence: 0.6,
          iridescenceIOR: 1.4,
          clearcoat: 1,
          emissive: new THREE.Color(0x2f7fae),
          emissiveIntensity: 0.55,
        });
        break;
      case 'figure':
        mat = new THREE.MeshPhysicalMaterial({
          ...common,
          color,
          roughness: 0.3,
          metalness: 0.08,
          clearcoat: 0.85,
          clearcoatRoughness: 0.2,
          sheen: 0.6,
          sheenColor: new THREE.Color(0xbfe6ff),
          transmission: o.transmission ?? 0.12,
          thickness: 1.1,
          envMapIntensity: 1.25,
          flatShading: true,
        });
        break;
      case 'cloud':
        mat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: o.opacity ?? 0.75 },
            uTime: { value: 0 },
            uSeed: { value: o.seed ?? 3.1 },
            uSoft: { value: o.soft ?? 0.42 },
          },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            varying vec3 vWorld;
            void main() {
              vUv = uv;
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorld = wp.xyz;
              gl_Position = projectionMatrix * viewMatrix * wp;
            }
          `,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uTime;
            uniform float uSeed;
            uniform float uSoft;
            varying vec2 vUv;
            varying vec3 vWorld;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453123); }
            float noise(vec2 p){
              vec2 i = floor(p); vec2 f = fract(p);
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                         mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }
            void main() {
              vec2 p = vUv * vec2(3.0, 2.0) + vec2(uTime * 0.02, uTime * 0.012);
              float n = noise(p) * 0.6 + noise(p * 2.3) * 0.3 + noise(p * 5.1) * 0.1;
              float radial = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x)
                           * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
              float a = smoothstep(uSoft, 1.0, n) * radial * uOpacity;
              if (a < 0.004) discard;
              gl_FragColor = vec4(uColor * (0.65 + n * 0.7), a);
            }
          `,
        });
        break;
      case 'grid':
        mat = new THREE.ShaderMaterial({
          transparent: true,
          uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: o.opacity ?? 0.3 } },
          vertexShader: /* glsl */ `
            varying vec3 vPos;
            void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
          `,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor; uniform float uOpacity; varying vec3 vPos;
            void main(){
              vec2 g = abs(fract(vPos.xz * 0.5) - 0.5) / max(fwidth(vPos.xz * 0.5), vec2(1e-5));
              float line = 1.0 - min(min(g.x, g.y), 1.0);
              gl_FragColor = vec4(uColor, line * uOpacity);
            }
          `,
        });
        break;
      case 'dark':
        mat = new THREE.MeshStandardMaterial({
          ...common,
          color,
          roughness: o.roughness ?? 0.62,
          metalness: o.metalness ?? 0.35,
          envMapIntensity: o.envMapIntensity ?? 1.15,
          flatShading: o.flatShading === true,
        });
        break;
      case 'accent':
        mat = new THREE.MeshStandardMaterial({
          ...common,
          color,
          roughness: 0.45,
          metalness: 0.3,
          emissive: new THREE.Color(color),
          emissiveIntensity: o.emissiveIntensity ?? 0.35,
        });
        break;
      default:
        mat = new THREE.MeshPhysicalMaterial({ ...common, color, roughness: 0.4, metalness: 0, transmission: 0.15 });
    }

    if (o.opacity != null && !isVolumetric && mat.transparent === undefined) {
      mat.transparent = o.opacity < 1;
      mat.opacity = o.opacity;
    }
    if (o.emissiveIntensity != null && 'emissiveIntensity' in mat) mat.emissiveIntensity = o.emissiveIntensity;
    if (o.flatShading === true && 'flatShading' in mat) mat.flatShading = true;
    if (o.wireframe) mat.wireframe = true;
    if (o.depthWrite === false) mat.depthWrite = false;
    if (o.polygonOffset) {
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = o.polygonOffsetFactor ?? -1;
      mat.polygonOffsetUnits = o.polygonOffsetUnits ?? -1;
    }
    mat.name = `cinematic:${slot}`;
    // Evite le double-pass couteux de transmission sur les tres gros volumes.
    if (mat.transmission > 0 && o.cheapTransmission) mat.transmission = 0;
    return mat;
  }

  /** Suit les uniformes temporels (materiaux cloud) pour l'animation frame a frame. */
  tick(t) {
    for (const m of this.tracked) {
      if (m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = t;
    }
  }

  dispose() {
    for (const m of this.tracked) m.dispose?.();
    this.tracked.clear();
    this.cache.clear();
    this._noiseTex?.dispose();
  }
}
