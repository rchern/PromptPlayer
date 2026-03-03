# Phase 2: Data Pipeline - Research

**Researched:** 2026-02-21
**Domain:** Claude Code JSONL parsing, UUID chain stitching, Electron IPC filesystem access
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Import experience
- No bulk "import" step -- app reads JSONL files directly from ~/.claude/projects/ for browsing
- Auto-discover from ~/.claude/projects/ on app launch and on manual refresh
- "Browse other location" fallback for files from other machines or backups
- Only sessions the user adds to a presentation get copied into app-local storage
- Sessions are browsed/previewed from source files without copying

#### Session identity & metadata
- Browse list shows: project folder name, date, and a snippet of the first user message
- Sessions grouped by project, sorted by date within each group
- Show all sessions regardless of length (no filtering of short/false-start sessions)

#### Tool call classification
- Default classification applied at parse time -- Builder (Phase 7) allows overrides per-type or per-instance
- **Plumbing (hidden by default):** Read, Grep, Glob, Write, Edit, Bash
- **Narrative (shown by default):** AskUserQuestion, TaskCreate, TaskUpdate, TaskList
- **Thinking blocks:** hidden by default
- tool_result inherits the same classification as its paired tool_use (always classified together)
- When a Claude response contains both text and tool calls, the text portion is still shown even when tool calls are hidden

