## 2025-05-16 - Parallelizing Fetches in Server Components
**Learning:** Sequential `await` calls in Next.js Server Components create unnecessary waterfalls. In this codebase, the Dashboard and Tours overview had several independent database calls (Supabase) and internal logic calls (like `loadTourRegistrationOverview`) that could be parallelized.
**Action:** Use `Promise.all` for all independent data fetching in Server Components to minimize TTFB.

## 2025-05-16 - Caution with Biome Unsafe Fixes on PWA Metadata
**Learning:** Automated linting fixes (specifically `biome check --write --unsafe`) can incorrectly "optimize" or reorder metadata and splash screen definitions in `src/app/layout.tsx`, leading to broken PWA media queries.
**Action:** Always manually verify `src/app/layout.tsx` after running automated fixes, or apply fixes selectively to avoid regressing splash screen logic.

## 2025-05-27 - Caution when consolidating registration queries
**Learning:** Consolidating multiple registration queries into one by filtering solely on 'user_id' can lead to functional regressions. In this system, registrations for children might be associated with different user IDs (e.g., if created by an admin or another parent), so explicitly querying by 'child_profile_id' is necessary to maintain full visibility.
**Action:** Always verify if a data consolidation change affects the set of returned records, especially in multi-tenant or parent/child relationship models.
