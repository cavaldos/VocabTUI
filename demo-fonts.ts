/**
 * Demo all OpenTUI ASCII fonts so the user can choose.
 * Run with: bun run demo-fonts.ts
 */

import { fonts } from "@opentui/core";

// Strip color markup tags like <c1>, </c1>, <c2>, </c2>
function stripTags(s: string): string {
  return s.replace(/<\/?c[12]>/g, "");
}

// Render a word using a given font's character definitions
function renderWord(word: string, font: typeof fonts[keyof typeof fonts]): string[] {
  const upper = word.toUpperCase();
  const lines: string[] = Array.from({ length: font.lines }, () => "");

  for (const ch of upper) {
    const charData = font.chars[ch as keyof typeof font.chars];
    if (!charData) {
      // Use space for unknown chars
      for (let i = 0; i < font.lines; i++) {
        lines[i] += " ".repeat(font.letterspace_size + 2);
      }
      continue;
    }
    for (let i = 0; i < font.lines; i++) {
      const raw = charData[i] ?? "";
      let cell = stripTags(raw);
      lines[i] += cell;
      // Add letterspace after this character
      if (font.letterspace[i]) {
        lines[i] += stripTags(font.letterspace[i]);
      }
    }
  }

  return lines;
}

// ── Main ─────────────────────────────────────────────
const testWord = "VOCAB";
const fontNames = ["tiny", "block", "shade", "slick", "huge", "grid", "pallet"] as const;

for (const name of fontNames) {
  const font = fonts[name];
  const rendered = renderWord(testWord, font);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  Font: "${name}"  (${font.lines} lines tall, ${font.colors} color(s))`);
  console.log(`${"=".repeat(50)}\n`);
  for (const line of rendered) {
    console.log(line);
  }
  console.log();
}
