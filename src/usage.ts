export type Window = { used: number; duration: number; resetAt: number }
export type Snapshot = { fiveHour: Window | null; weekly: Window | null; fetchedAt: number }

const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function parseUsage(value: unknown, now = Date.now()): Snapshot {
  const limits = object(object(value)?.rate_limit)
  if (!limits) throw new Error("Invalid usage response")
  const snapshot: Snapshot = { fiveHour: null, weekly: null, fetchedAt: now }
  for (const raw of [limits.primary_window, limits.secondary_window]) {
    const entry = object(raw)
    if (!entry || !number(entry.limit_window_seconds) || !number(entry.used_percent)) continue
    const duration = entry.limit_window_seconds
    const key = duration === 18000 ? "fiveHour" : duration === 604800 ? "weekly" : null
    if (!key || entry.used_percent < 0 || entry.used_percent > 100) continue
    const resetAt = number(entry.reset_at) && entry.reset_at > 0
      ? entry.reset_at * 1000
      : number(entry.reset_after_seconds) && entry.reset_after_seconds >= 0
        ? now + entry.reset_after_seconds * 1000 : null
    if (resetAt === null || !Number.isFinite(resetAt)) continue
    snapshot[key] = { used: entry.used_percent, duration, resetAt }
  }
  return snapshot
}

export function goal(window: Window, now: number): number {
  return clamp(100 * (1 - (window.resetAt - now) / (window.duration * 1000)), 0, 100)
}

export function remaining(resetAt: number, now: number): string {
  const minutes = Math.max(0, Math.ceil((resetAt - now) / 60000))
  if (minutes === 0) return "reset due"
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${mins}m` : `${mins}m`
}

export function bar(used: number, width = 10): string {
  const filled = Math.round(clamp(used, 0, 100) / 100 * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

// Project exhaustion using the average rate since the start of this window.
// A reset makes projections beyond the current window meaningless.
export function timeToSpent(window: Window, now: number): string {
  if (window.used >= 100) return "spent"
  const elapsed = window.duration * 1000 - (window.resetAt - now)
  if (window.used <= 0 || elapsed <= 0 || now >= window.resetAt) return "—"
  const untilSpent = elapsed * (100 - window.used) / window.used
  if (!Number.isFinite(untilSpent) || untilSpent >= window.resetAt - now) return ">reset"
  return remaining(now + untilSpent, now)
}

// Green at the linear goal, interpolating toward blue (slow) or red (fast).
export function paceColor(window: Window, now: number): string {
  const difference = window.used - goal(window, now)
  const amount = Math.min(1, Math.abs(difference) / 50)
  const from = [77, 190, 120]
  const to = difference > 0 ? [240, 80, 80] : [80, 140, 240]
  return `#${from.map((value, i) => Math.round(value + (to[i] - value) * amount).toString(16).padStart(2, "0")).join("")}`
}

export function paceCritical(window: Window, now: number): boolean {
  const elapsed = window.duration * 1000 - (window.resetAt - now)
  return window.used > 0 && elapsed > 0 && now < window.resetAt &&
    elapsed * 100 / window.used < window.duration * 1000 * 0.9
}

export function accountId(access: string, metadata?: Record<string, unknown>): string | undefined {
  for (const key of ["accountId", "accountID", "account_id"]) {
    if (typeof metadata?.[key] === "string" && metadata[key]) return metadata[key] as string
  }
  try {
    const claims = JSON.parse(Buffer.from(access.split(".")[1], "base64url").toString())
    const id = claims?.["https://api.openai.com/auth"]?.chatgpt_account_id
    return typeof id === "string" && id ? id : undefined
  } catch { return undefined }
}
