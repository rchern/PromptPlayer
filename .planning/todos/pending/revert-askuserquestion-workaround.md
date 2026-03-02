# Revert AskUserQuestion Workaround

**Created:** 2026-03-01
**Area:** GSD / Claude Code
**Trigger:** Claude Code fixes issue [#29530](https://github.com/anthropics/claude-code/issues/29530)

## Context

`AskUserQuestion` silently returns empty answers when listed in a skill's `allowed-tools` frontmatter. Workaround: removed `AskUserQuestion` from all GSD skill files so it falls through to default permissions.

## Files Changed

All under `C:\Users\Rebecca\.claude\commands\gsd\`:

1. `add-todo.md`
2. `check-todos.md`
3. `debug.md`
4. `discuss-phase.md`
5. `execute-phase.md`
6. `health.md`
7. `new-milestone.md`
8. `new-project.md`
9. `quick.md`
10. `plan-milestone-gaps.md`
11. `reapply-patches.md`
12. `resume-work.md`
13. `settings.md`
14. `update.md`

## How to Revert

Add `- AskUserQuestion` back to the `allowed-tools` list in each file's YAML frontmatter.

**Note:** Running `/gsd:update` will overwrite these files from upstream, which will re-introduce `AskUserQuestion` to allowed-tools. If the upstream bug isn't fixed yet, re-apply this workaround after updating.
