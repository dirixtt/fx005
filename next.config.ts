import type { NextConfig } from "next";

// Product photos are served from the project's public Supabase Storage bucket.
// Deriving the host from the env var keeps image optimisation working across
// local/staging/production instead of pinning one project ref into the repo.
const supabaseHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
