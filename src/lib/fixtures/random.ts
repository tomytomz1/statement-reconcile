/**
 * Seeded pseudo-random generator for fixtures.
 *
 * Fixtures must be reproducible: a failing property test has to be replayable from its
 * seed, and CI must not flake because a random layout happened to be unparseable.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === "number" ? seed >>> 0 : hashString(seed);
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Two-decimal amount in [min, max]. */
  amount(min: number, max: number): number {
    return Math.round((min + this.next() * (max - min)) * 100) / 100;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("cannot pick from an empty list");
    return items[this.int(0, items.length - 1)] as T;
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = this.int(0, index);
      const a = copy[index] as T;
      const b = copy[swap] as T;
      copy[index] = b;
      copy[swap] = a;
    }
    return copy;
  }
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
