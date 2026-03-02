# Phase 10: Packaging and Release - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Package PromptPlayer as a distributable Windows installer with CI/CD pipeline, auto-update support, and OS-level .promptplay file association. This phase delivers the build/release infrastructure — no new app features.

</domain>

<decisions>
## Implementation Decisions

### Installer experience
- Traditional .exe installer via electron-builder
- Per-user install (AppData/Local) — no admin required
- Start menu + desktop shortcuts (desktop shortcut opt-out-able during install)
- Auto-update via electron-updater using GitHub Releases as update source
- No paid code signing certificate — ship unsigned

### CI/CD pipeline
- GitHub Actions with two workflows:
  - **PR checks:** Run ESLint + build verification on every PR (no artifacts produced)
  - **Release:** Triggered by git tags (e.g., v1.0.0), builds installer, publishes as draft GitHub Release
- Draft releases — review artifacts and edit release notes before manually publishing
- Lint + build steps in CI (no test suite exists in the project currently — pipeline structured so a test step can be added later)
- No pre-commit hooks for v1

### Versioning
- Claude's discretion on versioning approach (manual package.json bump vs tag-derived)

### File association (.promptplay)
- Register .promptplay file type during installation
- Double-click .promptplay file opens straight to Player mode (ready to present)
- Single shared icon for both app and .promptplay file type
- Use Electron default/placeholder icon for v1 (user will provide a custom icon later if desired)

### SmartScreen / code signing
- Ship unsigned — no code signing certificate
- Document SmartScreen bypass in README/release notes ("Click More Info > Run Anyway")
- SmartScreen only appears on first run; Windows remembers after that

### Claude's Discretion
- Single-instance vs new window behavior when opening .promptplay files
- Versioning strategy (manual bump vs tag-derived)
- electron-builder target format (NSIS installer vs squirrel vs other)
- Exact auto-update UX (notification style, restart prompt)
- CI workflow naming and structure details

</decisions>

<specifics>
## Specific Ideas

- Auto-update should feel like VS Code's update flow (background download, prompt to restart)
- Draft releases allow reviewing before auto-update picks it up
- No test suite exists — this is a vibe-coded project through 9 phases with manual smoke testing. Adding tests is a separate effort, not part of this phase

</specifics>

<deferred>
## Deferred Ideas

- Pre-commit hooks (husky/lint-staged) for local lint enforcement — could be added later
- Test suite (unit tests, component tests, integration tests) — would be its own phase/milestone
- Custom app icon — user will provide when/if needed
- Free OSS code signing (e.g., SignPath) — investigate if the project goes public

</deferred>

---

*Phase: 10-packaging-and-release*
*Context gathered: 2026-03-01*
