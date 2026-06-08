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

function fillWord(word: string, fillChars: string, hints: Set<number> = new Set()): string {
  // Shows first letter of each word as a hint,
  // plus any extra hint positions (random characters for long words),
  // then fills remaining blanks with user-typed characters.
  if (!word) return ""
  let pos = 0
  let result = ""
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    if (ch === " ") {
      result += " "
    } else if (i === 0 || word[i - 1] === " ") {
      result += ch
    } else if (hints.has(i)) {
      result += ch
    } else {
      result += pos < fillChars.length ? fillChars[pos++] : "_"
    }
  }
  return result
}

// ─── Filled Word Display (per-character coloring) ────────────────────────────

function FilledWordDisplay({
  word,
  fillChars,
  hints,
  showCursor,
}: {
  word: string
  fillChars: string
  hints: Set<number>
  showCursor: boolean
}) {
  let pos = 0
  let cursorPlaced = false
  const children: React.ReactNode[] = []
  for (let i = 0; i < word.length; i++) {
    const ch = word.charAt(i)
    if (ch === " ") {
      children.push(<text key={i} fg="#4a4545"> </text>)
    } else if (i === 0 || word.charAt(i - 1) === " " || hints.has(i)) {
      children.push(
        <text key={i} fg="#f1eced" attributes={TextAttributes.BOLD}>{ch}</text>
      )
    } else if (pos < fillChars.length) {
      const typed = fillChars.charAt(pos++)
      const correct = typed.toLowerCase() === ch.toLowerCase()
      children.push(
        <text
          key={i}
          fg={correct ? "#f1eced" : "#f7768e"}
          attributes={correct ? TextAttributes.NONE : TextAttributes.DIM}
        >{typed}</text>
      )
    } else {
      // Blank — next one is highlighted as cursor
      if (!cursorPlaced && showCursor) {
        children.push(
          <text key={i} fg="#7aa2f7" attributes={TextAttributes.BOLD}>_</text>
        )
        cursorPlaced = true
      } else {
        children.push(
          <text key={i} fg="#4a4545" attributes={TextAttributes.DIM}>_</text>
        )
      }
    }
  }
  return <box style={{ flexDirection: "row" }}>{children}</box>
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
  const [fillChars, setFillChars] = useState("")
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle")

  // Reset when word changes
  useEffect(() => {
    setFillChars("")
    setResult("idle")
  }, [word])

  // Positions that the user needs to fill (non-first-letter, non-space)
  const blankPositions = useMemo(() => {
    if (!word) return []
    const blanks: number[] = []
    for (let i = 0; i < word.word.length; i++) {
      if (word.word[i] === " ") continue
      if (i === 0 || word.word[i - 1] === " ") continue
      blanks.push(i)
    }
    return blanks
  }, [word])

  // Extra hint: reveal one random blank if word has 6+ characters
  const hintPositions = useMemo(() => {
    const hints = new Set<number>()
    if (!word || word.word.length < 6 || blankPositions.length === 0) return hints
    const idx = Math.floor(Math.random() * blankPositions.length)
    hints.add(blankPositions[idx]!)
    return hints
  }, [word, blankPositions])

  const neededFillCount = blankPositions.length - hintPositions.size

  // Auto-check when all blanks are filled (only notify if correct)
  useEffect(() => {
    if (!word || result !== "idle") return
    if (fillChars.length === neededFillCount) {
      const guessed = fillWord(word.word, fillChars, hintPositions)
      if (guessed.trim().toLowerCase() === word.word.toLowerCase()) {
        setResult("correct")
      }
      // Wrong → no notification, user sees red chars and fixes them
    }
  }, [fillChars, word, result, hintPositions, neededFillCount])

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
      setFillChars((f) => f.slice(0, -1))
      setResult("idle")
      return
    }
    if (key.name === "return") {
      if (result === "correct" || result === "wrong") {
        setFillChars("")
        setResult("idle")
      } else if (result === "idle") {
        const guessed = fillWord(word?.word ?? "", fillChars, hintPositions)
        setResult(
          guessed.trim().toLowerCase() === (word?.word ?? "").toLowerCase() ? "correct" : "wrong"
        )
      }
      return
    }
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      if (!word) return
      if (fillChars.length < neededFillCount) {
        setFillChars((f) => f + key.sequence!)
        setResult("idle")
      }
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
            <FilledWordDisplay word={word.word} fillChars={fillChars} hints={hintPositions} showCursor={result === "idle"} />
          </box>

          {word.type && (
            <box style={{ flexDirection: "column", alignItems: "center", marginBottom: 1 }}>
              <text fg="#8a8585" attributes={TextAttributes.BOLD}>Type</text>
              <text fg="#bb9af7" attributes={TextAttributes.BOLD}>{word.type}</text>
            </box>
          )}

          {result === "idle" && (
            <box style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              marginTop: 1,
              marginBottom: 1,
            }}>
              <text fg={fillChars.length > 0 ? "#7aa2f7" : "#656363"}>›</text>
              <text fg="#4a4545">
                {fillChars.length > 0
                   ? `${fillChars.length}/${neededFillCount}`
                  : "type to fill in the blanks"}
              </text>
            </box>
          )}

          {(result === "correct" || result === "wrong") && (
            <box style={{ flexDirection: "column", alignItems: "center", marginTop: 1 }}>
              {result === "correct" && (
                <box style={{ flexDirection: "column", alignItems: "center" }}>
                  <text fg="#9ece6a" attributes={TextAttributes.BOLD}>✓ Correct!</text>
                  <text fg="#e0af68">{word.word}</text>
                </box>
              )}
              {result === "wrong" && (
                <box style={{ flexDirection: "column", alignItems: "center" }}>
                  <text fg="#f7768e" attributes={TextAttributes.BOLD}>✗ Wrong</text>
                  <text fg="#e0af68">→ {word.word}</text>
                </box>
              )}
              {word.pronounce && (
                <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
                  <text fg="#8a8585">Pronounce:</text>
                  <text fg="#7aa2f7">{word.pronounce}</text>
                </box>
              )}
              {word.example && (
                <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
                  <text fg="#8a8585">Example:</text>
                  <text fg="#c0caf5">{word.example}</text>
                </box>
              )}
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

// ─── Virtual Navigation ────────────────────────────────────────────────────────

/**
 * Virtual directional pad — 4 clickable buttons (◄ ▲ ▼ ►) for mouse users.
 * Each button triggers the same navigation action as its keyboard equivalent.
 */
function VirtualNav({
  onLeft,
  onUp,
  onDown,
  onRight,
}: {
  onLeft: () => void
  onUp: () => void
  onDown: () => void
  onRight: () => void
}) {
  const { transparent } = useTheme()
  const btnStyle = { paddingLeft: 1, paddingRight: 1 }

  return (
    <box
      title=" nav "
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        height: 3,
        backgroundColor: transparent ? "transparent" : "#1a1717",
        borderStyle: "single",
        borderColor: "#2a2525",
      }}
    >
      {/* ◄ Left — cycle level backward */}
      <box onMouseDown={onLeft} style={btnStyle}>
        <text fg="#7aa2f7" attributes={TextAttributes.BOLD}> ◄ </text>
        <text fg="#656363">level</text>
      </box>

      <text fg="#2a2525"> │ </text>

      {/* ▲ Up — previous word */}
      <box onMouseDown={onUp} style={btnStyle}>
        <text fg="#7aa2f7" attributes={TextAttributes.BOLD}> ▲ </text>
        <text fg="#656363">word</text>
      </box>

      <text fg="#2a2525"> │ </text>

      {/* ▼ Down — next word */}
      <box onMouseDown={onDown} style={btnStyle}>
        <text fg="#7aa2f7" attributes={TextAttributes.BOLD}> ▼ </text>
        <text fg="#656363">word</text>
      </box>

      <text fg="#2a2525"> │ </text>

      {/* ► Right — cycle level forward */}
      <box onMouseDown={onRight} style={btnStyle}>
        <text fg="#7aa2f7" attributes={TextAttributes.BOLD}> ► </text>
        <text fg="#656363">level</text>
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
  const [levelPositions, setLevelPositions] = useState<Record<string, number>>({})
  const selectedIdx = levelPositions[selectedLevel] ?? 0
  const [viewedWord, setViewedWord] = useState<WordEntry | null>(null)

  const words = useMemo(() => {
    if (!query.trim()) {
      // No search: filter by spaced time level
      return WORDS.filter((w) => w.spacedTime === selectedLevel)
    }
    const q = query.toLowerCase()
    // Search across ALL words regardless of level
    return WORDS.filter(
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
      setLevelPositions((p) => ({ ...p, [selectedLevel]: 0 }))
      return
    }

    if (key.name === "escape") {
      setQuery("")
      setLevelPositions((p) => ({ ...p, [selectedLevel]: 0 }))
      return
    }

    if (key.name === "up") {
      setLevelPositions((p) => ({ ...p, [selectedLevel]: Math.max(0, (p[selectedLevel] ?? 0) - 1) }))
      return
    }

    if (key.name === "down") {
      setLevelPositions((p) => ({ ...p, [selectedLevel]: Math.min(words.length - 1, (p[selectedLevel] ?? 0) + 1) }))
      return
    }

    if (key.name === "left") {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const prev = idx > 0 ? idx - 1 : LEVELS.length - 1
      setSelectedLevel(LEVELS[prev]?.key ?? "")
      return
    }

    if (key.name === "right") {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const next = idx < LEVELS.length - 1 ? idx + 1 : 0
      setSelectedLevel(LEVELS[next]?.key ?? "")
      return
    }

    if (key.name === "tab" && !key.shift) {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const next = idx < LEVELS.length - 1 ? idx + 1 : 0
      setSelectedLevel(LEVELS[next]?.key ?? "")
      return
    }

    if (key.name === "tab" && key.shift) {
      const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
      const prev = idx > 0 ? idx - 1 : LEVELS.length - 1
      setSelectedLevel(LEVELS[prev]?.key ?? "")
      return
    }

    if (key.name === "return") {
      const target = words[selectedIdx]
      if (target) selectWord(target)
      return
    }

    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setQuery((q) => (q + key.sequence!).slice(0, 50))
      setLevelPositions((p) => ({ ...p, [selectedLevel]: 0 }))
    }
  })

  const contentHeight = useMemo(() => Math.max(10, height - 5), [height])
// -1 header -3 virtual nav -1 status bar

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
                onNext={() => setLevelPositions((p) => ({ ...p, [selectedLevel]: Math.min(words.length - 1, (p[selectedLevel] ?? 0) + 1) }))}
                onPrev={() => setLevelPositions((p) => ({ ...p, [selectedLevel]: Math.max(0, (p[selectedLevel] ?? 0) - 1) }))}
                onExit={() => setMode("browse")}
                selectedLevel={selectedLevel}
                onLevelChange={(level) => { setSelectedLevel(level) }}
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
          <VirtualNav
            onLeft={() => {
              const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
              const prev = idx > 0 ? idx - 1 : LEVELS.length - 1
              setSelectedLevel(LEVELS[prev]?.key ?? "")
            }}
            onUp={() => setLevelPositions((p) => ({ ...p, [selectedLevel]: Math.max(0, (p[selectedLevel] ?? 0) - 1) }))}
            onDown={() => setLevelPositions((p) => ({ ...p, [selectedLevel]: Math.min(words.length - 1, (p[selectedLevel] ?? 0) + 1) }))}
            onRight={() => {
              const idx = LEVELS.findIndex((l) => l.key === selectedLevel)
              const next = idx < LEVELS.length - 1 ? idx + 1 : 0
              setSelectedLevel(LEVELS[next]?.key ?? "")
            }}
          />
          <StatusBar selected={previewWord} total={WORDS.length} />
        </box>
      </ModeContext.Provider>
    </ThemeContext.Provider>
  )
}

const renderer = await createCliRenderer({ exitOnCtrlC: false, useMouse: true })
process.on("SIGINT", () => {
  renderer.destroy()
  process.exit(0)
})
process.on("exit", () => {
  renderer.destroy()
})
createRoot(renderer).render(<App />)
