import { Plugin } from "@opencode/plugin/tui"
import { TextAttributes } from "@opentui/core"
import { createSignal } from "solid-js"
import { Quota } from "./rpc"
import { goal, paceColor, paceCritical, remaining, timeToSpent, type Snapshot, type Window } from "./usage"

export default Plugin.define({
  id: "openai-quota.tui",
  setup(context) {
    const [snapshot, setSnapshot] = createSignal<Snapshot | null>(null)
    const [status, setStatus] = createSignal("Loading usage…")
    const [now, setNow] = createSignal(Date.now())
    let stopped = false
    let inFlight = false

    async function refresh() {
      if (inFlight) return
      inFlight = true
      try {
        const result = await context.client.rpc(Quota).read({}, { location: context.location }) as { status: string; snapshot: Snapshot | null }
        if (stopped) return
        if (result.status === "ok" && result.snapshot) setSnapshot(result.snapshot)
        setStatus(result.status)
      } catch {
        if (!stopped) setStatus("Usage unavailable")
      } finally { inFlight = false }
    }

    void refresh()
    const poll = setInterval(() => void refresh(), 60_000)
    const clock = setInterval(() => setNow(Date.now()), 10_000)
    const unregister = context.ui.slot({
      append: "sidebar.content",
      render: () => {
        const pane = (label: string, window: Window | null | undefined) => {
          const [width, setWidth] = createSignal(0)
          return <box flexDirection="column" alignItems="center" flexGrow={1} flexBasis={0} minWidth={0} height={5} onSizeChange={function () { setWidth(this.width) }}>
            <text width="100%" height={1} wrapMode="none" truncate textAlign="center">{label}</text>
            {window ? <>
              <box flexDirection="row" width="100%" height={1}>
                <box width={Math.round(Math.floor(width()) * (100 - window.used) / 100)} height={1} backgroundColor={paceColor(window, now())} />
                <box flexGrow={1} height={1} backgroundColor="#343b45" />
              </box>
              <text width="100%" height={1} wrapMode="none" truncate textAlign="center">{Math.round(100 - window.used)}% ({remaining(window.resetAt, now())}) left</text>
              <text width="100%" height={1} wrapMode="none" truncate textAlign="center" fg={paceColor(window, now())} attributes={TextAttributes.BOLD | (paceCritical(window, now()) ? TextAttributes.BLINK : 0)}>{`Current Pace: ${timeToSpent(window, now())}`.length <= width() ? `Current Pace: ${timeToSpent(window, now())}` : `Pace: ${timeToSpent(window, now())}`}</text>
              <text width="100%" height={1} wrapMode="none" truncate textAlign="center" fg={context.theme.text.muted}>Goal: {Math.round(100 - goal(window, now()))}%{now() >= window.resetAt ? " · stale" : ""}</text>
            </> : <text width="100%" height={1} wrapMode="none" truncate textAlign="center" fg={context.theme.text.muted}>Unavailable</text>}
          </box>
        }
        return <box flexDirection="column" paddingTop={1}>
          <text fg={context.theme.text.base}><b>OpenAI subscription quotas</b></text>
          {snapshot() ? <>
            <box flexDirection="row">
              {pane("5h", snapshot()?.fiveHour)}
              <box flexDirection="column" paddingRight={1}>
                <text fg={context.theme.text.muted}>│</text>
                <text fg={context.theme.text.muted}>│</text>
                <text fg={context.theme.text.muted}>│</text>
                <text fg={context.theme.text.muted}>│</text>
                <text fg={context.theme.text.muted}>│</text>
              </box>
              {pane("Weekly", snapshot()?.weekly)}
            </box>
            {status() !== "ok" && <text fg={context.theme.text.muted}>Stale · {status()}</text>}
          </> : <text fg={context.theme.text.muted}>{status()}</text>}
        </box>
      }
    })
    return () => { stopped = true; clearInterval(poll); clearInterval(clock); unregister() }
  }
})
