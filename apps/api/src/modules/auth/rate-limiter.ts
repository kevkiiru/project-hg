// Sliding-window in-memory limiter (per API instance). Production uses Redis
// (shared across instances) behind the same interface.
interface Hit {
  count: number;
  resetAt: number;
}
export class RateLimiter {
  private windows = new Map<string, Hit>();

  check(key: string, max: number, windowMs: number): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    const hit = this.windows.get(key);
    if (!hit || hit.resetAt < now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (hit.count >= max) return { allowed: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
    hit.count += 1;
    return { allowed: true, retryAfter: 0 };
  }

  // Fixed-bucket simple counter used by services (no rejection).
  countRecent(timestamps: Date[], windowMs: number, now = new Date()): number {
    const threshold = now.getTime() - windowMs;
    return timestamps.filter((t) => new Date(t).getTime() > threshold).length;
  }
}
