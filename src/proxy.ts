import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/register",
  "/oeffentlich",
  "/~offline",
  "/serwist",
  "/auth/callback",
];

const PUBLIC_FILE_PATHS = new Set([
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
]);

const STATIC_FILE_PATTERN =
  /\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|json|txt|xml|webmanifest|map)$/i;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_FILE_PATHS.has(pathname) ||
    STATIC_FILE_PATTERN.test(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  return await createClient(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     * - serwist/sw.js (service worker)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|json|txt|xml|webmanifest|map)$|serwist/).*)",
  ],
};
