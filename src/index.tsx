import { createCliRenderer, TextAttributes } from "@opentui/core"
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react"
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import rawWords from "../data.json"

// ─── Types ────────────────────────────────────────────────────────────────────

type WordEntry = {
  id: string
  word: string
  meaning: string
  type: string
  example: string
  pronounce: string
  level: string
  spacedTime: string
  synonyms: string[]
  relatedForms: string[]
}

const WORDS = rawWords as WordEntry[]

// ─── Mode Context ──────────────────────────────────────────────────────────────

const ModeContext = createContext<"browse" | "guess">("browse")

function useAppMode() {
  return useContext(ModeContext)
}

// ─── Theme Context ─────────────────────────────────────────────────────────────

const ThemeContext = createContext<{ transparent: boolean }>({ transparent: false })

function useTheme() {
  return useContext(ThemeContext)
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const { transparent } = useTheme()
  const mode = useAppMode()
  return (
    <box
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        height: 1,
        paddingLeft: 1,
        paddingRight: 1,
        backgroundColor: transparent ? "transparent" : "#1a1717",
        borderStyle: "single",
        borderColor: "#2a2525",
      }}
    >
      <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
        <text attributes={TextAttributes.BOLD} fg="#f1eced">vocab</text>
        <text fg="#656363">│</text>
        {mode === "guess" ? (
          <text fg="#e0af68" attributes={TextAttributes.BOLD}>⍰ guess mode</text>
        ) : (
          <text fg="#cfc3c3">personal dictionary</text>
        )}
        <text fg="#656363">·</text>
        <text fg="#8a8585">{WORDS.length} words</text>
      </box>
      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg={transparent ? "#7aa2f7" : "#9ece6a"}>
          {transparent ? "◐ transparent" : "● ready"}
        </text>
        <text fg="#656363">│</text>
        <text fg="#8a8585">[ctrl+c] quit</text>
      </box>
    </box>
  )
}

// ─── Search + Level Filter ─────────────────────────────────────────────────────

const LEVELS = [
  { key: "", label: "New", color: "#656363" },
  { key: "L1", label: "L1", color: "#f7768e" },
  { key: "L2", label: "L2", color: "#e0af68" },
  { key: "L3", label: "L3", color: "#7aa2f7" },
  { key: "L4", label: "L4", color: "#9ece6a" },
  { key: "L5", label: "L5", color: "#bb9af7" },
]

function SearchBar({ value, resultCount }: { value: string; resultCount: number }) {
  const { transparent } = useTheme()
  return (
    <box
      title=" search "
      style={{
        flexDirection: "column",
        borderStyle: "single",
        borderColor: value.length > 0 ? "#7aa2f7" : "#2a2525",
        backgroundColor: transparent ? "transparent" : "#1a1717",
        paddingLeft: 1,
        paddingRight: 1,
        height: 3,
      }}
    >
      <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
        <text fg="#7aa2f7" attributes={TextAttributes.BOLD}>⌕</text>
        <text fg={value.length > 0 ? "#f1eced" : "#4a4545"}>
          {value.length > 0 ? value : "type to search ..."}
        </text>
        <text fg="#656363">{resultCount > 0 ? `${resultCount} results` : ""}</text>
      </box>
    </box>
  )
}

function LevelFilter({ selected, counts }: { selected: string; counts: Record<string, number> }) {
  const { transparent } = useTheme()
  return (
    <box
      title=" spaced time "
      style={{
        flexDirection: "row",
        borderStyle: "single",
        borderColor: "#2a2525",
        backgroundColor: transparent ? "transparent" : "#1a1717",
        paddingLeft: 1,
        paddingRight: 1,
        height: 3,
        alignItems: "center",
        gap: 1,
      }}
    >
      {LEVELS.map((level) => {
        const key = level.key
        const isSelected = selected === key
        const count = counts[key] || 0
        return (
          <box key={key} style={{ flexDirection: "row", gap: 0 }}>
            <text
              fg={isSelected ? level.color : "#4a4545"}
              attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
            >{isSelected ? "● " : "○ "}{level.label}</text>
            <text fg={isSelected ? level.color : "#656363"}> {count}</text>
          </box>
        )
      })}
      <text fg="#656363">│</text>
      <text fg="#8a8585">[← →] level  [↑ ↓] word  [enter] view</text>
    </box>
  )
}

// ─── Metadata Panel (bottom-left) ─────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    A1: "#9ece6a", A2: "#9ece6a",
    B1: "#e0af68", B2: "#e0af68",
    C1: "#f7768e", C2: "#f7768e",
  }
  const color = colorMap[level] || "#656363"
  return <text fg={color} attributes={TextAttributes.BOLD}>{level || "—"}</text>
}

