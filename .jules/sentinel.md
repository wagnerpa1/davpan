## 2025-05-16 - Unprotected Debug Endpoints
**Vulnerability:** Information disclosure via an unprotected API route (`/api/debug/buckets`) that listed internal Supabase storage buckets without authentication.
**Learning:** Debug routes and scripts often bypass the standard security middleware or are added "temporarily" and forgotten, leaving sensitive infrastructure details exposed.
**Prevention:** Avoid committing debug-only routes to the repository. If needed for staging, ensure they are protected by strict admin-only role checks and environment-specific flags.
