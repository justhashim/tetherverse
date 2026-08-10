// Minimal deterministic PRNG (mulberry32) so procedural generation is
// reproducible: the same seed always produces the same level.

export type Rng = () => number;

/**
 * Create a deterministic pseudo-random number generator from a numeric seed.
 * Returns a function that produces values in [0, 1).
 */
export function createSeededRng(seed: number): Rng {
    let state = seed >>> 0;

    return function rng(): number {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Derive a stable numeric seed (0..2^32) from a string key. */
export function seedFromString(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (Math.imul(hash, 31) + key.charCodeAt(i)) >>> 0;
    }
    return hash;
}