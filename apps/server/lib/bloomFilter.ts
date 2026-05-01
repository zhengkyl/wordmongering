// ~330KB bit array tuned for 275k words at ~1% false positive rate
const BITS = 2_640_000;
const K = 7;

export class BloomFilter {
  private bits: Uint8Array;

  constructor() {
    this.bits = new Uint8Array(Math.ceil(BITS / 8));
  }

  private hash(str: string, seed: number): number {
    let h = 2166136261 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h) % BITS;
  }

  add(str: string): void {
    for (let i = 0; i < K; i++) {
      const pos = this.hash(str, i * 1000003);
      this.bits[pos >>> 3] |= 1 << (pos & 7);
    }
  }

  has(str: string): boolean {
    for (let i = 0; i < K; i++) {
      const pos = this.hash(str, i * 1000003);
      if (!(this.bits[pos >>> 3] & (1 << (pos & 7)))) return false;
    }
    return true;
  }
}
