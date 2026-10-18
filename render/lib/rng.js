/**
 * PRNG deterministe (mulberry32).
 *
 * Toute la generation procedurale des scenes doit passer par ce PRNG afin que
 * chaque frame rendue soit strictement identique d'un run a l'autre : c'est la
 * condition pour que la sequence PNG -> MP4 soit reproductible (principe meme
 * du "blocking" de la video : une prise de vue deterministe, rejouable).
 */
export function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const r = mulberry32(seed);
  /** RNG appelable (rng()) ET objet a methodes (rng.next(), rng.disc()...) :
   *  evite les incoherences entre les helpers de geometrie. */
  const fn = () => r();
  fn.next = r;
  fn.range = (min, max) => min + (max - min) * r();
  fn.int = (min, max) => Math.floor(min + (max - min + 1) * r());
  fn.pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  fn.sign = () => (r() < 0.5 ? -1 : 1);
  fn.disc = (radius = 1) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radius;
    return [Math.cos(a) * d, Math.sin(a) * d];
  };
  fn.seed = seed;
  return fn;
}

/** Hash stable chaine -> entier 32 bits (pour deriver un seed d'un nom). */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
