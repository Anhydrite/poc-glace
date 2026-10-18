/**
 * Timeline : ancre les contenus de la page au TEMPS de la vidéo.
 *
 * Chaque élément porte data-enter (seconde d'entrée) et éventuellement
 * data-exit (seconde de sortie). Le moteur compare le temps courant de la
 * séquence aux bornes et applique .is-in / .is-out.
 *
 * C'est ce qui permet d'écrire « ce bloc apparaît à la seconde 9, quand la
 * caméra a fini son balayage » : la mise en page et le montage sont décidés
 * avant la génération de la vidéo, pas après.
 */
export function collectTimedElements(scope) {
  return [...scope.querySelectorAll('[data-enter]')].map((el) => ({
    el,
    enter: Number(el.getAttribute('data-enter') || 0),
    exit: el.hasAttribute('data-exit') ? Number(el.getAttribute('data-exit')) : null,
    wasIn: false,
    wasOut: false,
  }));
}

export class Timeline {
  constructor(root, scrollVideo) {
    this.root = root;
    this.scrollVideo = scrollVideo;
    this.items = collectTimedElements(root);
    this.bypass = false;
  }

  /** Affiche tout (mode sans scrub, mouvement réduit, échec de chargement). */
  revealAll() {
    for (const it of this.items) {
      it.el.classList.add('is-in');
      it.el.classList.remove('is-out');
    }
  }

  update(time) {
    if (this.bypass) return;
    for (const it of this.items) {
      const isIn = time >= it.enter;
      if (isIn !== it.wasIn) {
        it.el.classList.toggle('is-in', isIn);
        it.wasIn = isIn;
      }
      const isOut = it.exit != null && time > it.exit;
      if (isOut !== it.wasOut) {
        it.el.classList.toggle('is-out', isOut);
        it.wasOut = isOut;
      }
    }
  }
}
