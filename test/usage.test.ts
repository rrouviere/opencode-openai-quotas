import { describe, expect, test } from "bun:test"
import { accountId, bar, goal, paceColor, paceCritical, parseUsage, remaining, timeToSpent } from "../src/usage"

describe("usage", () => {
  test("classifies windows by duration rather than position", () => {
    const now = 1_000_000
    const result = parseUsage({ rate_limit: {
      primary_window: { used_percent: 32, limit_window_seconds: 604800, reset_after_seconds: 3600 },
      secondary_window: { used_percent: 75, limit_window_seconds: 18000, reset_at: 10000 }
    } }, now)
    expect(result.weekly?.used).toBe(32)
    expect(result.weekly?.resetAt).toBe(now + 3_600_000)
    expect(result.fiveHour?.used).toBe(75)
    expect(result.fiveHour?.resetAt).toBe(10_000_000)
  })
  test("handles missing and invalid windows without inventing values", () => {
    const result = parseUsage({ rate_limit: { primary_window: { used_percent: 101, limit_window_seconds: 18000, reset_at: 1 }, secondary_window: null } })
    expect(result.fiveHour).toBeNull()
    expect(result.weekly).toBeNull()
    expect(() => parseUsage({})).toThrow()
  })
  test("computes clamped linear pacing and countdown", () => {
    const window = { used: 20, duration: 18000, resetAt: 18_000_000 }
    expect(goal(window, 9_000_000)).toBe(50)
    expect(goal(window, -1)).toBe(0)
    expect(goal(window, 18_000_001)).toBe(100)
    expect(remaining(window.resetAt, 9_000_000)).toBe("2h 30m")
    expect(remaining(window.resetAt, 18_000_000)).toBe("reset due")
    expect(bar(50)).toBe("█████░░░░░")
  })
  test("extracts account id without requiring a JWT", () => {
    expect(accountId("invalid", { accountId: "account" })).toBe("account")
    const token = `x.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "abc" } })).toString("base64url")}.x`
    expect(accountId(token)).toBe("abc")
    expect(accountId("invalid")).toBeUndefined()
  })
  test("projects exhaustion only within the current window", () => {
    const window = { used: 75, duration: 18000, resetAt: 18_000_000 }
    expect(timeToSpent(window, 9_000_000)).toBe("50m")
    expect(timeToSpent({ ...window, used: 25 }, 9_000_000)).toBe(">reset")
    expect(timeToSpent({ ...window, used: 0 }, 9_000_000)).toBe("—")
    expect(timeToSpent({ ...window, used: 100 }, 9_000_000)).toBe("spent")
    expect(timeToSpent(window, 18_000_000)).toBe("—")
  })
  test("colors slow, on-target, and fast usage differently", () => {
    const window = { used: 50, duration: 18000, resetAt: 18_000_000 }
    expect(paceColor(window, 9_000_000)).toBe("#4dbe78")
    expect(paceColor({ ...window, used: 0 }, 9_000_000)).toBe("#508cf0")
    expect(paceColor({ ...window, used: 100 }, 9_000_000)).toBe("#f05050")
  })
  test("warns only when exhaustion is projected before 90% of the window", () => {
    const window = { used: 50, duration: 100, resetAt: 100_000 }
    expect(paceCritical(window, 44_000)).toBe(true)
    expect(paceCritical(window, 45_000)).toBe(false)
    expect(paceCritical({ ...window, used: 0 }, 44_000)).toBe(false)
    expect(paceCritical(window, 100_000)).toBe(false)
  })
})
