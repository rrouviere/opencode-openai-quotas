import { Rpc } from "@opencode/plugin/rpc"

export const Quota = Rpc.define({
  id: "openai-quota",
  events: {},
  methods: {
    read: {
      input: { type: "object", properties: {}, additionalProperties: false },
      output: {
        type: "object",
        properties: {
          status: { type: "string" },
          snapshot: { type: ["object", "null"], additionalProperties: true }
        },
        required: ["status", "snapshot"],
        additionalProperties: false
      }
    }
  }
})
