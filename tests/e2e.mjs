#!/usr/bin/env node
/**
 * Vérifications de bout en bout, dans un vrai navigateur.
 *
 *   node tests/e2e.mjs [--headed] [--keep]
 *
 * Ce que l'on vérifie (rien n'est déclaratif : tout est mesuré) :
 *  1. build valide + chargement sans erreur console ni requête échouée ;
 *  2. le scroll écrit bien le temps des vidéos (et de façon monotone) ;
 *  3. le scrub fonctionne dans les deux sens (on remonte, le temps recule) ;
 *  4. le sélecteur final / prévisualisation ne change PAS le temps courant ;
 *  5. les contenus ancrés au temps apparaissent aux instants attendus ;
 *  6. le fondu au blanc du concept 2 atteint bien 1 en fin de séquence ;
 *  7. la section de déploiement passe bien de cadre à plein écran ;
 *  8. les balayages du concept 4 placent bien les blocs feature de part et d'autre ;
 *  9. le comparateur se déplace au clavier et à la souris ;
 * 10. aucune requête réseau hors de l'origine locale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../tools/serve.mjs';
import { build } from '../tools/build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME =
  process.env.POC_CHROME ||
  '/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const argv = process.argv.slice(2);
const headed = argv.includes('--headed');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  const mark = ok ? '  ok  ' : ' FAIL ';
  console.log(`[${mark}] ${name}${detail ? ' — ' + detail : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Scroll déterministe : on désactive `scroll-behavior: smooth` le temps du test,
 * puis on attend que la position soit réellement stabilisée. Sans cela, un
 * défilement animé sur plusieurs milliers de pixels fausse toutes les mesures.
 */
async function scrollTo(page, y, settle = 240) {
  await page.evaluate((target) => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top: target, behavior: 'instant' });
  }, y);
  const started = Date.now();
  let last = -1;
  while (Date.now() - started < 4000) {
    const cur = await page.evaluate(() => Math.round(window.scrollY));
    if (cur === last && Math.abs(cur - y) <= 2) break;
    last = cur;
    await sleep(60);
  }
  await sleep(settle);
}

