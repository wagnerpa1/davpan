## 2026-06-27 - [Information Disclosure & Input Validation]
**Vulnerability:** API routes were leaking raw database error messages via `error.message` and lacked input length validation on user-provided strings.
**Learning:** Returning detailed error messages can expose internal database structure. Missing length limits can lead to DoS or database bloat.
**Prevention:** Always use generic error messages in API responses and implement character length limits for all user-provided fields.
