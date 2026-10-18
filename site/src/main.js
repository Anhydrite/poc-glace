/**
 * Amorçage du site.
 *
 * Responsabilités :
 *  - marquer le document comme "JS actif" (sinon tout le contenu reste visible) ;
 *  - dériver --scroll-len des sections depuis data-scroll ;
 *  - instancier une ScrollVideo par séquence et les brancher sur une boucle unique ;
 *  - brancher la timeline (textes ancrés au temps vidéo) ;
 *  - gérer le sélecteur global final / prévisualisation ;
 *  - gérer la section de déploiement plein écran ;
 *  - révéler les contenus statiques (workflow, FAQ) via IntersectionObserver ;
 *  - rendre les prompts générés ;
 *  - dégrader proprement (posters fixes) si la vidéo n'est pas scrubbable.
 */
import { Scrubber, ScrollVideo, prefersReducedMotion, clamp } from './scroll-video.js';
import { Timeline } from './timeline.js';
import { initCompare, initCompareControls } from './compare.js';
import { PROMPTS } from './prompts.generated.js';

const root = document.documentElement;
root.classList.add('js');

const scrubber = new Scrubber();
const sequences = [];
const timelines = [];
let mode = 'cinematic';
let compare = null;

/* ------------------------------------------------------------------ */
/* 1. Longueur de scroll des sections                                  */
/* ------------------------------------------------------------------ */
function applyScrollLengths() {
  document.querySelectorAll('[data-scroll]').forEach((el) => {
    const value = el.getAttribute('data-scroll') || '3';
    el.style.setProperty('--scroll-len', value);
  });
}

/* ------------------------------------------------------------------ */
/* 2. Sélecteur de mode global                                         */
/* ------------------------------------------------------------------ */
function applyMode(next) {
  mode = next;
  root.dataset.mode = next;
  document.querySelectorAll('.mode-switch__btn').forEach((btn) => {
    const active = btn.getAttribute('data-mode') === next;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  for (const seq of sequences) seq.setMode(next);
}

/* ------------------------------------------------------------------ */
/* 3. Section de déploiement plein écran                               */
/* ------------------------------------------------------------------ */
function initReveal() {
  const section = document.querySelector('[data-reveal]')?.closest('[data-scroll]');
  const frame = document.querySelector('[data-reveal]');
  if (!section || !frame) return;
  const updateReveal = () => {
    const start = section.offsetTop;
    const span = Math.max(1, section.offsetHeight - window.innerHeight);
    const p = clamp((window.scrollY - start) / span, 0, 1);
    frame.style.setProperty('--reveal', p.toFixed(4));
  };
  scrubber.onFrame.push(updateReveal);
  updateReveal();
}

/* ------------------------------------------------------------------ */
/* 4. Chrome de page                                                   */
/* ------------------------------------------------------------------ */
function initChrome() {
  const bar = document.getElementById('scroll-progress-bar');
  const header = document.getElementById('site-header');
  const onScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = clamp(window.scrollY / max, 0, 1);
    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    header?.classList.toggle('is-condensed', window.scrollY > 80);
  };
  scrubber.onFrame.push(onScroll);
  onScroll();
}

/* ------------------------------------------------------------------ */
/* 5. Révélations statiques (hors sections à scrub)                    */
/* ------------------------------------------------------------------ */
function initStaticReveals() {
  const selectors = ['.section-head', '.step', '.workflow__note', '.prompt-card', '.faq__list details', '.site-footer__top'];
  const targets = [];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      if (el.closest('[data-scroll]')) return;
      if (!el.hasAttribute('data-enter')) el.setAttribute('data-enter', '0');
      el.style.transitionDelay = `${Math.min(i * 40, 240)}ms`;
      targets.push(el);
    });
  });
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  targets.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ */
/* 6. Prompts générés                                                  */
/* ------------------------------------------------------------------ */
function renderPrompts() {
  const grid = document.getElementById('prompts-grid');
  if (!grid) return;
  const entries = Object.entries(PROMPTS || {});
  if (!entries.length) {
    grid.innerHTML = '<p class="prompts__intro">Prompts non générés : lancez <code>node render/shot-list.mjs</code>.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  for (const [key, data] of entries) {
    const card = document.createElement('article');
    card.className = 'prompt-card';

    const header = document.createElement('header');
    const h = document.createElement('h4');
    h.textContent = `${String(key).padStart(2, '0')} · ${data.title}`;
    const ref = document.createElement('span');
    ref.className = 'prompt-card__ref';
    ref.textContent = `${data.duration.toFixed(0)} s · ${data.fps} i/s`;
    header.append(h, ref);

    const beats = document.createElement('ul');
    beats.className = 'prompt-card__beats';
    for (const b of data.beats || []) {
      const li = document.createElement('li');
      li.innerHTML = `<b>${b.t.toFixed(1)}s</b>${b.label}`;
      beats.append(li);
    }

    const pre = document.createElement('pre');
    pre.textContent = data.prompt;

    const summary = document.createElement('p');
    summary.className = 'prompt-card__ref';
    summary.textContent = data.reference || '';

    card.append(header, summary, beats, pre);
    frag.append(card);
  }
  grid.replaceChildren(frag);
}

