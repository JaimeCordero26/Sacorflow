import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Default incremental cache / tag cache left at defaults.
  // Custom worker entry (worker.ts) re-exports the ChatRoom Durable Object and
  // intercepts WebSocket upgrades before delegating to this generated handler.
});