#### Error handling
- Unparseable JSONL files appear in browse list with an error badge (not silently excluded)
- Orphaned messages (broken parentUuid chain) included via best-effort ordering (by timestamp)
- Sidechains excluded from the linear thread, but branch points are marked with a subtle indicator
- Malformed individual JSONL lines within a parseable file: skipped (handling details at Claude's discretion)

### Claude's Discretion
- Import feedback UX (progress indicator style during scanning)
- Whether to show message count per session in browse list
- Malformed line handling (silent skip vs subtle warning)
- Exact error badge design for unparseable files

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Summary

This phase builds the data pipeline that reads Claude Code JSONL conversation files, parses them into ordered message sequences, classifies tool calls, and provides app-local persistence for sessions added to presentations. Research focused on three critical areas: (1) the actual Claude Code JSONL file schema verified against real files on disk, (2) Electron IPC patterns for filesystem access, and (3) data architecture for the parse-stitch-classify pipeline.

The JSONL schema has been thoroughly verified against 6 real session files totaling 1,630 lines across 64 files (119.9 MB total across all projects). Key discovery: assistant messages are **split across multiple JSONL lines** -- each content block (thinking, text, tool_use) becomes a separate line with its own UUID, chained via parentUuid to the previous block. This means the "message" concept in the UI requires reassembling multiple JSONL lines that share the same `requestId`. The parentUuid chain is fully linear within a session (no branching observed in real data, though `isSidechain` field exists for it).

The architecture recommendation is: read JSONL files line-by-line using Node.js `readline` (built-in, no dependencies needed), reassemble assistant turns by `requestId`, then walk the parentUuid chain to produce ordered message sequences. Classification is a simple lookup table on tool_use `name` field. App-local storage uses the existing JSON file persistence pattern established in Phase 1.

**Primary recommendation:** Use Node.js built-in `readline` + `fs.createReadStream` for streaming JSONL parsing in the main process, exposed to the renderer via Electron IPC `handle/invoke` pattern.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs` | built-in | File discovery, reading | Native to Electron main process, no dependency needed |
| Node.js `readline` | built-in | Line-by-line JSONL reading | Handles streaming, backpressure, large files natively |
| Node.js `path` | built-in | Path manipulation | Cross-platform path handling |
| Electron `dialog` | Electron 40 | Directory/file picker | Native OS dialog for "Browse other location" |
| Electron `app.getPath` | Electron 40 | Resolve user home, userData | Reliable cross-platform path resolution |
| Zustand | 5.0.11 | State management | Already in project from Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `os.homedir()` | built-in | Resolve `~` path | For default `~/.claude/projects/` path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| readline | stream-json | stream-json is heavier; JSONL is line-delimited so readline is perfect |
| JSON files | SQLite | SQLite adds complexity; JSON files match Phase 1 pattern and data volumes are small |
| fs.readFile (whole file) | readline streaming | Whole-file read would work for most files (<10MB) but streaming is safer for large sessions |

**Installation:**
```bash
# No new dependencies required -- all Node.js built-ins + existing Electron/Zustand
```

## Claude Code JSONL Schema (Verified)

**Confidence: HIGH** -- Verified against 6 real session files from `~/.claude/projects/D--Code-PromptPlayer/`

### File Discovery Structure
```
~/.claude/projects/
  {ProjectPathEncoded}/              # e.g., "D--Code-PromptPlayer"
    {sessionUUID}.jsonl              # Main session file
    {sessionUUID}/                   # Session directory (optional)
      subagents/                     # Subagent conversations (optional)
        agent-{taskId}.jsonl         # Subagent JSONL files
    memory/                          # Memory storage (not conversation data)
```

**Project folder naming:** The project path is encoded by replacing path separators and colons with dashes. For example, `D:\Code\PromptPlayer` becomes `D--Code-PromptPlayer`. Case varies between entries (e.g., `D--Code-PromptPlayer` vs `d--Code-JAD`).

**Session files:** UUID-named `.jsonl` files at the project directory root. Each file is one complete conversation session. Some sessions also have a matching UUID-named directory containing a `subagents/` folder.

### JSONL Line Types

Each line is an independent JSON object. The `type` field determines the line's purpose:

| Type | Purpose | Has parentUuid | Has message | Presentation-Relevant |
|------|---------|----------------|-------------|----------------------|
| `user` | User messages and tool results | Yes | Yes | Yes |
| `assistant` | Claude responses (one content block per line) | Yes | Yes | Yes |
| `system` | System events (turn_duration) | Yes | No | Maybe (timestamps) |
| `progress` | Hook progress notifications | Yes | No | No |
| `file-history-snapshot` | File state snapshots | No | No | No |
| `queue-operation` | Task queue events (enqueue/dequeue/remove) | No | No | No |

### Common Fields (on message-bearing lines)

```typescript
interface JSOLNLine {
  type: 'user' | 'assistant' | 'system' | 'progress' | 'file-history-snapshot' | 'queue-operation';
  uuid: string;              // Unique ID for this line
  parentUuid: string | null; // Previous line's UUID (null = root)
  isSidechain: boolean;      // True if this is a sidechain message
  sessionId: string;         // Session UUID (matches filename)
  timestamp: string;         // ISO 8601 timestamp (e.g., "2026-02-21T03:13:54.368Z")
  cwd: string;               // Working directory
  version: string;           // Claude Code version (e.g., "2.1.50")
  gitBranch: string;         // Current git branch
  userType: string;          // Always "external" in observed data
}
```

### CRITICAL: Assistant Message Splitting

**Assistant responses are split across multiple JSONL lines.** Each content block becomes its own line with:
- Its own unique `uuid`
- `parentUuid` pointing to the previous block's UUID
- The same `requestId` on all blocks from one response
- The same `message.id` (Anthropic message ID) on all blocks

Example of a single Claude response spanning 3 lines:
```
Line 1: { type: "assistant", uuid: "aaa", parentUuid: "user-uuid", content: [{ type: "thinking", thinking: "..." }], requestId: "req_123" }
Line 2: { type: "assistant", uuid: "bbb", parentUuid: "aaa",       content: [{ type: "text", text: "..." }],        requestId: "req_123" }
Line 3: { type: "assistant", uuid: "ccc", parentUuid: "bbb",       content: [{ type: "tool_use", ... }],             requestId: "req_123" }
```

**Implication for the stitcher:** To reconstruct a single "assistant turn," group consecutive assistant lines that share the same `requestId`. Each line's `message.content` array contains exactly one content block.

### Content Block Types

Found in `message.content` arrays:

| Block Type | Found In | Structure | Notes |
|------------|----------|-----------|-------|
| `text` | user, assistant | `{ type: "text", text: string }` | Main conversation content |
| `thinking` | assistant | `{ type: "thinking", thinking: string, signature: string }` | Claude's thinking (signature is opaque) |
| `tool_use` | assistant | `{ type: "tool_use", id: string, name: string, input: object, caller?: object }` | Tool invocation |
| `tool_result` | user | `{ type: "tool_result", tool_use_id: string, content: string, is_error: boolean }` | Tool response |
| `image` | user | `{ type: "image", source: { type: "base64", media_type: string, data: string } }` | Pasted images (base64) |

### User Message Variants

User message `content` can be either:
1. **String** -- plain text user input or system-generated content (commands, command results)
2. **Array** -- array of content blocks (text, tool_result, image)

Key user message fields:
- `isMeta: boolean` -- System-generated meta messages (command caveats, execution contexts). **Skip these for presentation.**
- `permissionMode: string` -- Present on real human-typed messages (e.g., "acceptEdits")
- `toolUseResult` -- Present on tool_result messages, contains richer structured result data
- `sourceToolAssistantUUID` -- Links tool_result back to the assistant message that made the tool_use

### System Messages

Only subtype observed: `turn_duration` with `durationMs` field. Useful for timestamp extraction but not directly presentable.

### Non-Message Lines (Skip During Parse)

- `file-history-snapshot`: No uuid/parentUuid, has `messageId` and `snapshot` with file backup data
- `queue-operation`: No uuid/parentUuid, has `operation` (enqueue/dequeue/remove) and optional `content`
- `progress`: Has uuid/parentUuid but contains hook progress data, not conversation content

### Identifying the First User Message for Snippet

Many sessions begin with a sequence of meta/command messages:
1. `progress` (hook_progress, SessionStart)
2. `user` [isMeta] (local-command-caveat)
3. `user` (/clear command)
4. `user` (local-command-stdout)
5. `user` (/gsd:command or actual user message)
6. `user` [isMeta] (execution_context injection)

**Strategy for "first user message" snippet:** Find the first `user` line where:
- `isMeta` is falsy
- `content` is a string that does NOT start with `<command-`, `<local-command`, `<execution_context>`
- OR `content` is an array containing a `text` block without those XML prefixes

### Statistics from Real Data

| Metric | Value |
|--------|-------|
| Total files across 6 projects | 64 |
| Total size | 119.9 MB |
| Average file size | 1.9 MB |
| Largest file | 9.3 MB |
| Lines per session (this project) | 72-807 |
| Null-parent (root) lines per file | Exactly 1 |
| Sidechain messages found | 0 (across all projects) |

## Architecture Patterns

### Recommended Project Structure
```
src/
  main/
    index.ts                    # Existing - add IPC handlers
    pipeline/
      discovery.ts              # Find JSONL files in a directory
      parser.ts                 # Read JSONL, extract lines, skip malformed
      stitcher.ts               # Resolve parentUuid chain, filter sidechains
      classifier.ts             # Classify tool calls as plumbing/narrative
      types.ts                  # Shared TypeScript interfaces
    storage/
      sessionStore.ts           # Persist sessions to app-local JSON
  preload/
    index.ts                    # Existing - add pipeline IPC bridge
  renderer/
    src/
      types/
        electron.d.ts           # Existing - extend with pipeline API
        pipeline.ts             # Pipeline data types for renderer
      stores/
        sessionStore.ts         # Zustand store for parsed sessions
```

### Pattern 1: Main Process Pipeline with IPC Bridge

**What:** All file I/O and parsing happens in the Electron main process. Results are sent to the renderer via IPC.
**When to use:** Always -- the renderer (Chromium) cannot access the filesystem directly.

```typescript
// main/pipeline/discovery.ts
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export async function discoverSessions(baseDir?: string): Promise<SessionFile[]> {
  const projectsDir = baseDir ?? join(homedir(), '.claude', 'projects');
  const projectFolders = await readdir(projectsDir);
  const sessions: SessionFile[] = [];

  for (const folder of projectFolders) {
    const folderPath = join(projectsDir, folder);
    const folderStat = await stat(folderPath);
    if (!folderStat.isDirectory()) continue;

    const files = await readdir(folderPath);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const filePath = join(folderPath, file);
      sessions.push({
        filePath,
        projectFolder: folder,
        sessionId: file.replace('.jsonl', ''),
      });
    }
  }
  return sessions;
}
```

### Pattern 2: Streaming JSONL Parser with Error Tolerance

**What:** Read JSONL line by line, parse each as JSON, skip malformed lines.
**When to use:** For all JSONL file reading.

```typescript
// main/pipeline/parser.ts
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export async function parseJSONLFile(filePath: string): Promise<ParseResult> {
  const lines: JsonlLine[] = [];
  const errors: ParseError[] = [];

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      lines.push(parsed);
    } catch (err) {
      errors.push({ lineNumber, error: String(err) });
    }
  }

  return { lines, errors, totalLines: lineNumber };
}
```

### Pattern 3: Reassemble Assistant Turns by requestId

**What:** Group consecutive assistant JSONL lines that share the same `requestId` into a single logical turn.
**When to use:** After parsing, before stitching the conversation chain.

```typescript
// After parsing, reassemble assistant turns
interface AssistantTurn {
  requestId: string;
  contentBlocks: ContentBlock[];
  // Use the FIRST line's parentUuid as this turn's parent
  parentUuid: string;
  // Use the LAST line's uuid as this turn's uuid (for child linking)
  uuid: string;
  timestamp: string;
}

