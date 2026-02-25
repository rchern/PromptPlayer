# Builder UX Feedback (from 2026-02-22 Phase 5 testing)

Captured during Phase 5 checkpoint testing.

## 1. Date filter presets: "This Week" / "This Month" vs "Last N Days"
- On a Sunday, "Today" and "This Week" produce identical results (confusing)
- Consider renaming to "Last 7 days" / "Last 30 days" instead of calendar-based presets
- Or use relative presets: "Today", "Last 7 days", "Last 30 days", "Older"
- Needs design decision on which feels more natural for the use case

## 2. Session checkbox placement in assembly outline
- Checkbox in SessionEntry/SectionHeader could use better positioning
- Currently looks crammed next to metadata row
- Consider left-aligned checkbox column or more spacing
- Captured during Phase 6 checkpoint testing (2026-02-24)

## 3. Split session to new section (complement to merge)
- If sections can be merged, users should be able to break a session out into its own section
- Natural UX complement: merge combines, split separates
- Implementation: removeSession from current section + create new section with just that session
- Not in BLDR requirements but small addition
- Captured during Phase 6 checkpoint testing (2026-02-24)

## Priority
Low — cosmetic/UX polish items. Functional behavior is correct.
