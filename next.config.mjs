/** @type {import('next').NextConfig} */
const nextConfig = {
  // OpenNext Cloudflare handles the runtime; keep the default Node build.
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;

// Enable Cloudflare bindings (D1, DO, R2, rate-limit) during `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