async function main() {
  console.log('[e2e] build…');
  await build({ minify: true });

  const { server, url } = await startServer({ port: 0, root: ROOT });
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: !headed,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];
  const failedRequests = [];

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText || '';
    // Un média progressif interrompt normalement ses requêtes Range une fois
    // assez de données reçues : ERR_ABORTED sur un .mp4 n'est pas une panne.
    if (/ERR_ABORTED/.test(err) && /\.(mp4|webm)(\?|$)/.test(r.url())) return;
    failedRequests.push(`${r.url()} :: ${err}`);
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) externalRequests.push(r.url());
  });

  try {
    await page.goto(`${url}/dist/index.html`, { waitUntil: 'load' });
    await page.waitForFunction('window.__poc_ready === true', null, { timeout: 60000 });
    await sleep(900);

    const scrubActive = await page.evaluate(() => window.__poc_scrub === true);
    check('le moteur de scrub est actif', scrubActive);

    if (!scrubActive) {
      const err = await page.evaluate(() => window.__poc_error || '');
      check('aucune erreur de démarrage', !err, err.slice(0, 200));
    }

    // --- 1 bis. le héros est lisible dès le premier pixel ------------------
    await scrollTo(page, 0, 300);
    const heroFirstPaint = await page.evaluate(() => {
      const h1 = document.getElementById('t1');
      const cs = getComputedStyle(h1);
      const r = h1.getBoundingClientRect();
      return { opacity: Number(cs.opacity), visible: r.width > 100 && r.height > 20 && r.top < window.innerHeight };
    });
    check(
      'le titre du héros est visible sans avoir à scroller',
      heroFirstPaint.opacity > 0.9 && heroFirstPaint.visible,
      `opacité ${heroFirstPaint.opacity}`,
    );

    // --- 2/3. scrub dans les deux sens ------------------------------------
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.round((docHeight - 900) / 24);
    const samples = [];
    for (let i = 0; i <= 24; i++) {
      await scrollTo(page, i * step, 260);
      const t = await page.evaluate(() => {
        const seq = window.__poc.sequences[0];
        const v = seq.cinematic;
        return { time: v.currentTime, progress: seq.progress, currentTime: v.currentTime };
      });
      samples.push(t);
    }
    const forward = samples.map((s) => s.time);
    const monotone = forward.every((v, i) => i === 0 || v >= forward[i - 1] - 0.05);
    const climbed = forward[forward.length - 1] - forward[0];
    check('le scroll écrit le temps de la vidéo', climbed > 4, `amplitude ${climbed.toFixed(2)} s sur la séquence 1`);
    check('le temps est monotone en descendant', monotone, `min/max ${Math.min(...forward).toFixed(2)} / ${Math.max(...forward).toFixed(2)}`);

    // Retour arrière : on remonte DANS la plage de la séquence 1.
    const heroSpan = await page.evaluate(() => {
      const s = window.__poc.sequences[0];
      return { start: s.start, span: s.span, maxTime: s.maxTime };
    });
    await scrollTo(page, Math.round(heroSpan.start + heroSpan.span * 0.92), 420);
    const atLate = await page.evaluate(() => window.__poc.sequences[0].cinematic.currentTime);
    await scrollTo(page, Math.round(heroSpan.start + heroSpan.span * 0.18), 520);
    const atEarly = await page.evaluate(() => window.__poc.sequences[0].cinematic.currentTime);
    check(
      'le scrub fonctionne en remontant',
      atEarly < atLate - 3,
      `${atLate.toFixed(2)} s → ${atEarly.toFixed(2)} s`,
    );

    // --- 4. bascule de mode ----------------------------------------------
    await scrollTo(page, Math.round(heroSpan.start + heroSpan.span * 0.4), 480);
    const before = await page.evaluate(() => {
      const s = window.__poc.sequences[0];
      return { cinematic: s.cinematic.currentTime, blocking: s.blocking.currentTime };
    });
    await page.click('.mode-switch__btn[data-mode="blocking"]');
    await sleep(900);
    const after = await page.evaluate(() => {
      const s = window.__poc.sequences[0];
      return {
        cinematic: s.cinematic.currentTime,
        blocking: s.blocking.currentTime,
        mode: window.__poc.mode,
        visible: [...s.root.querySelectorAll('video.layer')].map((v) => v.classList.contains('is-visible')),
      };
    });
    check('la bascule change le mode exposé', after.mode === 'blocking');
    check(
      'le calque blocking devient visible et l’autre non',
      after.visible[1] === true && after.visible[0] === false,
      JSON.stringify(after.visible),
    );
    check(
      'les deux passes restent synchronisées (±1 image)',
      Math.abs(after.blocking - after.cinematic) < 1 / 30 + 0.05,
      `blocking ${after.blocking.toFixed(3)} vs cinematic ${after.cinematic.toFixed(3)}`,
    );
    await page.click('.mode-switch__btn[data-mode="cinematic"]');
    await sleep(400);

    // --- 5. contenus ancrés au temps -------------------------------------
    const beatCheck = await page.evaluate(async () => {
      const section = document.getElementById('concept-1');
      const seq = window.__poc.sequences.find((s) => s.section === section);
      const timed = [...section.querySelectorAll('[data-enter]')];
      const stateAt = async (seconds) => {
        // On force un rendu à l'instant voulu sans dépendre de la position de scroll.
        seq.update(seq.start + (seconds / seq.maxTime) * seq.span, window.innerHeight, true);
        const tl = window.__poc.timelines.find((t) => t.root === section);
        tl.update(seconds);
        return timed.map((el) => el.classList.contains('is-in'));
      };
      const early = await stateAt(0.5);
      const mid = await stateAt(3.5);
      const late = await stateAt(9.2);
      return { early, mid, late, count: timed.length };
    });
    check(
      'les textes du héros sont visibles au début',
      beatCheck.early.slice(0, 3).every(Boolean),
      JSON.stringify(beatCheck.early),
    );
    check(
      'le repère « Le hublot » apparaît à 3,5 s',
      beatCheck.mid[3] === true,
      JSON.stringify(beatCheck.mid),
    );
    check(
      'le repère final apparaît en fin de plan',
      beatCheck.late[beatCheck.late.length - 1] === true,
      JSON.stringify(beatCheck.late),
    );

    // --- 6. fondu au blanc du concept 2 ----------------------------------
    const whiteout = await page.evaluate(() => {
      const section = document.getElementById('concept-2');
      const seq = window.__poc.sequences.find((s) => s.section === section);
      const el = section.querySelector('.stage__whiteout');
      const profile = seq.whiteoutProfile || [8, 9.6];
      const atTime = (seconds) => {
        seq.update(seq.start + (seconds / seq.maxTime) * seq.span, window.innerHeight, true);
        return parseFloat(el.style.opacity || '0');
      };
      const before = atTime(profile[0] - 0.6);
      const mid = atTime((profile[0] + profile[1]) / 2);
      const end = atTime(seq.maxTime);
      return { before, mid, end, profile };
    });
    check(
      'le fondu au blanc apparaît après les repères',
      whiteout.before < 0.12,
      `avant la plage (${whiteout.profile.join(' / ')} s) : ${whiteout.before.toFixed(2)}`,
    );
    check('le fondu au blanc monte progressivement', whiteout.mid > 0.25 && whiteout.mid < 0.85, `opacité mi-parcours ${whiteout.mid.toFixed(2)}`);
    check('le fondu au blanc atteint 1 en fin de séquence', whiteout.end > 0.98, `opacité finale ${whiteout.end.toFixed(2)}`);

    // --- 7. déploiement plein écran --------------------------------------
    const reveal = await page.evaluate(async () => {
      const section = document.getElementById('survol');
      const frame = document.querySelector('[data-reveal]');
      const force = (p) => {
        window.scrollTo({ top: section.offsetTop + p * (section.offsetHeight - window.innerHeight), behavior: 'instant' });
      };
      force(0);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const small = parseFloat(getComputedStyle(frame).getPropertyValue('--reveal') || '0');
      force(1);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const full = parseFloat(getComputedStyle(frame).getPropertyValue('--reveal') || '0');
      return { small, full };
    });
    check('le cadre se déploie au scroll', reveal.small < 0.2 && reveal.full > 0.9, `${reveal.small.toFixed(2)} → ${reveal.full.toFixed(2)}`);

    // --- 8. features gauche / droite du concept 4 ------------------------
    const sides = await page.evaluate(() => {
      const section = document.getElementById('gardien');
      const left = section.querySelector('.feature--left');
      const right = section.querySelector('.feature--right');
      const media = section.querySelector('.stage__media');
      const mr = media.getBoundingClientRect();
      const lr = left.getBoundingClientRect();
      const rr = right.getBoundingClientRect();
      return {
        leftIsLeft: lr.left + lr.width / 2 < mr.left + mr.width / 2,
        rightIsRight: rr.left + rr.width / 2 > mr.left + mr.width / 2,
      };
    });
    check('le bloc « gauche » est bien à gauche', sides.leftIsLeft);
    check('le bloc « droite » est bien à droite', sides.rightIsRight);

    // --- 9. comparateur ---------------------------------------------------
    const compareBox = await page.evaluate(() => {
      const media = document.getElementById('compare-split');
      const r = media.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await scrollTo(page, compareBox.y + (await page.evaluate(() => window.scrollY)) - 0, 300);
    await page.evaluate(() => {
      const r = document.getElementById('compare-split').getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.5, behavior: 'instant' });
    });
    await sleep(400);
    const box = await page.evaluate(() => {
      const r = document.getElementById('compare-split').getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.move(box.x + box.w * 0.5, box.y + box.h * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w * 0.22, box.y + box.h * 0.5, { steps: 8 });
    await page.mouse.up();
    await sleep(200);
    const splitAfterDrag = await page.evaluate(() => {
      const m = document.getElementById('compare-split');
      return parseFloat(m.style.getPropertyValue('--split') || '0.5');
    });
    check('la poignée du comparateur se déplace à la souris', Math.abs(splitAfterDrag - 0.22) < 0.09, `split = ${splitAfterDrag.toFixed(2)}`);

    await page.focus('#compare-split');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const splitAfterKeys = await page.evaluate(() => parseFloat(document.getElementById('compare-split').style.getPropertyValue('--split')));
    check('le comparateur répond au clavier', splitAfterKeys > splitAfterDrag + 0.01, `split = ${splitAfterKeys.toFixed(2)}`);

    // --- captures --------------------------------------------------------
    const shotDir = path.join(ROOT, 'render', 'out', 'site');
    fs.rmSync(shotDir, { recursive: true, force: true });
    fs.mkdirSync(shotDir, { recursive: true });
    // Captures ancrées sur les sections (et non sur des fractions du document) :
    // chaque image correspond à un instant identifiable du plan.
    const shots = [
      ['01-hero', 'concept-1', 0.04],
      ['02-hublot', 'concept-1', 0.24],
      ['03-passage', 'concept-1', 0.5],
      ['04-monument', 'concept-1', 0.96],
      ['05-compare-50-50', 'compare', 0.5],
      ['06-fenetre', 'concept-2', 0.3],
      ['07-blanc', 'concept-2', 0.99],
      ['08-relique', 'relique', 0.82],
      ['09-gardien-face', 'gardien', 0.12],
      ['10-gardien-droite', 'gardien', 0.72],
      ['11-gardien-gauche', 'gardien', 0.99],
      ['12-deploiement', 'survol', 1],
    ];
    let maxScroll = 0;
    for (const [name, id, pr] of shots) {
      const target = await page.evaluate(
        ([sectionId, progress]) => {
          const el = document.getElementById(sectionId);
          if (!el) return null;
          const start = el.offsetTop;
          const span = Math.max(1, el.offsetHeight - window.innerHeight);
          return Math.round(start + progress * span);
        },
        [id, pr],
      );
      if (target == null) continue;
      await scrollTo(page, target, 460);
      await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
      maxScroll = Math.max(maxScroll, target);
    }
    await scrollTo(page, 0, 100);
    const tailTarget = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await scrollTo(page, tailTarget, 500);
    await page.screenshot({ path: path.join(shotDir, '13-workflow-footer.png') });
    check('captures d’écran produites', fs.readdirSync(shotDir).length >= shots.length, `${fs.readdirSync(shotDir).length} fichiers`);

    // --- 9 bis. préconditions média ---------------------------------------
    const media = await page.evaluate(() => {
      const seqs = window.__poc.sequences;
      return seqs.map((s) => ({
        slug: s.slug,
        cinematic: { src: s.cinematic?.getAttribute('src'), duration: s.cinematic?.duration },
        blocking: { src: s.blocking?.getAttribute('src'), duration: s.blocking?.duration },
      }));
    });
    check(
      'les deux passes sont résolues pour chaque séquence',
      media.length >= 6 && media.every((m) => m.cinematic.src && m.blocking.src),
      `${media.length} conteneurs`,
    );
    const distinct = media.filter((m, i) => media.findIndex((o) => o.slug === m.slug) === i);
    const durationsOk = distinct.every(
      (m) => Number.isFinite(m.cinematic.duration) && Math.abs(m.cinematic.duration - m.blocking.duration) < 0.05,
    );
    check(
      'blocking et cinématique ont la même durée (même nombre d’images)',
      durationsOk,
      distinct.map((m) => `${m.slug} ${m.cinematic.duration?.toFixed(2)}/${m.blocking.duration?.toFixed(2)}`).join(' · '),
    );

    const allVideos = await page.evaluate(async (base) => {
      const slugs = [...new Set(window.__poc.sequences.map((s) => s.slug))];
      const urls = slugs.flatMap((slug) => [`${base}/dist/assets/video/${slug}-blocking.mp4`, `${base}/dist/assets/video/${slug}-cinematic.mp4`]);
      const out = [];
      for (const u of urls) {
        const r = await fetch(u, { method: 'HEAD' });
        out.push([u.replace(base, ''), r.status]);
      }
      return out;
    }, url);
    const badVideos = allVideos.filter(([, st]) => st !== 200);
    check('les 10 fichiers vidéo sont servis', badVideos.length === 0, badVideos.map((v) => v.join(' ')).join(' | ') || `${allVideos.length} fichiers`);

    // --- 9 ter. comparateur : balayage automatique ------------------------
    await page.evaluate(() => document.getElementById('compare-animate').click());
    const sweep = await page.evaluate(async () => {
      const read = () => parseFloat(document.getElementById('compare-split').style.getPropertyValue('--split'));
      const a = read();
      await new Promise((r) => setTimeout(r, 700));
      const b = read();
      return { a, b };
    });
    check('le balayage automatique du comparateur anime la séparation', Math.abs(sweep.b - sweep.a) > 0.02, `${sweep.a.toFixed(2)} → ${sweep.b.toFixed(2)}`);

    // --- 10. réseau -------------------------------------------------------
    check('aucune requête externe', externalRequests.length === 0, externalRequests.slice(0, 3).join(', '));
    check('aucune requête échouée', failedRequests.length === 0, failedRequests.slice(0, 3).join(' | '));
    check('aucune erreur console', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    check('aucune exception de page', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

    // --- ouverture directe du fichier (file://) ---------------------------
    const fileContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
    const filePage = await fileContext.newPage();
    const fileErrors = [];
    filePage.on('pageerror', (e) => fileErrors.push(e.message));
    await filePage.goto('file://' + path.join(ROOT, 'dist', 'index.html'), { waitUntil: 'load' });
    const fileReady = await filePage
      .waitForFunction('window.__poc_ready === true', null, { timeout: 45000 })
      .then(() => true)
      .catch(() => false);
    check('le site s’ouvre aussi en file:// (aucun serveur requis)', fileReady, fileErrors.slice(0, 2).join(' | '));
    if (fileReady) {
      const fileState = await filePage.evaluate(() => ({
        scrub: window.__poc_scrub === true,
        ready: window.__poc.sequences.filter((s) => s.ready).length,
      }));
      check('en file://, les vidéos se chargent quand même', fileState.ready > 0, `${fileState.ready} séquences prêtes`);
    }
    await fileContext.close();

    // --- repli « mouvement réduit » --------------------------------------
    const rmContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const rmPage = await rmContext.newPage();
    const rmErrors = [];
    rmPage.on('pageerror', (e) => rmErrors.push(e.message));
    await rmPage.goto(`${url}/dist/index.html`, { waitUntil: 'load' });
    await rmPage.waitForFunction('window.__poc_ready === true', null, { timeout: 60000 });
    await sleep(700);
    const rm = await rmPage.evaluate(() => ({
      noScrub: document.body.classList.contains('no-scrub'),
      hidden: [...document.querySelectorAll('[data-enter]')].filter((el) => getComputedStyle(el).opacity === '0').length,
      total: document.querySelectorAll('[data-enter]').length,
      posterSet: [...document.querySelectorAll('[data-scroll-video]')].filter((el) => el.style.getPropertyValue('--poster-url')).length,
    }));
    check('mouvement réduit : le site bascule en mode poster', rm.noScrub === true);
    check(
      'mouvement réduit : aucun contenu ne reste masqué',
      rm.hidden === 0,
      `${rm.hidden}/${rm.total} éléments masqués`,
    );
    check('mouvement réduit : un visuel de repli est fourni', rm.posterSet > 0, `${rm.posterSet} conteneurs`);
    check('mouvement réduit : aucune exception', rmErrors.length === 0, rmErrors.slice(0, 2).join(' | '));

    // Les textes ancrés au temps doivent redevenir un flux vertical, jamais des
    // calques superposés.
    const overlaps = await rmPage.evaluate(() => {
      const boxes = [...document.querySelectorAll('.beat, .feature')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((b) => b.r.width > 0 && b.r.height > 0);
      let hits = 0;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r;
          const b = boxes[j].r;
          const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ix > 4 && iy > 4) hits++;
        }
      }
      return { hits, count: boxes.length };
    });
    check(
      'mouvement réduit : aucun texte superposé',
      overlaps.hits === 0,
      `${overlaps.count} blocs, ${overlaps.hits} chevauchement(s)`,
    );
    await rmPage.screenshot({ path: path.join(shotDir, '14-mouvement-reduit.png') });
    await rmContext.close();

    // --- mobile -----------------------------------------------------------
    const mobile = await context.newPage();
    await mobile.setViewportSize({ width: 390, height: 844 });
    const mobileErrors = [];
    mobile.on('pageerror', (e) => mobileErrors.push(e.message));
    await mobile.goto(`${url}/dist/index.html`, { waitUntil: 'load' });
    await mobile.waitForFunction('window.__poc_ready === true', null, { timeout: 60000 });
    await sleep(700);
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('pas de débordement horizontal sur mobile', overflow <= 2, `${overflow} px`);
    await mobile.screenshot({ path: path.join(shotDir, '10-mobile.png') });
    check('aucune exception sur mobile', mobileErrors.length === 0, mobileErrors.slice(0, 2).join(' | '));
    await mobile.close();
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('');
  console.log(`[e2e] ${results.length - failed.length}/${results.length} vérifications passées`);
  if (failed.length) {
    console.log('[e2e] échecs :');
    for (const f of failed) console.log('   -', f.name, f.detail ? `(${f.detail})` : '');
    process.exitCode = 1;
  }
  return failed.length === 0;
}

await main();
