/**
 * Canonical public origin for this deployment, without a trailing slash.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL — set this once the shop has its own domain.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — the project's assigned *.vercel.app
 *     production domain, which Vercel injects into every build for free. This
 *     means a deployment on the default domain still emits correct sitemap and
 *     Open Graph URLs with no configuration at all.
 *  3. localhost, for local development.
 *
 * Only ever called from server components and route handlers, so the unprefixed
 * Vercel variable is readable here.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelDomain) return `https://${vercelDomain}`;

  return "http://localhost:3000";
}
