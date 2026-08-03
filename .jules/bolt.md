## 2025-05-16 - Parallelizing Fetches in Server Components
**Learning:** Sequential `await` calls in Next.js Server Components create unnecessary waterfalls. In this codebase, the Dashboard and Tours overview had several independent database calls (Supabase) and internal logic calls (like `loadTourRegistrationOverview`) that could be parallelized.
**Action:** Use `Promise.all` for all independent data fetching in Server Components to minimize TTFB.

## 2025-05-16 - Caution with Biome Unsafe Fixes on PWA Metadata
**Learning:** Automated linting fixes (specifically `biome check --write --unsafe`) can incorrectly "optimize" or reorder metadata and splash screen definitions in `src/app/layout.tsx`, leading to broken PWA media queries.
**Action:** Always manually verify `src/app/layout.tsx` after running automated fixes, or apply fixes selectively to avoid regressing splash screen logic.

## 2025-05-18 - Authorizing First & Parallelizing metadata DB calls
**Learning:** Making metadata or dictionary-lookup queries prior to authentication and permission checks is a costly anti-pattern in server components. If a user is not logged in or authorized, it causes unnecessary database connections and slow redirects. Additionally, fetching independent options or initializing Supabase clients sequentially creates multiple waterfalls.
**Action:** Always perform auth/permission checks as the first step in Server Components before launching any other asynchronous fetches, and group remaining fetches together with `Promise.all` to keep pages fast.
