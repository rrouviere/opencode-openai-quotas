import { Plugin } from "@opencode/plugin"
import { Quota } from "./rpc"
import { accountId, parseUsage } from "./usage"

export default Plugin.define({
  id: "openai-quota",
  async setup(ctx) {
    await ctx.rpc.register(Quota, {
      read: async (_input, context) => {
        try {
          const connection = await ctx.integration.connection.active("openai")
          const credential = connection ? await ctx.integration.connection.resolve(connection) : undefined
          if (!credential || credential.type !== "oauth") return { status: "Connect OpenAI with ChatGPT", snapshot: null }
          if (credential.expires && credential.expires <= Date.now()) return { status: "OpenAI login expired", snapshot: null }
          const id = accountId(credential.access, credential.metadata)
          const headers: Record<string, string> = { accept: "application/json", authorization: `Bearer ${credential.access}` }
          if (id) headers["chatgpt-account-id"] = id
          const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
            headers, redirect: "error", signal: AbortSignal.any([context.signal, AbortSignal.timeout(10000)])
          })
          if (response.status === 401 || response.status === 403) return { status: "OpenAI login rejected", snapshot: null }
          if (!response.ok) return { status: `Usage unavailable (HTTP ${response.status})`, snapshot: null }
          return { status: "ok", snapshot: parseUsage(await response.json()) }
        } catch {
          return { status: "Usage unavailable", snapshot: null }
        }
      }
    })
  }
})
