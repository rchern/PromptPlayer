---
status: awaiting_human_verify
trigger: "AskUserQuestion answer selections not displaying consistently in Player/Builder preview"
created: 2026-03-10T15:00:00Z
updated: 2026-03-10T15:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - embedded double quotes in question text break the regex parser
test: Fix applied and verified against all 129 AskUserQuestion instances in test file
expecting: User confirms selections now display for all questions in the Player
next_action: Awaiting human verification

## Symptoms

expected: Every AskUserQuestion block should show which option(s) the user selected, with a "Selected" highlight/badge on the chosen option.
actual: Selection display is inconsistent — some AskUserQuestion blocks show the selected answer correctly, while others show no selection at all despite Claude responding confirming the user did select an answer.
errors: No errors reported.
reproduction: Load "Email MFA with GSD.promptplay" in the Player. Session 12 (Discuss Phase 8). Msg 26 (Label), Msg 30 (Label detail), Msg 32 (Phone label) all fail to show selections.
started: Since AskUserQuestion rendering was first implemented.

## Eliminated

- hypothesis: Question text mismatch between tool_use input and parsed tool_result
  evidence: For questions WITHOUT embedded quotes, the match is exact and works perfectly (verified with Msg 24 DISCUSS question)
  timestamp: 2026-03-10T15:05:00Z

- hypothesis: followUpMessages not being correctly built or passed
  evidence: Traced buildNavigationSteps - followUpMessages correctly contain the tool_result user messages paired to assistant messages
  timestamp: 2026-03-10T15:08:00Z

- hypothesis: normalizeContent or followUpAnswerMap failing
  evidence: Content is a plain string, normalizeContent returns it as-is, followUpAnswerMap correctly maps tool_use_id to content
  timestamp: 2026-03-10T15:10:00Z

## Evidence

- timestamp: 2026-03-10T15:05:00Z
  checked: Data pipeline end-to-end for DISCUSS question (Msg 24, no embedded quotes)
  found: parseUserAnswerPairs correctly extracts pairs, question matching works, all 4 options marked Selected
  implication: Core pipeline works when question text has no special characters

- timestamp: 2026-03-10T15:10:00Z
  checked: Msg 26 (Label question) tool_result content
  found: Question text is 'The Design Note uses "MFA Method" as the label...' - contains embedded double quotes
  implication: The regex "([^"]*?)"="([^"]*?)" in parseUserAnswerPairs breaks because [^"]*? stops at the FIRST embedded quote, not the delimiter quote

- timestamp: 2026-03-10T15:12:00Z
  checked: Msg 30 and Msg 32 tool_results
  found: Both contain embedded quotes ("Text Message (SMS)", "Cell Phone") in question text. Regex misparses in all cases.
  implication: This is a systematic issue - any question containing double quotes will fail

- timestamp: 2026-03-10T15:13:00Z
  checked: parseUserAnswer function (used for user-side badge display)
  found: Uses same regex pattern "([^"]*?)"="([^"]*?)" - same vulnerability
  implication: Both the AskUserQuestionBlock selection highlighting AND the user message answer badges are affected

- timestamp: 2026-03-10T15:25:00Z
  checked: New "="-split parser against all 129 AskUserQuestion answers in test file
  found: Old parser: 115/129 correct (89%). New parser: 127/129 correct (98%). All 11 previously-broken embedded-quote cases now parse correctly.
  implication: Fix resolves the reported issue comprehensively

- timestamp: 2026-03-10T15:28:00Z
  checked: Specific reported cases (DISCUSS, LABEL, Label detail, Phone label, PHONE CUE, ERROR MSG)
  found: All 6 now show correct selections. LABEL/Label detail/Phone label (previously broken) now work. DISCUSS/PHONE CUE/ERROR MSG (previously working) still work.
  implication: No regressions, all reported cases fixed

## Resolution

root_cause: The regex /"([^"]*?)"="([^"]*?)"/g in parseUserAnswerPairs (and in parseUserAnswer and cleanAskUserAnswer) uses [^"]*? to match question/answer text. When the question or answer text contains embedded double quotes (e.g., 'The Design Note uses "MFA Method" as the label'), the regex stops at the first embedded quote instead of the intended delimiter. This causes the parsed question string to not match the original question from the tool_use input, so no selection is highlighted. Affected 11 out of 129 AskUserQuestion instances in the test file (8.5%).

fix: Replaced the "Q"="A" regex parser with a "="-delimiter-split approach. The "=" sequence is a protocol-specific delimiter that never appears in natural language text, making it unambiguous. Also unified parseUserAnswer and cleanAskUserAnswer to delegate to the fixed parseUserAnswerPairs. Added positional fallback matching in AskUserQuestionBlock for edge cases where question text still doesn't match exactly (1 case with user notes).

verification: |
  - TypeScript type-check passes (both tsconfig.web.json and tsconfig.node.json)
  - Full build succeeds
  - Tested new parser against all 129 AskUserQuestion answers: 126 exact match + 1 positional fallback + 2 expected nulls (empty answers)
  - All 6 specific reported cases verified correct
  - No regressions in previously-working cases

files_changed:
  - src/renderer/src/components/message/cleanUserText.ts
  - src/renderer/src/components/message/AskUserQuestionBlock.tsx
