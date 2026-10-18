import { createRenderKit } from './lib/kit.js';
import { SCENES, listScenes } from './scenes/index.js';

const params = new URLSearchParams(location.search);

function num(key, fallback) {
  const v = params.get(key);
  return v == null || v === '' ? fallback : Number(v);
}

const concept = params.get('concept') || '1';
const look = params.get('look') || 'cinematic';
const ss = num('ss', 1);
const spec = SCENES[concept];

const status = document.getElementById('status');
const errors = [];
window.__errors = errors;
window.onerror = (msg, src, line, col) => errors.push(`${msg} @${src}:${line}:${col}`);
window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + (e.reason?.stack || e.reason)));

if (!spec) {
  status.textContent = 'scene inconnue: ' + concept;
  window.__errors.push('scene inconnue: ' + concept);
} else {
  const baseW = spec.size?.[0] ?? 1280;
  const baseH = spec.size?.[1] ?? 720;
  const width = Math.round(baseW * ss);
  const height = Math.round(baseH * ss);

  const canvas = document.getElementById('view');
  canvas.width = width;
  canvas.height = height;

  const kit = createRenderKit({
    canvas,
    spec,
    look,
    showHelpers: params.get('helpers') !== '0',
    width,
    height,
  });

  window.__kit = kit;

  // Isolation de calques pour le diagnostic : ?hide=lightShafts,snowfall
  const hide = (params.get('hide') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (hide.length) {
    kit.scene.traverse((o) => {
      if (hide.includes(o.name)) o.visible = false;
    });
  }
  window.__meta = {
    id: spec.id,
    title: spec.title,
    duration: spec.duration,
    fps: spec.fps ?? 30,
    frames: Math.round(spec.duration * (spec.fps ?? 30)),
    baseWidth: baseW,
    baseHeight: baseH,
    renderWidth: width,
    renderHeight: height,
    look,
  };

  // Pose de camera exposee apres chaque rendu : elle permet de verifier, hors
  // du navigateur, que la passe blocking et la passe cinematique partagent
  // exactement le meme chemin de camera.
  const capturePose = () => {
    window.__pose = {
      pos: kit.camera.position.toArray(),
      quat: kit.camera.quaternion.toArray(),
      fov: kit.camera.fov,
      look: look,
    };
  };

  window.__renderFrame = (index) => {
    const fps = spec.fps ?? 30;
    kit.renderFrame(index / fps);
    capturePose();
    return true;
  };
  window.__renderAt = (seconds) => {
    kit.renderFrame(seconds);
    capturePose();
    return true;
  };
  window.__capture = () => canvas.toDataURL('image/png');

  window.__frameToDataUrl = (index) => {
    window.__renderFrame(index);
    return canvas.toDataURL('image/png');
  };

  // Rendu de la premiere image pour valider que tout compile.
  try {
    kit.renderFrame(0);
    status.textContent = `${spec.id} / ${look} pret`;
  } catch (err) {
    errors.push('build: ' + (err?.stack || err));
    status.textContent = 'erreur: ' + (err?.message || err);
  }
  window.__ready = true;
}

export {};