/* ------------------------------------------------------------------ */
/* 7. Métriques du comparateur                                         */
/* ------------------------------------------------------------------ */
function fillMetrics() {
  const first = PROMPTS?.['1'];
  if (!first) return;
  const map = { frames: first.frames, poses: first.poses, offset: 0 };
  document.querySelectorAll('[data-metric]').forEach((el) => {
    const v = map[el.getAttribute('data-metric')];
    if (v != null) el.textContent = String(v);
  });
}

/* ------------------------------------------------------------------ */
/* 8. Accordéon FAQ (une seule réponse ouverte)                        */
/* ------------------------------------------------------------------ */
function initAccordion() {
  const list = document.querySelector('[data-accordion]');
  if (!list) return;
  const items = [...list.querySelectorAll('details')];
  items.forEach((d) => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      items.forEach((o) => {
        if (o !== d) o.open = false;
      });
    });
  });
}

/* ------------------------------------------------------------------ */
/* 9. Démarrage                                                        */
/* ------------------------------------------------------------------ */
async function boot() {
  const stage = (v) => { window.__poc_stage = v; };
  stage('lengths');
  applyScrollLengths();
  stage('chrome');
  initChrome();
  stage('reveal');
  initReveal();
  // Les prompts sont rendus AVANT l'observation des révélations : sinon les
  // cartes n'existeraient pas encore et resteraient hors du dispositif.
  stage('prompts');
  renderPrompts();
  stage('static');
  initStaticReveals();
  stage('metrics');
  fillMetrics();
  stage('accordion');
  initAccordion();

  stage('compare');
  const compareMedia = document.getElementById('compare-split');
  compare = initCompare(compareMedia);
  initCompareControls(document.getElementById('compare'), compare);

  stage('collect');
  const blocks = [...document.querySelectorAll('[data-scroll-video]')];
  const reduced = prefersReducedMotion();

  for (const block of blocks) {
    const seq = new ScrollVideo(block);
    seq.section.style.setProperty('--scroll-len', seq.section.getAttribute('data-scroll') || '3');
    sequences.push(seq);
    scrubber.add(seq);
    const timeline = new Timeline(seq.section, seq);
    seq.timeline = timeline;
    timelines.push(timeline);
    // Profil de fondu au blanc (concept 2 transmis par les métadonnées de prompt).
    const key = seq.section.getAttribute('data-concept');
    const profile = PROMPTS?.[key]?.whiteout;
    if (profile) seq.setWhiteoutProfile(profile[0], profile[1]);
  }

  stage('mode');
  applyMode('cinematic');

  // La timeline est branchée sur le temps réel de chaque séquence : c'est ce
  // qui fait apparaître les textes à l'instant exact du plan.
  scrubber.onFrame.push(() => {
    for (const seq of sequences) {
      if (seq.timeline) seq.timeline.update(seq.time);
    }
  });

  stage('load');
  // Chargement des métadonnées, en série pour ne pas saturer le décodeur.
  const results = [];
  for (const seq of sequences) {
    window.__poc_stage = 'load:' + seq.slug;
    results.push(await seq.load());
  }
  const usable = results.some(Boolean);

  // Les séquences dont l'asset manque gardent leur texte : rien ne doit
  // disparaître parce qu'une vidéo n'est pas encore rendue.
  sequences.forEach((seq, i) => {
    if (!results[i]) {
      timelines[i].bypass = true;
      timelines[i].revealAll();
    }
  });

  // La boucle est TOUJOURS lancée : elle pilote aussi la barre de progression,
  // l'en-tête et le déploiement de la section 05.
  scrubber.measureAll();
  scrubber.start();

  if (reduced || !usable) {
    document.body.classList.add('no-scrub');
    for (const seq of sequences) {
      seq.layers.forEach((v) => v.classList.add('is-visible'));
      // En mode poster, on affiche la première image.
      seq.layers.forEach((v) => {
        try {
          v.preload = 'metadata';
          v.currentTime = 0.05;
        } catch {
          /* noop */
        }
      });
      // Fond de secours : l'image d'affiche de la passe cinématique.
      const active = seq.cinematic || seq.layers[0];
      const poster = active?.getAttribute('poster');
      if (poster) {
          // URL absolue obligatoire : --poster-url est consommé par une règle CSS,
          // donc une valeur relative serait résolue depuis la feuille de style.
          const absolute = new URL(poster, document.baseURI).href;
          seq.root.style.setProperty('--poster-url', `url("${absolute}")`);
        }
      seq.root.setAttribute('data-mode', 'poster');
    }
    timelines.forEach((t) => {
      t.bypass = true;
      t.revealAll();
    });
    compare?.stop();
    window.__poc_scrub = false;
  } else {
    window.__poc_scrub = true;
  }

  // Le bloc comparateur doit garder ses deux calques visibles.
  compareMedia?.querySelectorAll('video.layer').forEach((v) => v.classList.add('is-visible'));

  // Chargement paresseux : on n'elargit le tampon d'une sequence que lorsqu'elle
  // entre dans la fenetre de prechargement. Le reste du site reste leger.
  initWarming(blocks);

  for (const seq of sequences) {
    if (seq.timeline) seq.timeline.update(seq.time);
  }

  stage('ready');
  window.__poc_ready = true;
  // `compare` est expose pour les tests et pour la generation des medias
  // (capture d'un balayage automatique de la poignee).
  window.__poc = { scrubber, sequences, timelines, compare, get mode() { return mode; } };
}

