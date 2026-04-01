# flo Launch Readiness Review

Date: April 1, 2026

This document converts the launch checklist into concrete repo actions, remaining blockers, and release decisions.

## What Was Executed In This Pass

- replaced the template README with a public product README
- added public help docs and a website help structure
- added a privacy policy draft, security policy, support guide, and GitHub issue forms
- removed tracked internal planning docs from `docs/`
- ignored the local `pm-skills/` folder so internal material is not accidentally published
- removed template assets and the unused Tauri `greet` command
- aligned the web favicon with the `flo-site` favicon
- switched the app off Google Fonts to avoid unnecessary outbound requests
- tightened Tauri CSP from `null` to an explicit policy

## Product Validation Notes

### Import Files

Current status: functionally present

- Files tab import copies selected files into `assets/`
- card document drag-and-drop extracts readable text from supported file types
- file previews support text and images inside the app

Remaining launch task:

- manual QA on macOS for multi-file import, duplicate filenames, PDF import, DOCX import, and asset attachment

### Export

Current status: compile-verified, behavior reviewed in code

- export produces a single `context.md`
- hierarchy, workflows, scoped references, and optional agent hints are preserved
- brainstorm cards are excluded by default

Important limitation:

- export is markdown-only, not a full packaged workspace export

### Agent Hints

Current status: implemented

- hints can be inline
- hints can be collected into a separate section
- hints can be hidden from export

## GitHub And Public Repo Readiness

### Releases vs Packages

For `flo`, GitHub Releases matter. GitHub Packages does not.

- GitHub Releases should distribute `.dmg`, `.msi`, and Linux bundles
- GitHub Packages is for libraries and container artifacts, not the desktop app itself
- keep the app repo private on npm unless you intentionally ship a JS package

Official references:

- GitHub Releases: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository
- GitHub Packages overview: https://docs.github.com/en/packages/learn-github-packages/introduction-to-github-packages
- Tauri distribution docs: https://v2.tauri.app/distribute/

### Still Needed Before Public Launch

- choose and add a real software license
- add a release workflow for signed desktop bundles
- decide whether auto-update ships at launch
- review git history for internal or unprofessional commit messages before publication

## Structured Help For The Website

Prepared docs:

- `docs/help/product-guide.md`
- `docs/help/website-help-outline.md`

Recommended help center sections:

- getting started
- workspace basics
- documents and files
- export and AI handoff
- history and recovery
- privacy and security
- FAQ

## Marketing Readiness

### Asset List

- 30-second launch trailer
- 3 short feature clips: canvas, AI Check, export
- annotated screenshots for landing page
- one comparison graphic: `flo` vs whiteboards/docs
- founder walkthrough video
- launch thread / post visuals
- help center screenshots and GIFs

### AI Tool Stack To Evaluate

- OpenAI Sora for concept and motion generation: https://openai.com/sora
- Runway for polished product videos and motion edits: https://runwayml.com/
- Adobe Firefly for brand-safe creative variants: https://www.adobe.com/products/firefly.html
- Midjourney for exploratory visual direction: https://www.midjourney.com/
- ElevenLabs for voiceover and narration: https://elevenlabs.io/

Use the product UI itself for source captures. Use AI to polish framing, motion, voice, and variant generation, not to fake the product.

## Bugs, Feature Requests, And Support

Implemented in this pass:

- GitHub issue forms for bug reports and feature requests
- `SUPPORT.md`
- `SECURITY.md`

Recommended automation next:

1. Label incoming issues by type and severity.
2. Mirror labeled issues into an internal agent intake queue.
3. Generate weekly bug and request summaries for triage.
4. Auto-open implementation tasks for confirmed launch blockers.

## Security And Privacy

Improved in this pass:

- removed remote font dependency
- added explicit CSP
- added security and privacy docs

Still required:

- legal review of the privacy policy draft
- final review of Tauri capabilities against real product needs
- manual audit of release artifacts for secrets, internal docs, and sample data

## Launch Blockers Still Open

- no chosen OSS/commercial license
- no signed release pipeline yet
- no manual QA signoff for import/export on target platforms
- placeholder contact details remain in policy/security/support docs
