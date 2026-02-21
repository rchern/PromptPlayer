# Phase 1: App Shell - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

A running Electron app on Windows with a home screen that routes to Builder or Player mode. This phase delivers the scaffold (Electron + React + TypeScript with electron-vite), the custom window chrome, and the home screen with mode routing. No actual Builder or Player functionality — just the shell and navigation structure.

</domain>

<decisions>
## Implementation Decisions

### Home screen layout
- Two large side-by-side cards for Builder and Player modes
- Each card contains: icon, title, and one-line description of what the mode does
- Recent files list below the cards for quick access to previously opened .promptplay files
- Cards are horizontally arranged (side-by-side, not stacked)

### Navigation pattern
- Claude's Discretion: how users return to home from Builder/Player (home button vs menu)
- Claude's Discretion: full-screen mode replacement vs persistent tabs (leaning full-screen for focus)
- Claude's Discretion: auto-hiding chrome in Player mode during presentations
- Claude's Discretion: F11 fullscreen/kiosk mode support

### Window and chrome
- Custom titlebar (frameless window with custom minimize/maximize/close controls)
- Titlebar includes app name and logo — branded feel
- Default theme follows system light/dark setting
- Claude's Discretion: default window size and remember-last-size behavior

### Visual direction
- Clean and minimal aesthetic with a subtle developer edge
- Teal accent color for buttons, active states, and highlights
- All colors defined as CSS variable theme tokens for easy developer-side changes
- Claude's Discretion: icon style for mode cards, typography scale, spacing, border radii
- Claude's Discretion: specific font choices (clean sans-serif for UI, good monospace for code)

### Claude's Discretion
- Navigation architecture (full-screen modes vs persistent nav — recommendation: full-screen for focus)
- Player chrome behavior during presentations (recommendation: auto-hide on idle)
- Fullscreen toggle support (recommendation: yes, F11-style for presentations)
- Window size defaults (recommendation: 80% of screen first launch, remember after)
- All detailed visual design decisions (spacing, radii, shadows, typography scale)
- Icon selection for Builder/Player cards (recommendation: simple, clean SVG icons)

</decisions>

<specifics>
## Specific Ideas

- User's favorite color is teal — use as primary accent
- Colors should be trivially swappable via CSS variables (developer configurable, not user-facing settings)
- App is for presenting Claude Code workflows to dev teams — content should be the star, not the UI
- Clean/minimal is the safest aesthetic for a presentation tool (whitespace and restraint over gradients and depth)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-app-shell*
*Context gathered: 2026-02-20*
