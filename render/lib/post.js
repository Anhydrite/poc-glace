/**
 * Chaine de post-traitement de la passe "cinematique".
 *
 * Ordre volontaire :
 *   RenderPass (lineaire) -> Bloom (lineaire) -> OutputPass (tone map ACES + sRGB)
 *   -> Grade (grain, vignette, aberration chromatique, givre sur l'objectif,
 *             etalonnage, letterbox, fondu au blanc)
 *
 * La passe "blocking" n'utilise aucun post-traitement : c'est exactement ce que
 * montre la video (playblast brut) et cela rend le contraste previz/final lisible.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { paintFrostOverlay } from './env.js';

const GradeShader = {
  name: 'IceGradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uFrostTex: { value: null },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uTime: { value: 0 },
    uGrain: { value: 0.055 },
    uVignette: { value: 0.62 },
    uChromatic: { value: 0.0016 },
    uFrost: { value: 0.5 },
    uWhiteout: { value: 0.0 },
    uExposure: { value: 1.0 },
    uBars: { value: 0.058 },
    uLift: { value: new THREE.Color(0x050d18) },
    uGain: { value: new THREE.Color(0xffffff) },
    uSaturation: { value: 1.06 },
    uTint: { value: new THREE.Color(0xcfeaff) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D uFrostTex;
    uniform vec2 uResolution;
    uniform float uTime, uGrain, uVignette, uChromatic, uFrost, uWhiteout, uExposure, uBars, uSaturation;
    uniform vec3 uLift, uGain, uTint;
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float r2 = dot(centered, centered);

      // Aberration chromatique radiale (optique froide, legerement dispersive).
      float ca = uChromatic * (0.25 + r2 * 3.2);
      vec2 dir = normalize(centered + 1e-6);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      // Givre sur l'objectif : masque radial, uniquement sur les bords.
      if (uFrost > 0.001) {
        float edge = smoothstep(0.12, 0.62, r2);
        vec2 fuv = uv * 1.0 + vec2(sin(uTime * 0.02) * 0.01, cos(uTime * 0.017) * 0.01);
        float f = texture2D(uFrostTex, fuv).r * (0.55 + 0.45 * texture2D(uFrostTex, fuv * 3.1).g);
        float frostMask = clamp(edge * f * uFrost * 2.2, 0.0, 1.0);
        vec3 frostColor = vec3(0.86, 0.95, 1.0);
        col = mix(col, frostColor, frostMask * 0.6);
      }

      // Etalonnage : lift bleute dans les basses lumieres, gain froid.
      col = col * uExposure;
      col = col * uGain;
      col = col + uLift * (1.0 - clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0));
      col = mix(col, col * uTint, 0.35);

      // Saturation.
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // Vignette.
      float vig = smoothstep(0.85, 0.18, r2 * (1.0 + uVignette));
      col *= mix(1.0, vig, uVignette * 0.85);

      // Letterbox cinematique.
      if (uBars > 0.0) {
        float bar = smoothstep(uBars, uBars - 0.006, uv.y) + smoothstep(1.0 - uBars, 1.0 - uBars + 0.006, uv.y);
        col *= 1.0 - clamp(bar, 0.0, 1.0);
      }

      // Grain argentique (anime mais deterministe via uTime quantifie).
      float g = hash(uv * uResolution + vec2(uTime * 371.13, uTime * 197.7));
      col += (g - 0.5) * uGrain;

      // Fondu au blanc (transition vers la section suivante).
      col = mix(col, vec3(1.0), clamp(uWhiteout, 0.0, 1.0));

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export function createComposer({ renderer, scene, camera, size, grain = 0.055, bars = 0.058, bloom = { strength: 0.58, radius: 0.75, threshold: 0.72 } }) {
  const composer = new EffectComposer(renderer);
  composer.setSize(size.width, size.height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), bloom.strength, bloom.radius, bloom.threshold);
  composer.addPass(bloomPass);

  composer.addPass(new OutputPass());

  const frostTex = new THREE.CanvasTexture(paintFrostOverlay(512, 512, 17));
  frostTex.wrapS = frostTex.wrapT = THREE.RepeatWrapping;
  frostTex.colorSpace = THREE.NoColorSpace;

  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uFrostTex.value = frostTex;
  grade.uniforms.uResolution.value.set(size.width, size.height);
  grade.uniforms.uGrain.value = grain;
  grade.uniforms.uBars.value = bars;
  composer.addPass(grade);

  return {
    composer,
    renderPass,
    bloomPass,
    grade,
    setSize(w, h) {
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
      grade.uniforms.uResolution.value.set(w, h);
    },
    update(t) {
      grade.uniforms.uTime.value = t;
    },
    dispose() {
      composer.dispose?.();
      frostTex.dispose();
    },
  };
}
