/**
 * Moteur de scrub vidéo piloté par le scroll.
 *
 * Le principe (trick n°1 de la vidéo de référence) : la vidéo ne joue pas, elle
 * est *écrite*. La position de scroll est convertie en temps de lecture, et une
 * seule boucle requestAnimationFrame écrit `currentTime` pour toutes les
 * séquences de la page.
 *
 * Points d'ingénierie qui font que ça reste fluide :
 *  - les MP4 sont encodés avec un GOP très court (une image-clé toutes les 7 à 8
 *    images) et l'option `faststart`, donc chaque seek est quasi instantané ;
 *  - on n'écrit `currentTime` que si l'écart dépasse un pas minimal : inutile de
 *    demander deux fois la même image ;
 *  - les positions des sections sont mises en cache et recalculées seulement au
 *    resize ;
 *  - si la vidéo ne peut pas être scrubbée (mouvement réduit, erreur, mobile
 *    lent), on retombe sur le poster et le texte s'affiche intégralement.
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Une séquence = un conteneur [data-scroll-video] dans une section [data-scroll]. */
export class ScrollVideo {
  constructor(root) {
    this.root = root;
    this.section = root.closest('[data-scroll]') || root;
    this.exclusive = root.hasAttribute('data-exclusive');
    this.layers = [...root.querySelectorAll('video.layer')];
    this.cinematic = this.layers.find((v) => v.classList.contains('layer--cinematic')) || null;
    this.blocking = this.layers.find((v) => v.classList.contains('layer--blocking')) || null;

    this.mode = 'cinematic';
    this.slug = root.getAttribute('data-concept-slug') || '';
    this.duration = 0;
    this.fps = 30;
    this.progress = 0;
    this.time = 0;
    this.lastWritten = -1;
    this.ready = false;
    this.disabled = false;

    this.hudTime = this.section.querySelector('[data-hud-time]');
    this.whiteout = this.root.querySelector('.stage__whiteout');

    // Les sources ne sont pas écrites dans le HTML (le site doit pouvoir être
    // construit même si une vidéo n'a pas encore été rendue) : elles sont
    // résolues ici depuis le slug du concept et le nom du calque.
    this.resolveSources();

    this.start = 0;
    this.span = 1;
    this.measure();
  }

  /** Construit les URLs des deux passes à partir du slug du concept. */
  resolveSources() {
    const slug = this.slug;
    if (!slug) return;
    for (const v of this.layers) {
      if (v.getAttribute('src') || v.querySelector('source')) continue;
      const look = v.classList.contains('layer--blocking') ? 'blocking' : 'cinematic';
      // Chemin relatif au document : le site fonctionne aussi en file://.
      v.setAttribute('src', `assets/video/${slug}-${look}.mp4`);
    }
  }

  /**
   * Charge les métadonnées d'une vidéo et déduit la durée utile.
   * Si le calque du mode courant échoue (asset manquant), on bascule
   * automatiquement sur l'autre passe : le site ne doit jamais rester bloqué
   * parce qu'un fichier n'est pas encore rendu.
   */
  load() {
    return this.tryLoad(this.mode === 'blocking' ? this.blocking : this.cinematic).then((ok) => {
      if (ok) return true;
      const other = this.mode === 'blocking' ? this.cinematic : this.blocking;
      if (!other) return false;
      return this.tryLoad(other).then((ok2) => {
        if (ok2) {
          this.mode = this.mode === 'blocking' ? 'cinematic' : 'blocking';
          this.layers.forEach((v) => v.classList.toggle('is-visible', v === other));
          this.root.setAttribute('data-mode', this.mode);
        } else {
          this.disabled = true;
        }
        return ok2;
      });
    });
  }

