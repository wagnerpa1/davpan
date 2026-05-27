# Sentinel's Journal - Critical Security Learnings

## 2025-05-14 - [Legacy Dead Code and CSRF Protection]
**Vulnerability:** Found a legacy endpoint `/api/notifications/subscribe` that lacked CSRF protection (`isSameOriginRequest`) while the active endpoint `/api/push/subscription` was properly protected.
**Learning:** Legacy code often bypasses updated security standards. Even if not currently linked in the frontend, such endpoints can still be reached and exploited.
**Prevention:** Perform periodic audits of the `api/` directory to identify and either protect or remove unused endpoints.

## 2025-05-14 - [Input Validation and Information Disclosure]
**Vulnerability:** Profile update endpoints accepted arbitrary string lengths and leaked database error details in 500 responses.
**Learning:** Trusting database constraints alone for input validation is insufficient and can lead to information leakage if the database error is passed directly to the client.
**Prevention:** Always implement explicit length validation at the API entry point and return generic error messages for server-side failures.
