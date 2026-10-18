/**
 * Comparateur prévisualisation / final.
 *
 * Deux vidéos superposées (la passe blocking dessous, la passe cinématique
 * découpée par clip-path par-dessus) et une poignée déplaçable. Les deux vidéos
 * sont scrubbées en parallèle par le moteur de scroll : à tout instant les deux
 * passes montrent la MÊME image du MÊME chemin de caméra.
 */
export function initCompare(media) {
  if (!media || media.dataset.compareReady === '1') return null;
  media.dataset.compareReady = '1';

  let split = Number(media.getAttribute('data-split') || 0.5);
  let dragging = false;
  let sweep = null;

  const apply = () => {
    media.style.setProperty('--split', String(split));
    media.setAttribute('aria-valuenow', String(Math.round(split * 100)));
  };

  const setFromClientX = (clientX) => {
    const rect = media.getBoundingClientRect();
    split = Math.min(0.995, Math.max(0.005, (clientX - rect.left) / rect.width));
    apply();
  };

  // Accessibilité : le bloc se comporte comme un curseur.
  media.setAttribute('role', 'slider');
  media.setAttribute('tabindex', '0');
  media.setAttribute('aria-label', 'Comparer la prévisualisation et le rendu final');
  media.setAttribute('aria-valuemin', '0');
  media.setAttribute('aria-valuemax', '100');
  apply();

  media.addEventListener('pointerdown', (e) => {
    if (sweep) {
      cancelAnimationFrame(sweep);
      sweep = null;
    }
    dragging = true;
    media.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  });
  media.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  });
  const end = () => {
    dragging = false;
  };
  media.addEventListener('pointerup', end);
  media.addEventListener('pointercancel', end);
  window.addEventListener('pointerup', end);

  media.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowLeft') {
      split = Math.max(0.005, split - step);
      apply();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      split = Math.min(0.995, split + step);
      apply();
      e.preventDefault();
    }
  });

  const runSweep = () => {
    if (sweep) cancelAnimationFrame(sweep);
    const t0 = performance.now();
    const from = split;
    const loop = (now) => {
      const k = ((now - t0) / 3200) % 1; // 0 -> 1 en 3,2 s
      const tri = k < 0.5 ? k * 2 : 2 - k * 2;
      split = 0.02 + tri * 0.96;
      apply();
      const fromK = Math.min(1, (now - t0) / 900);
      if (fromK < 1) split = from + (split - from) * fromK;
      sweep = requestAnimationFrame(loop);
    };
    sweep = requestAnimationFrame(loop);
  };

  return {
    media,
    get split() {
      return split;
    },
    set(value) {
      split = Math.min(0.995, Math.max(0.005, value));
      apply();
    },
    sweep: runSweep,
    stop() {
      if (sweep) cancelAnimationFrame(sweep);
      sweep = null;
    },
  };
}

export function initCompareControls(root, compare) {
  if (!root || !compare) return;
  root.querySelectorAll('[data-compare-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      compare.stop();
      compare.set(Number(btn.getAttribute('data-compare-preset')));
    });
  });
  const animateBtn = root.querySelector('#compare-animate');
  animateBtn?.addEventListener('click', () => compare.sweep());
  // Un drag manuel interrompt le balayage automatique.
  compare.media.addEventListener('pointerdown', () => compare.stop());
}