function SpacedBadge({ spacedTime }: { spacedTime: string }) {
  const colorMap: Record<string, string> = {
    L1: "#f7768e", L2: "#e0af68",
    L3: "#7aa2f7", L4: "#9ece6a", L5: "#bb9af7",
  }
  const color = colorMap[spacedTime] || "#656363"
  return <text fg={color} attributes={TextAttributes.BOLD}>{spacedTime || "New"}</text>
}

function MetadataPanel({ word }: { word: WordEntry | null }) {
  const { transparent } = useTheme()
  if (!word) {
    return (
      <box
        title="details"
        style={{
          flexGrow: 1,
          flexDirection: "column",
          borderStyle: "single",
          borderColor: "#2a2525",
          backgroundColor: transparent ? "transparent" : "#141111",
          paddingLeft: 1,
          paddingRight: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <text fg="#4a4545" attributes={TextAttributes.DIM}>── select a word to view details ──</text>
      </box>)
  }

  return (
    <box title="details" style={{
      flexGrow: 1,
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "#7aa2f7",
      backgroundColor: transparent ? "transparent" : "#141111",
      paddingLeft: 1,
      paddingRight: 1,
    }}>
      <box style={{ flexDirection: "column", marginBottom: 1, paddingTop: 1 }}>
        <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
          <text fg="#f1eced" attributes={TextAttributes.BOLD}>{word.word}</text>
          <text fg="#656363">·</text>
          <text fg="#bb9af7">{word.type}</text>
        </box>
        {word.pronounce
          ? (<text fg="#8a8585">{word.pronounce}</text>)
          : (<text fg="#4a4545" attributes={TextAttributes.DIM}>—</text>)}
      </box>

      <box style={{
        flexDirection: "column",
        borderStyle: "single",
        borderColor: "#2a2525",
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
      }}>
        <text fg="#8a8585" attributes={TextAttributes.BOLD}>Meaning</text>
        <text fg="#9ece6a" attributes={TextAttributes.BOLD}>{word.meaning}</text>
      </box>

      <box style={{
        flexDirection: "column",
        borderStyle: "single",
        borderColor: "#2a2525",
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
      }}>
        <text fg="#8a8585" attributes={TextAttributes.BOLD}>Example</text>
        <text fg="#cfc3c3" attributes={TextAttributes.ITALIC}>{word.example || "—"}</text>
      </box>

      <box style={{ flexDirection: "row", gap: 2, marginBottom: 1 }}>
        <box style={{
          flexDirection: "column",
          borderStyle: "single",
          borderColor: "#2a2525",
          paddingLeft: 1,
          paddingRight: 1,
          flexGrow: 1,
        }}>
          <text fg="#8a8585" attributes={TextAttributes.BOLD}>Level</text>
          <LevelBadge level={word.level} />
        </box>
        <box style={{
          flexDirection: "column",
          borderStyle: "single",
          borderColor: "#2a2525",
          paddingLeft: 1,
          paddingRight: 1,
          flexGrow: 1,
        }}>
          <text fg="#8a8585" attributes={TextAttributes.BOLD}>SRS</text>
          <SpacedBadge spacedTime={word.spacedTime} />
        </box>
      </box>

      <box style={{
        flexDirection: "column",
        borderStyle: "single",
        borderColor: "#2a2525",
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
      }}>
        <text fg="#8a8585" attributes={TextAttributes.BOLD}>Synonyms</text>
        {word.synonyms.length > 0
          ? <text fg="#e0af68">{word.synonyms.join(", ")}</text>
          : <text fg="#4a4545" attributes={TextAttributes.DIM}>—</text>}
      </box>

      <box style={{
        flexDirection: "column",
        borderStyle: "single",
        borderColor: "#2a2525",
        paddingLeft: 1,
        paddingRight: 1,
      }}>
        <text fg="#8a8585" attributes={TextAttributes.BOLD}>Variants</text>
        {word.relatedForms.length > 0
          ? <text fg="#7aa2f7">{word.relatedForms.join(", ")}</text>
          : <text fg="#4a4545" attributes={TextAttributes.DIM}>—</text>}
      </box>
    </box>)
}

// ─── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({
  words,
  selectedIdx,
}: {
  words: WordEntry[]
  selectedIdx: number
}) {
  const { transparent } = useTheme()
  const scrollRef = useRef<any>(null)

  useEffect(() => {
    const selectedWord = words[selectedIdx]
    if (selectedIdx >= 0 && selectedWord) {
      scrollRef.current?.scrollChildIntoView?.("word-" + selectedWord.id)
    }
  }, [selectedIdx, words])

  return (
    <box
      title={` words (${words.length}) `}
      style={{
        width: 38,
        flexDirection: "column",
        borderStyle: "single",
        borderColor: "#2a2525",
        backgroundColor: transparent ? "transparent" : "#0f0d0d",
      }}
    >
      <scrollbox
        ref={scrollRef}
        style={{
          flexGrow: 1,
          rootOptions: { backgroundColor: transparent ? "transparent" : "#0f0d0d" },
          scrollbarOptions: {
            showArrows: false,
            trackOptions: { foregroundColor: "#656363", backgroundColor: transparent ? "transparent" : "#1a1717" },
          },
        }}
      >
        {words.length === 0 ? (
          <box style={{ flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
            <text fg="#4a4545" attributes={TextAttributes.DIM}>── no words ──</text>
          </box>
        ) : (
          words.map((w, i) => (
            <box
              key={w.id}
              id={"word-" + w.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingLeft: 1,
                paddingRight: 1,
                backgroundColor: transparent ? "transparent" : (i === selectedIdx ? "#2a2525" : "transparent"),
              }}
            >
              <box style={{ flexDirection: "column" }}>
                <box style={{ flexDirection: "row", gap: 1 }}>
                  <text
                    fg={i === selectedIdx ? "#f1eced" : "#cfc3c3"}
                    attributes={i === selectedIdx ? TextAttributes.BOLD : TextAttributes.NONE}
                  >
                    {i === selectedIdx ? "● " : "○ "}{w.word}
                  </text>
                  <text fg="#bb9af7">{w.type}</text>
                </box>
                <text fg="#8a8585">{w.meaning}</text>
              </box>
              <box style={{ flexDirection: "column", alignItems: "flex-end" }}>
                <LevelBadge level={w.level} />
                <SpacedBadge spacedTime={w.spacedTime} />
              </box>
            </box>
          ))
        )}
      </scrollbox>
    </box>
  )
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar({ selected, total }: { selected: WordEntry | null; total: number }) {
  const { transparent } = useTheme()
  return (
    <box
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        height: 1,
        paddingLeft: 1,
        paddingRight: 1,
        backgroundColor: transparent ? "transparent" : "#1a1717",
        borderStyle: "single",
        borderColor: "#2a2525",
      }}
    >
      <box style={{ flexDirection: "row", gap: 2 }}>
        {selected ? (
          <>
            <text fg="#9ece6a">● {selected.word}</text>
            <text fg="#656363">·</text>
            <text fg="#cfc3c3">{selected.meaning}</text>
          </>
        ) : (
          <text fg="#656363" attributes={TextAttributes.DIM}>── no word selected ──</text>
        )}
      </box>
      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg="#8a8585">{total} words</text>
        <text fg="#656363">│</text>
        <text fg="#8a8585">[← →] level  [↑ ↓] word  [enter] view</text>
        <text fg="#656363">│</text>
        <text fg="#8a8585">[ctrl+g] guess</text>
        <text fg="#656363">│</text>
        <text fg="#8a8585">[ctrl+t] transparent</text>
        <text fg="#656363">│</text>
        <text fg="#8a8585">[ctrl+c] quit</text>
      </box>
    </box>
  )
}

