// GitHub App integration. Uses a GitHub App (installation tokens), not a PAT.
//
// IMPORTANT: GITHUB_APP_PRIVATE_KEY must be in PKCS#8 PEM ("BEGIN PRIVATE KEY").
// GitHub issues PKCS#1 ("BEGIN RSA PRIVATE KEY") — convert once with:
//   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in gh.pem -out gh.pkcs8.pem
// Store the PKCS#8 contents (newlines as \n) in the secret.

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// Build a short-lived GitHub App JWT (RS256).
async function appJwt(env: CloudflareEnv): Promise<string> {
  const appId = env.GITHUB_APP_ID;
  const pk = env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !pk) throw new Error("GitHub App not configured");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };
  const data = `${b64url(encoder.encode(JSON.stringify(header)))}.${b64url(
    encoder.encode(JSON.stringify(payload)),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pk),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(data),
  );
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "SacorTech-Dashboard",
  "X-GitHub-Api-Version": "2022-11-28",
};

// Exchange the App JWT for a per-installation access token.
export async function getInstallationToken(
  env: CloudflareEnv,
  installationId: number,
): Promise<string> {
  const jwt = await appJwt(env);
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    { method: "POST", headers: { ...GH_HEADERS, Authorization: `Bearer ${jwt}` } },
  );
  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { token: string };
  return json.token;
}

async function ghGet<T>(
  token: string,
  path: string,
): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { ...GH_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GitHub GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface ProgressResult {
  pct: number;
  closed: number;
  total: number;
}

// Progress = closed issues / total issues. If a milestone is linked, scope to
// that milestone; otherwise use all issues in the repo.
export async function computeProgress(
  env: CloudflareEnv,
  opts: {
    installationId: number;
    repo: string; // "owner/repo"
    milestoneId?: number | null;
  },
): Promise<ProgressResult> {
  const token = await getInstallationToken(env, opts.installationId);

  if (opts.milestoneId) {
    const ms = await ghGet<{ open_issues: number; closed_issues: number }>(
      token,
      `/repos/${opts.repo}/milestones/${opts.milestoneId}`,
    );
    const total = ms.open_issues + ms.closed_issues;
    return {
      total,
      closed: ms.closed_issues,
      pct: total === 0 ? 0 : Math.round((ms.closed_issues / total) * 100),
    };
  }

  // No milestone: count issues across the repo (state=all, excluding PRs).
  const issues = await ghGet<Array<{ state: string; pull_request?: unknown }>>(
    token,
    `/repos/${opts.repo}/issues?state=all&per_page=100`,
  );
  const real = issues.filter((i) => !i.pull_request);
  const closed = real.filter((i) => i.state === "closed").length;
  const total = real.length;
  return {
    total,
    closed,
    pct: total === 0 ? 0 : Math.round((closed / total) * 100),
  };
}

// Verify an incoming webhook's X-Hub-Signature-256 header (HMAC-SHA256).
export async function verifyWebhookSignature(
  secret: string,
  payload: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected =
    "sha256=" +
    [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}
