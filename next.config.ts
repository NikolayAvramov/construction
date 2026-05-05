import type { NextConfig } from "next";

/** Hostnames от ALLOWED_DEV_ORIGINS (без http://), за LAN / телефон при `next dev`. */
function parseAllowedDevOrigins(): string[] {
  const raw = process.env.ALLOWED_DEV_ORIGINS;
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

const allowedDevOrigins = parseAllowedDevOrigins();

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
