import type { NextConfig } from "next";

function toAllowedOriginHost(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const candidate = value.trim();
  if (!candidate) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `${candidate.includes("localhost") ? "http" : "https"}://${candidate}`;

  try {
    return new URL(withProtocol).host;
  } catch {
    return null;
  }
}

function getAllowedOrigins(): string[] {
  const values = new Set<string>();
  const trustedOrigins = process.env.CSRF_TRUSTED_ORIGINS;

  if (trustedOrigins) {
    for (const origin of trustedOrigins.split(",")) {
      const normalized = toAllowedOriginHost(origin);
      if (normalized) {
        values.add(normalized);
      }
    }
  }

  const envCandidates = [
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of envCandidates) {
    const normalized = toAllowedOriginHost(candidate);
    if (normalized) {
      values.add(normalized);
    }
  }

  return [...values];
}

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: {
      allowedOrigins: getAllowedOrigins(),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "amjxgutnnnpjbjigzwpo.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/serwist/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