function reassembleAssistantTurns(lines: JsonlLine[]): AssistantTurn[] {
  const turnMap = new Map<string, JsonlLine[]>();

  for (const line of lines) {
    if (line.type !== 'assistant') continue;
    const rid = line.requestId;
    if (!rid) continue;
    if (!turnMap.has(rid)) turnMap.set(rid, []);
    turnMap.get(rid)!.push(line);
  }

  // Each group's lines are already in order (parentUuid chain)
  return Array.from(turnMap.values()).map(group => ({
    requestId: group[0].requestId,
    contentBlocks: group.flatMap(l => l.message.content),
    parentUuid: group[0].parentUuid,
    uuid: group[group.length - 1].uuid,
    timestamp: group[0].timestamp,
  }));
}
```

### Pattern 4: ParentUuid Chain Walking

**What:** Build a lookup map of uuid -> message, then walk from root to build ordered sequence.
**When to use:** The stitcher phase.

```typescript
function stitchConversation(messages: Message[]): Message[] {
  const byUuid = new Map<string, Message>();
  const childOf = new Map<string, Message>(); // parentUuid -> child

  for (const msg of messages) {
    byUuid.set(msg.uuid, msg);
    if (msg.parentUuid) {
      childOf.set(msg.parentUuid, msg);
    }
  }

  // Find root (parentUuid === null)
  const root = messages.find(m => m.parentUuid === null);
  if (!root) return messages; // fallback: return as-is

  // Walk the chain
  const ordered: Message[] = [];
  let current: Message | undefined = root;
  while (current) {
    if (!current.isSidechain) {
      ordered.push(current);
    }
    current = childOf.get(current.uuid);
  }

  return ordered;
}
```

### Pattern 5: IPC Bridge (handle/invoke)

**What:** Expose pipeline functions to renderer via `ipcMain.handle` / `ipcRenderer.invoke`.
**When to use:** All main-to-renderer communication for this phase.

```typescript
// main/index.ts - Register IPC handlers
ipcMain.handle('pipeline:discoverSessions', async (_event, baseDir?: string) => {
  return discoverSessions(baseDir);
});

