# Sentinel's Journal - Security Learnings

## 2025-05-16 - Input Length Validation Gaps
**Vulnerability:** Multiple API routes (profile update, child profile management) lacked length constraints on user-provided text fields like `medical_notes` and `full_name`.
**Learning:** While the application uses RLS and CSRF protection, it initially overlooked resource exhaustion and database bloat risks from large text payloads in fields meant for specific information.
**Prevention:** Always enforce strict length limits on all string inputs in API routes and Server Actions, especially for fields that might otherwise be perceived as "unlimited" text areas.
