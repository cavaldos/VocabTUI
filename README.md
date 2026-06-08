# VocabTUI

**Vocabulary Learning TUI** — A terminal-based English vocabulary learning app built with **OpenTUI** + **React** + **Bun**.

## 🚀 System Requirements

- [Bun](https://bun.sh) >= 1.x (runtime + package manager)
- macOS / Linux / Windows (WSL)

## 📦 Installation

```bash
# Clone the repository
git clone <repo-url>
cd VocabTUI

# Install dependencies
bun install
```

## ▶️ Run the App

```bash
# Development mode (watch — auto-restart on changes)
bun run dev
```

Or run directly:

```bash
bun src/index.tsx
```

## 🎮 Usage

### Browse Mode (default)
- **Type** to search vocabulary (by word, meaning, synonyms, etc.)
- **← / →** to switch level filter (New, L1 → L5)
- **↑ / ↓** to select a word from the list
- **Enter** — (reserved)

### Guess Mode
- **Ctrl + G** — toggle guess mode
- See the Vietnamese meaning, type the corresponding English word
- **Enter** — check your answer
- **↑ / ↓** — navigate between words
- **← / →** — filter by level

### Other
- **Ctrl + T** — toggle transparent background mode
- **Ctrl + C** — quit

## 🏗️ Build

### Run directly (no build step needed)

Bun runs TypeScript directly, no separate build step required:

```bash
bun src/index.tsx
```

### Build as standalone binary

Bun can **compile** the entire app + runtime into a single binary file. It runs standalone — no Bun or node_modules needed.

```bash
# Build for the current machine
bun build --compile ./src/index.tsx --outfile vocabtui

# Run the binary
./vocabtui
```

```bash
bun run build
```

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Runtime | Bun |
| UI Framework | [OpenTUI](https://github.com/opentui/opentui) v0.3.2 |
| Terminal Render | [Ink](https://github.com/vadimdemedes/ink) v7 |
| React | React 19 |

## 📄 License

MIT
