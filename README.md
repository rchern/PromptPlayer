# PromptPlayer

Turn your Claude Code sessions into step-through presentation demos.

PromptPlayer is a Windows desktop app with two modes: **Builder** for importing and curating conversations, and **Player** for presenting them step by step — perfect for walking your team through a real Claude Code workflow.

## Features

### Builder Mode
- Import Claude Code JSONL conversation files from `.claude/projects/`
- Browse, search, and filter sessions by project, date, or content
- Assemble multi-session presentations with named sections
- Configure tool call visibility, timestamps, and light/dark theme
- Export self-contained `.promptplay` files (re-editable)

### Player Mode
- Step through messages with keyboard (arrow keys, spacebar) or mouse
- Markdown rendering with syntax highlighting
- Specialized display for AskUserQuestion prompts and Task management calls
- Seamless multi-session transitions with section sidebar and progress bar
- Elapsed time markers between messages
- Light and dark themes optimized for screen sharing

## Getting Started

1. Download the latest installer from [Releases](../../releases/latest)
2. Launch PromptPlayer and choose **Builder** mode
3. Import your Claude Code conversation files (`.jsonl` from `~/.claude/projects/`)
4. Arrange sessions into a presentation, configure settings, and export as `.promptplay`
5. Open the `.promptplay` file in **Player** mode to present

## System Requirements

- Windows 10 or 11
- `.promptplay` files can be opened directly via double-click after installation

## Tech Stack

Electron · React · TypeScript · electron-vite · Zustand · shiki

## License

[MIT](LICENSE)