ipcMain.handle('pipeline:parseSession', async (_event, filePath: string) => {
  return parseSession(filePath);
});

ipcMain.handle('pipeline:browseDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Claude Projects Directory',
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// preload/index.ts - Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing APIs ...
  discoverSessions: (baseDir?: string) => ipcRenderer.invoke('pipeline:discoverSessions', baseDir),
  parseSession: (filePath: string) => ipcRenderer.invoke('pipeline:parseSession', filePath),
  browseDirectory: () => ipcRenderer.invoke('pipeline:browseDirectory'),
});
```

### Anti-Patterns to Avoid

- **Reading JSONL in the renderer process:** The renderer has no filesystem access. All file I/O must go through main process IPC.
- **Loading entire JSONL into memory as a single string then splitting:** Use readline streaming for memory safety.
- **Treating each JSONL line as a separate "message":** Assistant responses span multiple lines. Must reassemble by `requestId`.
- **Ignoring isMeta user messages:** These are system-generated (command caveats, execution contexts) and should be filtered from presentation.
- **Using parentUuid chain position for "first user message" snippet:** The chain starts with hook progress and meta messages. The snippet needs explicit filtering for human-authored content.
- **Assuming content is always an array:** User message `content` can be a plain string or an array of blocks. Must handle both.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line-by-line file reading | Custom line splitter | Node.js `readline` module | Handles backpressure, encoding, CRLF/LF, partial reads correctly |
| Directory picker dialog | Custom file browser | Electron `dialog.showOpenDialog` | Native OS dialog, accessible, handles edge cases |
| Home directory resolution | Hardcoded paths | `os.homedir()` / `app.getPath('home')` | Cross-platform, handles different OS conventions |
| JSON file persistence | Custom serialization | Simple `readFileSync`/`writeFileSync` + `JSON.parse`/`JSON.stringify` | Matches Phase 1 pattern, sufficient for data volumes |
| UUID generation | Custom ID scheme | Crypto `randomUUID()` or reuse session UUIDs | Standard, collision-free |

**Key insight:** The entire data pipeline can be built with Node.js built-ins. No new npm dependencies are needed for this phase.

## Common Pitfalls

### Pitfall 1: Treating Each JSONL Line as a Separate Message
**What goes wrong:** Each JSONL line gets rendered as its own message bubble, resulting in thinking blocks, text, and tool calls appearing as separate "messages" instead of one coherent assistant response.
**Why it happens:** The JSONL format splits assistant responses into one-line-per-content-block. A single "Claude says X and calls tool Y" turn produces 2-3 lines.
**How to avoid:** Group consecutive assistant lines by `requestId` before creating the message model. Each unique `requestId` is one assistant turn.
**Warning signs:** Thinking blocks appearing as standalone messages; text and tool_use from the same response appearing separately.

### Pitfall 2: User Content Type Assumption
**What goes wrong:** Code assumes `message.content` is always an array, then crashes on plain-string user messages.
**Why it happens:** User messages have two formats: string (plain text, commands) and array (structured content blocks like tool_results).
**How to avoid:** Always check `typeof content === 'string'` before treating it as an array. Normalize both to a common format early in the pipeline.
**Warning signs:** TypeError when accessing `.map()` or `.forEach()` on user message content.

### Pitfall 3: Ignoring Non-Message Lines During Chain Walking
**What goes wrong:** The parentUuid chain breaks because `file-history-snapshot` and `queue-operation` lines don't participate in the chain but are interspersed in the file.
**Why it happens:** These line types lack `uuid`/`parentUuid` fields entirely. They're metadata about the session, not conversation messages.
**How to avoid:** Filter lines by type before building the UUID chain. Only include `user`, `assistant`, `system`, and `progress` types.
**Warning signs:** Missing links in parentUuid chain; orphaned messages.

### Pitfall 4: File Encoding Issues on Windows
**What goes wrong:** JSONL files with unicode content fail to parse on Windows due to default codepage (cp1252) instead of UTF-8.
**Why it happens:** Node.js `fs` defaults vary by platform. JSONL files from Claude Code are always UTF-8.
**How to avoid:** Always specify `encoding: 'utf-8'` when creating read streams or reading files.
**Warning signs:** `UnicodeDecodeError` or garbled text in parsed messages.

### Pitfall 5: Meta Messages Polluting the Presentation
**What goes wrong:** System-generated messages like `<local-command-caveat>` and `<command-name>/clear</command-name>` appear in the presentation.
**Why it happens:** These lines have `type: "user"` but are machine-generated scaffolding around actual human input.
**How to avoid:** Filter out lines where `isMeta === true`. Also filter user messages whose string content starts with `<command-name>`, `<local-command`, or `<command-message>`.
**Warning signs:** XML-tagged system messages appearing in the conversation view.

### Pitfall 6: Blocking the Main Process During Large File Parse
**What goes wrong:** The Electron main process becomes unresponsive while parsing a large JSONL file (9+ MB).
**Why it happens:** `for await` with readline is async but still runs on the main thread's event loop.
**How to avoid:** The readline streaming approach yields to the event loop between lines, which is sufficient for observed file sizes (max 9.3 MB, ~800 lines). If performance becomes an issue, consider web workers or batched processing. For now, streaming readline is adequate.
**Warning signs:** UI freezing during session parsing.

### Pitfall 7: Assuming isSidechain Will Be Encountered
**What goes wrong:** Spending development time on sidechain handling without real test data.
**Why it happens:** The field exists in the schema but no sidechain messages were found in 64 files across 6 projects.
**How to avoid:** Implement sidechain filtering (check `isSidechain === true`), but don't over-engineer. A simple filter during chain walking is sufficient.
**Warning signs:** None -- just keep the implementation simple.

## Code Examples

### Complete Session Metadata Extraction

```typescript
// Source: Verified against real JSONL files on disk

