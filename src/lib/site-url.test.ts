import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("prefers an explicitly configured site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "fx005.vercel.app");

    expect(getSiteUrl()).toBe("https://shop.example.com");
  });

  it("strips trailing slashes so joined paths never double up", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com//");

    expect(getSiteUrl()).toBe("https://shop.example.com");
  });

  it("falls back to the free Vercel domain, so no custom domain is required", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "fx005.vercel.app");

    expect(getSiteUrl()).toBe("https://fx005.vercel.app");
  });

  it("treats a blank explicit value as unset rather than emitting an empty origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "   ");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "fx005.vercel.app");

    expect(getSiteUrl()).toBe("https://fx005.vercel.app");
  });

  it("uses localhost when neither is present", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
