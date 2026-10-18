import concept1 from './concept-1.js';
import concept2 from './concept-2.js';
import concept3 from './concept-3.js';
import concept4 from './concept-4.js';
import concept5 from './concept-5.js';

/** Registre des scenes. Les cles servent d'identifiant dans l'URL du harness. */
export const SCENES = {
  '1': concept1,
  '2': concept2,
  '3': concept3,
  '4': concept4,
  '5': concept5,
};

export function listScenes() {
  return Object.values(SCENES);
}

export const SCENE_ORDER = ['1', '2', '3', '4', '5'];