interface SessionMetadata {
  sessionId: string;
  projectFolder: string;
  filePath: string;
  firstTimestamp: string | null;
  firstUserMessage: string | null;
  messageCount: number;
  parseError: string | null;
}

async function extractSessionMetadata(
  filePath: string,
  projectFolder: string
): Promise<SessionMetadata> {
  const sessionId = path.basename(filePath, '.jsonl');
  let firstTimestamp: string | null = null;
  let firstUserMessage: string | null = null;
  let messageCount = 0;

  try {
    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);

        // Track earliest timestamp
        if (parsed.timestamp) {
          if (!firstTimestamp || parsed.timestamp < firstTimestamp) {
            firstTimestamp = parsed.timestamp;
          }
        }

        // Count presentation-relevant messages
        if (parsed.type === 'user' || parsed.type === 'assistant') {
          messageCount++;
        }

        // Find first meaningful user message for snippet
        if (!firstUserMessage && parsed.type === 'user' && !parsed.isMeta) {
          const content = parsed.message?.content;
          if (typeof content === 'string') {
            if (!content.startsWith('<command-') &&
                !content.startsWith('<local-command') &&
                !content.startsWith('<command-message>') &&
                content.trim()) {
              firstUserMessage = content.slice(0, 150);
            }
          } else if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' &&
                  !block.text.startsWith('<command-') &&
                  !block.text.startsWith('<local-command') &&
                  !block.text.startsWith('<objective>') &&
                  !block.text.startsWith('<execution_context>') &&
                  block.text.trim()) {
                firstUserMessage = block.text.slice(0, 150);
                break;
              }
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    return {
      sessionId,
      projectFolder,
      filePath,
      firstTimestamp,
      firstUserMessage,
      messageCount,
      parseError: null,
    };
  } catch (err) {
    return {
      sessionId,
      projectFolder,
      filePath,
      firstTimestamp: null,
      firstUserMessage: null,
      messageCount: 0,
      parseError: String(err),
    };
  }
}
```

### Tool Call Classification

```typescript
// Source: Verified against CONTEXT.md locked decisions

