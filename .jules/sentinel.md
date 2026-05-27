# Sentinel's Security Journal

## 2026-05-27 - [Information Disclosure in API Error Responses]
**Vulnerability:** Raw database error messages (e.g., from Supabase/PostgreSQL) were being returned directly to the client in catch blocks or error checks.
**Learning:** This exposes internal database schema details, constraints, and potentially logic that can be used by an attacker to map the system.
**Prevention:** Always return generic error messages to the client (e.g., "Failed to update profile") and log the detailed error server-side for debugging purposes.
