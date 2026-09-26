/**
 * Seeded PRNG (mulberry32).
 *
 * Why not Math.random()?
 *   Math.random() is different on every run and shared globally. For a fair
 *   human-vs-fly match we need BOTH sides to see the EXACT same traffic.
 *   A seeded generator lets us clone a world: same seed => identical cars.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
