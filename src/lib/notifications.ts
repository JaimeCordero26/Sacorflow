// Pluggable notification layer. Add channels (email, Discord) by implementing
// NotificationChannel and pushing into the `channels` array — the core dispatch
// logic below never changes.

export interface NotificationEvent {
  title: string;
  body: string;
  url?: string;
}

export interface NotificationChannel {
  readonly name: string;
  isConfigured(env: CloudflareEnv): boolean;
  send(event: NotificationEvent, env: CloudflareEnv): Promise<void>;
}

const telegramChannel: NotificationChannel = {
  name: "telegram",
  isConfigured(env) {
    return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
  },
  async send(event, env) {
    const text =
      `*${event.title}*\n${event.body}` +
      (event.url ? `\n${event.url}` : "");
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        }),
      },
    );
    if (!res.ok) {
      console.error("[notifications] telegram failed", res.status, await res.text());
    }
  },
};

const channels: NotificationChannel[] = [telegramChannel];

// Fan out to every configured channel. Never throws — notifications are
// best-effort and must not break the request that triggered them.
export async function notifyPartners(
  event: NotificationEvent,
  env: CloudflareEnv,
): Promise<void> {
  await Promise.allSettled(
    channels
      .filter((c) => c.isConfigured(env))
      .map((c) => c.send(event, env)),
  );
}
