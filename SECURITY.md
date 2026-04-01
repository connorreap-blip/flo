# Security Policy

## Supported Scope

This repository ships the `flo` desktop application and its public documentation.

## Reporting A Vulnerability

Do not open public GitHub issues for security-sensitive reports.

Until a dedicated security mailbox is configured, use a private reporting path before public disclosure:

- GitHub Security Advisories, if enabled for the repository
- Direct maintainer contact

Include:

- affected version or commit
- reproduction steps
- expected impact
- proof-of-concept details, if available

## Response Expectations

- triage within 5 business days
- confirmation when the issue is reproduced
- fix timing based on severity and exploitability

## Current Security Posture

- local-first storage
- no built-in cloud sync
- no built-in analytics
- explicit file-system access through Tauri capabilities
- generated exports remain on the user's device unless they choose to share them
