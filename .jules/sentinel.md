# Sentinel Security Journal 🛡️

This journal is maintained by Sentinel to document critical security learnings, vulnerability patterns, and security best practices for the DAV Sektion Pfarrkirchen project.

## 2026-03-31 - Elimination of Legacy Unprotected Notification Subscription Endpoint
**Vulnerability:** The legacy `/api/notifications/subscribe` API route lacked CSRF validation (`isSameOriginRequest`) and was completely unused, leaving a potential attack vector for unauthorized subscription manipulation or injection.
**Learning:** Over time, active features can migrate to newer endpoints (such as `/api/push/subscription`) while old, insecure code remains in the codebase as "dead code." This increases the attack surface unnecessarily.
**Prevention:** Regularly audit API routes and delete dead or deprecated code blocks. Always enforce same-origin verification (CSRF protection) on all state-changing or authenticated endpoints.
