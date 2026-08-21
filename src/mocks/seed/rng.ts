/** Deterministic PRNG (mulberry32) so every reload renders identical figures. */
export function createRng(seed: number) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    /** Random amount rounded to the nearest `step` rupiah. */
    amount(min: number, max: number, step = 50_000): number {
      const raw = next() * (max - min) + min;
      return Math.round(raw / step) * step;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)] as T;
    },
    weighted<T>(items: readonly { value: T; weight: number }[]): T {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let roll = next() * total;
      for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item.value;
      }
      return items[items.length - 1]!.value;
    },
    bool(probability = 0.5): boolean {
      return next() < probability;
    },
    shuffle<T>(items: T[]): T[] {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
      }
      return copy;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

export function padNumber(value: number, length: number): string {
  return String(value).padStart(length, '0');
}
