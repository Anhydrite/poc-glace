/**
 * Environnement lumineux procedural (pas de HDRI externe : le POC doit rester
 * 100% hors-ligne et regenerable).
 *
 * On peint une equirectangulaire (ciel boreallien : zenith bleu nuit, horizon
 * cyan pale, soleil froid, bande d'aurore) dans un canvas, on la convertit en
 * DataTexture, puis on la passe au PMREMGenerator de three pour obtenir la
 * cubemap preconvoluee utilisee par les materiaux physiques (reflexions de la
 * glace) et par scene.environment.
 */
import * as THREE from 'three';

const PALETTES = {
  fjord: {
    zenith: '#02060f',
    horizon: '#63b0d8',
    ground: '#03080e',
    sun: '#dff2ff',
    sunDir: [0.42, 0.16],
    aurora: ['#3ef0c8', '#7b6cff', '#5ad9ff'],
    auroraAlpha: 0.85,
    cloud: '#0a2136',
  },
  tundra: {
    zenith: '#03080f',
    horizon: '#a9cfe8',
    ground: '#060e18',
    sun: '#ffffff',
    sunDir: [-0.3, 0.28],
    aurora: ['#8fe9ff', '#ffffff', '#b7d4ff'],
    auroraAlpha: 0.5,
    cloud: '#0d2436',
  },
  studio: {
    zenith: '#0a1420',
    horizon: '#3f6d8c',
    ground: '#04080d',
    sun: '#bfe6ff',
    sunDir: [0.1, 0.4],
    aurora: ['#5fd0ff', '#9ad8ff', '#ffffff'],
    auroraAlpha: 0.35,
    cloud: '#0d2131',
  },
};

export function paintEquirect(paletteName = 'fjord', width = 1024, height = 512) {
  const p = PALETTES[paletteName] || PALETTES.fjord;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Ciel : degrade vertical.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0.0, p.zenith);
  sky.addColorStop(0.42, mix(p.horizon, p.zenith, 0.45));
  sky.addColorStop(0.5, p.horizon);
  sky.addColorStop(0.62, mix(p.horizon, p.ground, 0.55));
  sky.addColorStop(1.0, p.ground);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Soleil froid + halo.
  const sx = ((p.sunDir[0] + 1) / 2) * width;
  const sy = (0.5 - p.sunDir[1] * 0.5) * height;
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, width * 0.28);
  halo.addColorStop(0, hexA(p.sun, 0.95));
  halo.addColorStop(0.12, hexA(p.sun, 0.5));
  halo.addColorStop(0.45, hexA(p.sun, 0.12));
  halo.addColorStop(1, hexA(p.sun, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  // Bandes d'aurore (bruit doux, deterministe).
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  ctx.globalCompositeOperation = 'lighter';
  for (let band = 0; band < 9; band++) {
    const cy = height * (0.12 + rnd() * 0.36);
    const amp = 12 + rnd() * 46;
    const col = p.aurora[band % p.aurora.length];
    ctx.strokeStyle = hexA(col, (p.auroraAlpha * (0.1 + rnd() * 0.22)).toFixed(3));
    ctx.lineWidth = 6 + rnd() * 46;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = cy + Math.sin((x / width) * Math.PI * 2 * (1 + rnd() * 0.02) + band) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Voile nuageux bas (horizon).
  const cloud = ctx.createLinearGradient(0, height * 0.42, 0, height * 0.58);
  cloud.addColorStop(0, hexA(p.cloud, 0));
  cloud.addColorStop(0.5, hexA(p.cloud, 0.55));
  cloud.addColorStop(1, hexA(p.cloud, 0));
  ctx.fillStyle = cloud;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

export function createEnvironment(renderer, paletteName = 'fjord') {
  const canvas = paintEquirect(paletteName);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(tex);
  pmrem.dispose();

  // Version floutee pour le fond (evite de voir la couture equirect).
  const bgTex = tex.clone();
  bgTex.mapping = THREE.EquirectangularReflectionMapping;
  bgTex.needsUpdate = true;

  return { envMap: envRT.texture, background: bgTex, rawTexture: tex, palette: PALETTES[paletteName] || PALETTES.fjord };
}

export function paintFrostOverlay(width = 512, height = 512, seed = 7) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 900; i++) {
    const x = rnd() * width;
    const y = rnd() * height;
    const r = 1 + rnd() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + rnd() * 0.16;
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cristaux anguleux.
  for (let i = 0; i < 260; i++) {
    const x = rnd() * width;
    const y = rnd() * height;
    const len = 6 + rnd() * 40;
    const ang = rnd() * Math.PI * 2;
    ctx.strokeStyle = `rgba(210,240,255,${0.06 + rnd() * 0.2})`;
    ctx.lineWidth = 0.6 + rnd() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang + 2.1) * len * 0.6, y + Math.sin(ang + 2.1) * len * 0.6);
    ctx.stroke();
  }
  return canvas;
}

function mix(a, b, t) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function hexA(hex, alpha) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
