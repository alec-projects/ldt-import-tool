type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfter?: number;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_ENTRIES = 5000;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function getRateLimitConfig(
  envPrefix: string,
  defaults: RateLimitConfig,
): RateLimitConfig {
  return {
    windowMs: parsePositiveInt(
      process.env[`${envPrefix}_WINDOW_MS`],
      defaults.windowMs,
    ),
    max: parsePositiveInt(process.env[`${envPrefix}_MAX`], defaults.max),
  };
}

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  if (rateLimitStore.size > MAX_ENTRIES) {
    for (const [entryKey, entry] of rateLimitStore) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(entryKey);
      }
      if (rateLimitStore.size <= MAX_ENTRIES) {
        break;
      }
    }
  }

  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { ok: true };
  }

  if (entry.count >= config.max) {
    return {
      ok: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return { ok: true };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    return first?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const flyClientIp = request.headers.get("fly-client-ip");
  if (flyClientIp) {
    return flyClientIp;
  }

  return "unknown";
}