// ─── Mask helpers ──────────────────────────────────────────────────────────────

function maskWord(word: string): string {
  return word
    .split(" ")
    .map((part) => part[0] + "_".repeat(Math.max(0, part.length - 1)))
    .join(" ")
}

// ─── Guess Mode ────────────────────────────────────────────────────────────────

function GuessMode({
  word,
  onNext,
  onPrev,
  onExit,
  selectedLevel,
  onLevelChange,
  counts,
}: {
  word: WordEntry | null
  onNext: () => void
  onPrev: () => void
  onExit: () => void
  selectedLevel: string
  onLevelChange: (level: string) => void
  counts: Record<string, number>
}) {
  const { transparent } = useTheme()
  const [guess, setGuess] = useState("")
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle")

  useEffect(() => {
    setGuess("")
    setResult("idle")
  }, [word])

  useKeyboard((key) => {
    if (key.ctrl && key.name === "g") {
      onExit()
      return
    }
    if (key.name === "escape") {
      onExit()
      return
    }
    if (key.name === "up") {
      onPrev()
      return
    }
    if (key.name === "down") {
      onNext()
      return
    }
    if (key.name === "left") {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const prev = idx > 0 ? idx - 1 : LEVELS.length - 1
      onLevelChange(LEVELS[prev]?.key ?? "")
      return
    }
    if (key.name === "right") {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const next = idx < LEVELS.length - 1 ? idx + 1 : 0
      onLevelChange(LEVELS[next]?.key ?? "")
      return
    }
    if (key.name === "backspace") {
      setGuess((g) => g.slice(0, -1))
      setResult("idle")
      return
    }
    if (key.name === "return") {
      if (result === "correct" || result === "wrong") {
        setGuess("")
        setResult("idle")
      } else {
        setResult(
          guess.trim().toLowerCase() === (word?.word ?? "").toLowerCase() ? "correct" : "wrong"
        )
      }
      return
    }
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setGuess((g) => (g + key.sequence!).slice(0, 50))
      setResult("idle")
    }
  })

  if (!word) return null

  return (
    <box
      style={{
        flexDirection: "column",
        flexGrow: 1,
        backgroundColor: transparent ? "transparent" : "#0a0808",
      }}
    >
      <box title=" spaced time " style={{
        flexDirection: "row",
        borderStyle: "single",
        borderColor: "#2a2525",
        backgroundColor: transparent ? "transparent" : "#1a1717",
        paddingLeft: 1,
        paddingRight: 1,
        height: 3,
        alignItems: "center",
        gap: 1,
      }}>
        {LEVELS.map((level) => {
          const key = level.key
          const isSelected = selectedLevel === key
          const count = counts[key] || 0
          return (
            <box key={key} style={{ flexDirection: "row", gap: 0 }}>
              <text
                fg={isSelected ? level.color : "#4a4545"}
                attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
              >{isSelected ? "● " : "○ "}{level.label}</text>
              <text fg={isSelected ? level.color : "#656363"}> {count}</text>
            </box>
          )
        })}
        <text fg="#656363">│</text>
        <text fg="#8a8585">[← →] level  [↑ ↓] word  [enter] check  [ctrl+g] quit</text>
      </box>

      <box style={{
        flexDirection: "column",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <box style={{
          flexDirection: "column",
          borderStyle: "single",
          borderColor: result === "correct" ? "#9ece6a" : result === "wrong" ? "#f7768e" : "#7aa2f7",
          backgroundColor: transparent ? "transparent" : "#141111",
          paddingLeft: 3,
          paddingRight: 3,
          paddingTop: 2,
          paddingBottom: 2,
          width: 60,
        }}>
          <box style={{ flexDirection: "column", alignItems: "center", marginBottom: 1 }}>
            <text fg="#8a8585" attributes={TextAttributes.BOLD}>Meaning</text>
            <text fg="#9ece6a" attributes={TextAttributes.BOLD}>{word.meaning}</text>
          </box>

          <box style={{ flexDirection: "column", alignItems: "center", marginBottom: 1 }}>
            <text fg="#8a8585" attributes={TextAttributes.BOLD}>Word</text>
            <text fg="#f1eced" attributes={TextAttributes.BOLD}>{maskWord(word.word)}</text>
          </box>

          {word.type && (
            <box style={{ flexDirection: "column", alignItems: "center", marginBottom: 1 }}>
              <text fg="#8a8585" attributes={TextAttributes.BOLD}>Type</text>
              <text fg="#bb9af7" attributes={TextAttributes.BOLD}>{word.type}</text>
            </box>
          )}

          <box style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            marginTop: 1,
            marginBottom: 1,
          }}>
            <text fg="#656363">›</text>
            <text fg={guess.length > 0 ? "#f1eced" : "#4a4545"}>
              {guess.length > 0 ? guess : "type the English word ..."}
            </text>
          </box>

          {result === "correct" && (
            <box style={{ flexDirection: "row", justifyContent: "center" }}>
              <text fg="#9ece6a" attributes={TextAttributes.BOLD}>✓ Correct!</text>
            </box>
          )}
          {result === "wrong" && (
            <box style={{ flexDirection: "column", alignItems: "center" }}>
              <text fg="#f7768e" attributes={TextAttributes.BOLD}>✗ Wrong</text>
              <text fg="#e0af68">→ {word.word}</text>
            </box>
          )}

          <box style={{ flexDirection: "row", justifyContent: "center", marginTop: 1 }}>
            <text fg="#656363">[← →] level  [↑ ↓] select  [enter] check  [ctrl+g] quit</text>
          </box>
        </box>
      </box>
    </box>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────

function App() {
  const { width, height } = useTerminalDimensions()
  const [transparent, setTransparent] = useState(false)
  const [mode, setMode] = useState<"browse" | "guess">("browse")
  const [query, setQuery] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [viewedWord, setViewedWord] = useState<WordEntry | null>(null)

  const words = useMemo(() => {
    const byLevel = WORDS.filter((w) => w.spacedTime === selectedLevel)
    if (!query.trim()) return byLevel
    const q = query.toLowerCase()
    return byLevel.filter(
      (w) =>
        String(w.word).toLowerCase().includes(q) ||
        String(w.meaning).toLowerCase().includes(q) ||
        w.synonyms.some((s) => String(s).toLowerCase().includes(q)) ||
        w.relatedForms.some((r) => String(r).toLowerCase().includes(q))
    )
  }, [selectedLevel, query])

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const level of LEVELS) {
      counts[level.key] = WORDS.filter((w) => w.spacedTime === level.key).length
    }
    return counts
  }, [])

  const selectWord = (w: WordEntry) => {
    setViewedWord(w)
  }

  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      renderer.destroy()
      process.exit(0)
    }

    if (key.ctrl && key.name === "t") {
      setTransparent((t) => !t)
      return
    }

    if (key.ctrl && key.name === "g") {
      if (mode === "guess") return
      setMode("guess")
      return
    }

    if (mode === "guess") return

    if (key.name === "backspace") {
      setQuery((q) => q.slice(0, -1))
      setSelectedIdx(0)
      return
    }

    if (key.name === "escape") {
      setQuery("")
      setSelectedIdx(0)
      return
    }

    if (key.name === "up") {
      setSelectedIdx((i) => Math.max(0, i - 1))
      return
    }

    if (key.name === "down") {
      setSelectedIdx((i) => Math.min(words.length - 1, i + 1))
      return
    }

    if (key.name === "left") {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const prev = idx > 0 ? idx - 1 : LEVELS.length - 1
      setSelectedLevel(LEVELS[prev]?.key ?? "")
      setSelectedIdx(0)
      return
    }

    if (key.name === "right") {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const next = idx < LEVELS.length - 1 ? idx + 1 : 0
      setSelectedLevel(LEVELS[next]?.key ?? "")
      setSelectedIdx(0)
      return
    }

    if (key.name === "tab" && !key.shift) {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const next = idx < LEVELS.length - 1 ? idx + 1 : 0
      setSelectedLevel(LEVELS[next]?.key ?? "")
      setSelectedIdx(0)
      return
    }

    if (key.name === "tab" && key.shift) {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const prev = idx > 0 ? idx - 1 : LEVELS.length - 1
      setSelectedLevel(LEVELS[prev]?.key ?? "")
      setSelectedIdx(0)
      return
    }

    if (key.name === "return") {
      const target = words[selectedIdx]
      if (target) selectWord(target)
      return
    }

    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setQuery((q) => (q + key.sequence!).slice(0, 50))
      setSelectedIdx(0)
    }
  })

  const contentHeight = useMemo(() => Math.max(10, height - 2), [height])

  const previewWord = useMemo((): WordEntry | null => {
    if (words.length > 0) return words[selectedIdx] ?? words[0] ?? null
    return viewedWord
  }, [words, selectedIdx, viewedWord])

  return (
    <ThemeContext.Provider value={{ transparent }}>
      <ModeContext.Provider value={mode}>
        <box
          style={{
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: transparent ? "transparent" : "#0a0808",
          }}
        >
          <Header />
          {mode === "guess" ? (
            <box style={{ flexDirection: "column", flexGrow: 1, height: contentHeight, width }}>
              <GuessMode
                word={previewWord}
                onNext={() => setSelectedIdx((i) => Math.min(words.length - 1, i + 1))}
                onPrev={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                onExit={() => setMode("browse")}
                selectedLevel={selectedLevel}
                onLevelChange={(level) => { setSelectedLevel(level); setSelectedIdx(0) }}
                counts={levelCounts}
              />
            </box>
          ) : (
            <box
              style={{
                flexDirection: "column",
                flexGrow: 1,
                height: contentHeight,
                width,
              }}
            >
              <SearchBar value={query} resultCount={words.length} />
              <LevelFilter selected={selectedLevel} counts={levelCounts} />
              <box
                style={{
                  flexDirection: "row",
                  flexGrow: 1,
                }}
              >
                <MetadataPanel word={previewWord} />
                <ResultsPanel words={words} selectedIdx={selectedIdx} />
              </box>
            </box>
          )}
          <StatusBar selected={previewWord} total={WORDS.length} />
        </box>
      </ModeContext.Provider>
    </ThemeContext.Provider>
  )
}

const renderer = await createCliRenderer({ exitOnCtrlC: false })
process.on("SIGINT", () => {
  renderer.destroy()
  process.exit(0)
})
process.on("exit", () => {
  renderer.destroy()
})
createRoot(renderer).render(<App />)
