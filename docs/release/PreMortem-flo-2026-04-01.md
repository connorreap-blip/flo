# Pre-Mortem Analysis: flo

Date: April 1, 2026

Assumption: flo launches publicly within 14 days and underperforms. This document works backward from that failure.

## Tigers (Real Risks)

### Launch-Blocking

1. Public repo ships without a license.
   - Impact: adoption friction, unclear usage rights, and commercial hesitation
   - Mitigation: choose and add a real license before opening the repo

2. Release distribution is not fully configured.
   - Impact: users cannot reliably install or update the app
   - Mitigation: finalize signed GitHub Releases workflow and test one end-to-end draft release

3. Import/export QA is code-reviewed but not manually signed off.
   - Impact: the product promise fails on the most important workflow
   - Mitigation: run a launch QA matrix covering save, reopen, import, attachment, export, and snapshot restore

4. Placeholder legal/support contact details remain in public docs.
   - Impact: privacy and security policies look unfinished and reduce trust
   - Mitigation: replace placeholders before launch

### Fast-Follow

1. Export is markdown-only, not a packaged multi-file export.
2. No auto-update configuration is in place yet.
3. There is no automated UI regression coverage.
4. The bundle size is large enough to warrant follow-up optimization.

## Paper Tigers (Overblown Concerns)

1. The app is not cloud-connected.
   - For launch, this is a product choice, not a blocker.

2. The repo is not published as an npm package.
   - This is a desktop application, so GitHub Releases matter more than GitHub Packages.

## Elephants (Not Discussed Enough)

1. Are sample workspaces and screenshots fully scrubbed of internal strategy or test data?
2. Is the repo commit history clean enough for public inspection?
3. Is the launch website help center aligned with the shipped desktop feature set on day one?
4. Is the final icon set consistent across favicon, app icon, installer assets, and screenshots?

## Action Plans For Launch-Blocking Tigers

### Risk: Missing license

- Mitigation: choose the intended license and add it at the repo root
- Owner: product/founder
- Due date: before the repo is made public

### Risk: Incomplete release pipeline

- Mitigation: add signed GitHub Releases workflow and test a real draft release
- Owner: engineering
- Due date: before public announcement

### Risk: Import/export not manually signed off

- Mitigation: run a release checklist on macOS with real sample workspaces and imported files
- Owner: engineering / product QA
- Due date: before launch candidate approval

### Risk: Placeholder legal/support info

- Mitigation: replace placeholders in privacy, security, and support docs with real contact details
- Owner: founder / legal
- Due date: before publication