  tryLoad(target) {
    return new Promise((resolve) => {
      if (!target) {
        resolve(false);
        return;
      }
      let settled = false;
      let poll = 0;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        target.removeEventListener('loadedmetadata', accept);
        target.removeEventListener('canplay', accept);
        target.removeEventListener('error', onError);
        resolve(ok);
      };
      const accept = () => {
        // Tant que les métadonnées ne sont pas là, on ne conclut à rien : un
        // appel prématuré ne doit pas être interprété comme un échec.
        if (target.readyState < 1) return;
        const duration = Number(target.duration);
        if (!Number.isFinite(duration) || duration <= 0.2) {
          finish(false);
          return;
        }
        this.duration = duration;
        // Chrome peut être en avance d'une demi-image après un seek : on garde
        // une marge pour pouvoir atteindre la toute dernière image.
        this.maxTime = Math.max(0, duration - 1 / (this.fps * 2));
        this.ready = true;
        finish(true);
      };
      const onError = () => finish(false);

      if (target.readyState >= 1 && target.duration) {
        accept();
        return;
      }

      target.addEventListener('loadedmetadata', accept);
      target.addEventListener('canplay', accept);
      target.addEventListener('error', onError);

      try {
        // On ne demande d'abord que les metadonnees : les dix sequences du site
        // representent plusieurs dizaines de Mo, inutile de tout tirer au
        // demarrage. Le tampon est elargi par warm() quand la section approche.
        target.preload = 'metadata';
        target.load();
      } catch {
        finish(false);
        return;
      }

      // Filet de sécurité : on n'attend pas passivement un événement qui a pu
      // déjà être émis pendant l'enregistrement des écouteurs.
      let waited = 0;
      poll = window.setInterval(() => {
        waited += 120;
        if (target.readyState >= 1 && target.duration) {
          accept();
        } else if (waited > 6000) {
          finish(false);
        }
      }, 120);
      setTimeout(accept, 0);
    });
  }

  /**
   * Elargit le tampon de la sequence qui approche de la fenetre. Idempotent.
   * C'est ce qui garde le scrub fluide sans charger la page au demarrage.
   */
  warm() {
    if (this.warmed || this.disabled) return;
    this.warmed = true;
    const targets = this.exclusive ? [this.mode === 'blocking' ? this.blocking : this.cinematic] : [this.cinematic, this.blocking];
    for (const v of targets) {
      if (!v) continue;
      try {
        if (v.preload !== 'auto') {
          v.preload = 'auto';
          v.load();
        }
      } catch {
        /* noop */
      }
    }
  }

  measure() {
    const el = this.section;
    this.start = el.offsetTop;
    this.span = Math.max(1, el.offsetHeight - window.innerHeight);
  }

  /** Applique le mode de rendu (cinematic / blocking). Idempotent. */
  setMode(mode) {
    const changed = this.mode !== mode;
    const previous = this.mode === 'blocking' ? this.blocking : this.cinematic;
    this.mode = mode;
    const next = mode === 'blocking' ? this.blocking : this.cinematic;

    if (!this.exclusive) {
      // Comparateur : les deux passes restent visibles en permanence.
      this.layers.forEach((v) => v.classList.add('is-visible'));
      this.root.setAttribute('data-mode', mode);
      return;
    }

    if (changed && previous && next && Number.isFinite(previous.currentTime) && previous.currentTime > 0) {
      // La vidéo qui entre se recale sur le temps exact de celle qui sort :
      // le mouvement doit être identique au pixel près.
      this.seekTo(next, previous.currentTime);
    }
    this.layers.forEach((v) => v.classList.toggle('is-visible', v === next));
    this.root.setAttribute('data-mode', mode);
    this.lastWritten = -1;
    const hudMode = this.section.querySelector('[data-hud-mode]');
    if (hudMode) hudMode.textContent = mode === 'blocking' ? 'prévisualisation' : 'rendu cinématique';
  }

  seekTo(video, time) {
    try {
      video.currentTime = clamp(time, 0, Math.max(0, (video.duration || time) - 0.001));
    } catch {
      /* noop */
    }
  }

  /** Appelé par la boucle globale. Ne fait rien si la section est hors écran. */
  update(scrollY, viewportHeight, force = false) {
    if (this.disabled || !this.ready) return;
    const p = clamp((scrollY - this.start) / this.span, 0, 1);
    this.progress = p;
    const target = p * this.maxTime;
    this.time = target;

    const visible = scrollY + viewportHeight > this.start - 80 && scrollY < this.start + this.span + viewportHeight;
    if (!visible && !force) return;

    const step = 1 / (this.fps * 60);
    const active = !this.exclusive || this.mode === 'cinematic' ? [this.cinematic, this.blocking] : [this.blocking, this.cinematic];
    const [primary, secondary] = active;

    if (primary && Math.abs(primary.currentTime - target) > step) {
      this.seekTo(primary, target);
    }
    if (!this.exclusive) {
      if (secondary && Math.abs(secondary.currentTime - target) > step) this.seekTo(secondary, target);
    } else if (force && secondary) {
      this.seekTo(secondary, target);
    }

    if (this.hudTime) this.hudTime.textContent = target.toFixed(1);
    if (this.whiteout) this.whiteout.style.opacity = String(this.whiteoutFor(target));
  }

  /** Fondu au blanc de fin de séquence (concept 2 le pousse jusqu'à 1). */
  whiteoutFor(time) {
    if (!this.whiteoutProfile) return 0;
    const [a, b] = this.whiteoutProfile;
    return clamp((time - a) / (b - a), 0, 1);
  }

  setWhiteoutProfile(a, b) {
    this.whiteoutProfile = [a, b];
  }
}

/** Boucle unique pour toutes les séquences. */
export class Scrubber {
  constructor() {
    this.items = [];
    this.tick = this.tick.bind(this);
    this.running = false;
    this.onFrame = [];
  }

  add(item) {
    this.items.push(item);
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
  }

  measureAll() {
    for (const it of this.items) it.measure();
  }

  tick() {
    if (!this.running) return;
    const y = window.scrollY || window.pageYOffset || 0;
    const vh = window.innerHeight;
    for (const it of this.items) it.update(y, vh);
    for (const fn of this.onFrame) fn(this.items);
    requestAnimationFrame(this.tick);
  }
}

export const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { clamp };
