// ============================================
// WANDR — In-Memory Rate Limiter
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp when the window resets
}

interface UserLimits {
  hourly: RateLimitEntry;
  daily: RateLimitEntry;
}

const store = new Map<string, UserLimits>();

// Auto-cleanup every 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.hourly.resetAt < now && entry.daily.resetAt < now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export interface RateLimitConfig {
  maxHourly: number;
  maxDaily: number;
}

// Limit configs per endpoint type
export const LIMITS = {
  CHAT: { maxHourly: 20, maxDaily: 50 } as RateLimitConfig,
  TRIP_GEN: { maxHourly: 5, maxDaily: 10 } as RateLimitConfig,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: {
    hourly: number;
    daily: number;
  };
  resetIn: number; // seconds until the earliest window resets
  retryAfter?: number; // seconds to wait if blocked
}

/**
 * Check rate limit for a user+endpoint combination.
 * Returns { allowed: false } if limit is exceeded.
 */
export function checkRateLimit(
  userId: string,
  endpoint: "CHAT" | "TRIP_GEN",
  config?: RateLimitConfig
): RateLimitResult {
  const limits = config || LIMITS[endpoint];
  const now = Date.now();
  const key = `${endpoint}:${userId}`;

  let entry = store.get(key);

  if (!entry) {
    entry = {
      hourly: { count: 1, resetAt: now + 60 * 60 * 1000 },
      daily: { count: 1, resetAt: now + 24 * 60 * 60 * 1000 },
    };
    store.set(key, entry);

    return {
      allowed: true,
      remaining: {
        hourly: limits.maxHourly - 1,
        daily: limits.maxDaily - 1,
      },
      resetIn: Math.floor(60 * 60), // 1 hour
    };
  }

  // Reset hourly window if expired
  if (now >= entry.hourly.resetAt) {
    entry.hourly = { count: 1, resetAt: now + 60 * 60 * 1000 };
  } else {
    entry.hourly.count++;
  }

  // Reset daily window if expired
  if (now >= entry.daily.resetAt) {
    entry.daily = { count: 1, resetAt: now + 24 * 60 * 60 * 1000 };
  } else {
    entry.daily.count++;
  }

  store.set(key, entry);

  const hourlyRemaining = Math.max(0, limits.maxHourly - entry.hourly.count);
  const dailyRemaining = Math.max(0, limits.maxDaily - entry.daily.count);
  const earliestReset = Math.min(entry.hourly.resetAt, entry.daily.resetAt);
  const resetIn = Math.max(0, Math.floor((earliestReset - now) / 1000));

  // Blocked if EITHER limit is exceeded
  const blocked = entry.hourly.count > limits.maxHourly || entry.daily.count > limits.maxDaily;

  if (blocked) {
    return {
      allowed: false,
      remaining: { hourly: 0, daily: 0 },
      resetIn,
      retryAfter: resetIn,
    };
  }

  return {
    allowed: true,
    remaining: {
      hourly: hourlyRemaining,
      daily: dailyRemaining,
    },
    resetIn,
  };
}