type ToolVisibility = 'plumbing' | 'narrative' | 'unknown';

const PLUMBING_TOOLS = new Set([
  'Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash',
]);

const NARRATIVE_TOOLS = new Set([
  'AskUserQuestion', 'TaskCreate', 'TaskUpdate', 'TaskList',
]);

function classifyToolCall(toolName: string): ToolVisibility {
  if (PLUMBING_TOOLS.has(toolName)) return 'plumbing';
  if (NARRATIVE_TOOLS.has(toolName)) return 'narrative';
  return 'unknown'; // Unknown tools default to shown (safe default)
}

// For WebSearch and WebFetch tools not in the classification lists,
// default to 'unknown' which should show by default (safe behavior).
```

### App-Local Storage Pattern

```typescript
// Source: Matches Phase 1 JSON file persistence pattern from main/index.ts

import { app } from 'electron';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SESSIONS_PATH = join(app.getPath('userData'), 'sessions.json');

interface StoredSession {
  sessionId: string;
  projectFolder: string;
  originalFilePath: string;
  messages: ParsedMessage[];
  metadata: SessionMetadata;
  addedAt: number; // timestamp when added to presentation
}

function loadStoredSessions(): StoredSession[] {
  try {
    return JSON.parse(readFileSync(SESSIONS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveStoredSessions(sessions: StoredSession[]): void {
  mkdirSync(join(app.getPath('userData')), { recursive: true });
  writeFileSync(SESSIONS_PATH, JSON.stringify(sessions, null, 2), 'utf-8');
}
```

### Default Directory Path Resolution

```typescript
// Source: Verified against real ~/.claude/projects/ structure

import { homedir } from 'os';
import { join } from 'path';

function getDefaultProjectsDir(): string {
  return join(homedir(), '.claude', 'projects');
}

// Project folder names encode the original path:
// D:\Code\PromptPlayer -> D--Code-PromptPlayer
// The encoding replaces \ and : with -
// Case is NOT consistent (D--Code-PromptPlayer vs d--Code-JAD)
function decodeProjectFolder(encoded: string): string {
  // Best-effort decode: replace -- with :\, - with \
  // This is approximate; display the encoded name and let users recognize it
  return encoded;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| electron-store for persistence | JSON file read/write | Phase 1 (electron-store ESM incompatibility) | Use simple JSON files, no store library |
| ipcMain.on + event.sender.send | ipcMain.handle + ipcRenderer.invoke | Electron 7+ (2019) | Promise-based IPC, cleaner async patterns |
| fs.readFileSync for JSONL | readline + createReadStream | Always available | Streaming prevents memory issues with large files |

**Deprecated/outdated:**
- `electron-store`: ESM-only in v11+, incompatible with electron-vite 3.x CJS output. Use JSON files.
- `ipcMain.on` for request-response: Use `ipcMain.handle`/`ipcRenderer.invoke` for Promise-based patterns.

## Open Questions

1. **Sidechain message behavior**
   - What we know: The `isSidechain` field exists on all message lines. No sidechain messages were found across 64 files in 6 projects.
   - What's unclear: When exactly are messages marked as sidechains? Possibly during retries or message editing.
   - Recommendation: Implement simple `isSidechain === true` filtering. Mark branch points by checking if any line has the same parentUuid as another non-sidechain line. Do not over-engineer.

2. **Subagent JSONL files**
   - What we know: Some sessions have `{sessionId}/subagents/agent-{taskId}.jsonl` files. These contain sub-conversations spawned by the Task tool.
   - What's unclear: Whether these should be surfaced in the browse list or folded into the parent session.
   - Recommendation: For Phase 2, discover only top-level `.jsonl` files. Subagent files are an advanced feature that can be addressed later.

3. **First user message snippet reliability**
   - What we know: Many sessions start with `/command` invocations, meaning the first non-meta user message is a response to a system prompt, not the session's "topic."
   - What's unclear: Whether the command args (e.g., `gsd:discuss-phase 2`) would be more informative than the first human message.
   - Recommendation: Show the first non-meta, non-command user text as the snippet. It won't always be perfect, but it's the most reliable heuristic. Show message count alongside it for additional context.

4. **Performance with many projects**
   - What we know: 64 files across 6 projects totaling 120 MB. Metadata extraction (first pass) doesn't need to parse all content.
   - What's unclear: How the app performs with hundreds of sessions.
   - Recommendation: Build a two-phase approach: (1) fast metadata scan on discover (read only first ~50 lines per file for snippet), (2) full parse only when a session is selected for preview.

## Sources

### Primary (HIGH confidence)
- Real JSONL files from `~/.claude/projects/D--Code-PromptPlayer/` -- 6 files, 1,630 lines analyzed
- Real JSONL files from 5 additional projects -- 58 files, cross-referenced schema
- Electron API documentation (dialog, app.getPath) -- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- Existing Phase 1 codebase (`src/main/index.ts`, `src/preload/index.ts`, `src/renderer/src/stores/appStore.ts`)

### Secondary (MEDIUM confidence)
- Electron IPC patterns -- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
- Node.js readline documentation -- built-in, well-established API

### Tertiary (LOW confidence)
- Performance estimates for large file counts -- based on extrapolation from observed data, not load-tested

## Metadata

**Confidence breakdown:**
- JSONL schema: HIGH -- verified against 64 real files across 6 projects
- Standard stack: HIGH -- all Node.js built-ins, no new dependencies
- Architecture patterns: HIGH -- straightforward pipeline, follows established Electron patterns
- Pitfalls: HIGH -- discovered from real data analysis (content type variance, meta messages, encoding)
- Performance: MEDIUM -- adequate for observed data volumes, untested at scale

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- JSONL format unlikely to change rapidly)
