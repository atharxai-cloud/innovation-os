const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

type Bucket = { count: number; resetsAt: number };

const buckets = new Map<string, Bucket>();

export function consumeIdeaXRayQuota(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}
