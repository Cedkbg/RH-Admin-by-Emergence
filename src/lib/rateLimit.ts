interface AttemptRecord {
  count: number;
  firstAttempt: number;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; lockoutSeconds?: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Reset window expired
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Lockout check
  if (record.count >= MAX_ATTEMPTS) {
    const lockoutRemaining = Math.ceil((LOCKOUT_MS - (now - record.firstAttempt)) / 1000);
    return { allowed: false, remaining: 0, lockoutSeconds: Math.max(0, lockoutRemaining) };
  }

  record.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}

