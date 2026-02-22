# Player UX Feedback (from 2026-02-22 testing)

Captured during Phase 4 checkpoint testing after stitcher fix.

## 1. "Show more" button shows when nothing to show
- The expand/collapse "Show more" button appears even when there's no overflow content
- Should be hidden when the content fits without scrolling

## 2. Rendering: broken box borders
- CHECKPOINT box and horizontal-rule-with-text patterns have broken/misaligned borders
- Likely markdown rendering issue with certain table or box-drawing character patterns

## 3. System-generated messages displayed as "YOU"
- A message like `Read the output file to retrieve the result: C:\Users\Rebecca\AppData\Local\Temp\claude\...tasks\b3ae982.output` shows as a user message
- This is a system-generated TaskOutput/tool_result message, not something the user typed
- Need to identify and filter (or reclassify) these auto-generated user messages
- Possibly related to `queue-operation` lines or system-injected tool results

## 4. Consecutive solo Claude messages — could combine into one step
- ~5 steps in a row where it's just a Claude message with no user message
- These were likely displayed together in the original session (assistant continues after tool calls)
- Investigate: is there an indication in the data that they were part of one logical turn?
- Could combine consecutive assistant-only steps into a single step with all the content
- Related to the new sub-group splitting — each tool-call round creates a separate assistant turn, but if all the tool results are filtered (plumbing), the user sees multiple solo assistant steps

## 5. Step sequencing needs thought
- The overall order of what shows on which screen could be improved
- Some steps feel like they should be grouped differently
- May need a higher-level "combine adjacent assistant-only steps" pass after buildNavigationSteps

## Priority
Items 1 and 4 are likely quick wins. Item 3 needs investigation. Items 2 and 5 need design thought.
