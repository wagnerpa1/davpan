# Palette's Journal - Critical UX/Accessibility Learnings

## 2025-01-24 - Input Length Feedback
**Learning:** Users often encounter frustration when form submissions fail due to silent character limits. Providing real-time visual feedback (character counters) and enforcing limits at the UI level (`maxLength`) prevents these "dead-end" interactions.
**Action:** Always implement character counters for textareas with backend character limits (like medical notes) to guide the user proactively.