/* ------------------------------------------------------------------ */
/* 9 bis. Préchargement paresseux                                      */
/* ------------------------------------------------------------------ */
function initWarming(blocks) {
  const warm = (el) => {
    const seq = sequences.find((s) => s.root === el);
    seq?.warm();
  };
  if (!('IntersectionObserver' in window)) {
    blocks.forEach(warm);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        warm(e.target);
        io.unobserve(e.target);
      }
    },
    // Une marge généreuse : le tampon doit être prêt avant que le scrub commence.
    { rootMargin: '150% 0px 150% 0px' },
  );
  blocks.forEach((b) => io.observe(b));
}

/* ------------------------------------------------------------------ */
/* 10. Mode de rendu : boutons + état exposé pour les tests            */
/* ------------------------------------------------------------------ */
document.querySelectorAll('.mode-switch__btn').forEach((btn) => {
  btn.addEventListener('click', () => applyMode(btn.getAttribute('data-mode') || 'cinematic'));
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    scrubber.measureAll();
    for (const seq of sequences) seq.measure();
  }, 140);
});

window.addEventListener('load', () => {
  setTimeout(() => scrubber.measureAll(), 60);
});

boot().catch((err) => {
  console.error('[poc] démarrage impossible', err);
  document.body.classList.add('no-scrub');
  document.querySelectorAll('[data-enter]').forEach((el) => el.classList.add('is-in'));
  window.__poc_error = String(err && err.stack ? err.stack : err);
});
