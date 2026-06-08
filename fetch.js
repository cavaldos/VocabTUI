#!/usr/bin/env node

/**
 * notion-sync.js
 * Fetch vocabulary entries from a Notion database and write them to a JSON file.
 *
 * Usage:
 *   node notion-sync.js [output-file] [--only-missing]
 *
 * Environment variables (via .env or process env):
 *   NOTION_TOKEN / NOTION_API_TOKEN
 *   NOTION_DATABASE_ID
 *   EXAMPLE_OUTPUT_FILE  (fallback output path, default: example-sync/examples.json)
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

const outputFileDefault = "./data.json";

function loadEnvFile(filePath = ".env") {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
  return env;
}

function firstValue(keys, fileEnv, processEnv) {
  for (const key of keys) {
    const v = processEnv[key] ?? fileEnv[key];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig(args) {
  const fileEnv = loadEnvFile(".env");
  const processEnv = process.env;

  const notionToken = firstValue(
    ["NOTION_TOKEN", "NOTION_API_TOKEN", "notion_token", "notion_api_token"],
    fileEnv,
    processEnv
  );
  if (!notionToken)
    throw new Error(
      "Missing configuration: NOTION_TOKEN. Add it to .env or environment variables."
    );

  const notionDatabaseID = firstValue(
    ["NOTION_DATABASE_ID", "notion_database_id"],
    fileEnv,
    processEnv
  );
  if (!notionDatabaseID)
    throw new Error(
      "Missing configuration: NOTION_DATABASE_ID. Add it to .env or environment variables."
    );

  const outputFile =
    args[0] ??
    firstValue(
      ["EXAMPLE_OUTPUT_FILE", "example_output_file"],
      fileEnv,
      processEnv
    ) ??
    outputFileDefault;

  return { notionToken, notionDatabaseID, outputFile };
}

// ---------------------------------------------------------------------------
// Notion API client
// ---------------------------------------------------------------------------

async function queryDatabase(token, databaseID, startCursor = null) {
  const url = `https://api.notion.com/v1/databases/${databaseID}/query`;
  const body = { page_size: 100 };
  if (startCursor) body.start_cursor = startCursor;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Notion API error (${res.status}): ${message}`);
  }

  return res.json();
}

async function fetchAllEntries(token, databaseID, onlyMissingExample = false) {
  const entries = [];
  const allRelationIds = new Set();
  let nextCursor = null;
  let pageIndex = 0;

  do {
    const response = await queryDatabase(token, databaseID, nextCursor);
    pageIndex++;

    const pageRows = response.results
      .map((page) => {
        const entry = makeExampleEntry(page);
        // Collect IDs from relation-type synonyms for later resolution
        if (entry._synonymRelationIds) {
          for (const id of entry._synonymRelationIds) {
            allRelationIds.add(id);
          }
        }
        return entry;
      })
      .filter((e) => e.word.trim() !== "");

    const kept = onlyMissingExample
      ? pageRows.filter((e) => e.example.trim() === "")
      : pageRows;

    entries.push(...kept);
    nextCursor = response.has_more ? response.next_cursor : null;

    console.log(
      `[Page ${pageIndex}] Notion returned ${response.results.length} → kept ${kept.length} (total: ${entries.length}, hasMore: ${response.has_more})`
    );
  } while (nextCursor);

  // Resolve relation-type synonym page IDs to actual page titles
  if (allRelationIds.size > 0) {
    console.log(
      `Resolving ${allRelationIds.size} related page title(s) for synonyms...`
    );
    const titleMap = await resolvePageTitles(token, [...allRelationIds]);
    console.log(`Resolved ${Object.keys(titleMap).length} title(s).`);

    for (const entry of entries) {
      if (entry._synonymRelationIds) {
        entry.synonyms = entry._synonymRelationIds
          .map((id) => titleMap[id])
          .filter(
            (title) => typeof title === "string" && title.length > 0
          );
        delete entry._synonymRelationIds;
      }
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Property extractors
// ---------------------------------------------------------------------------

function extractPlainTextFromTitle(titleArr) {
  if (!Array.isArray(titleArr)) return null;
  const joined = titleArr.map((t) => t.plain_text ?? "").join("");
  const trimmed = joined.trim();
  return trimmed || null;
}

function extractPlainTextFromRichText(richTextArr) {
  if (!Array.isArray(richTextArr)) return null;
  const joined = richTextArr.map((t) => t.plain_text ?? "").join("");
  const trimmed = joined.trim();
  return trimmed || null;
}

function extractPlainText(prop) {
  if (!prop) return "";
  return (
    extractPlainTextFromTitle(prop.title) ??
    extractPlainTextFromRichText(prop.rich_text) ??
    ""
  );
}

function extractWord(prop) {
  if (!prop) return "";
  return (
    extractPlainTextFromTitle(prop.title) ??
    extractPlainTextFromRichText(prop.rich_text) ??
    ""
  );
}

function extractSelectName(prop) {
  const name = prop?.select?.name?.trim();
  return name || null;
}

function extractMultiSelectNames(options) {
  if (!Array.isArray(options)) return null;
  const names = options
    .map((o) => o.name?.trim())
    .filter((n) => n && n.length > 0);
  return names.length > 0 ? names : null;
}

function numberValue(num) {
  return Number.isInteger(num) ? String(num) : String(num);
}

function extractSpacedTime(prop) {
  if (!prop) return "";
  if (prop.date?.start) return prop.date.start;
  if (prop.number != null) return numberValue(prop.number);
  const sel = extractSelectName(prop);
  if (sel) return sel;
  return extractPlainText(prop);
}

function extractSynonyms(prop) {
  if (!prop) return [];

  // Handle relation type (related page) — returns page IDs
  // resolved to page titles later in fetchAllEntries
  if (prop.type === "relation" && Array.isArray(prop.relation)) {
    return prop.relation.map((r) => r.id).filter(Boolean);
  }

  const names = extractMultiSelectNames(prop.multi_select);
  if (names) return names;
  if (Array.isArray(prop.rich_text)) {
    return prop.rich_text
      .map((t) => t.plain_text?.trim())
      .filter((t) => t && t.length > 0);
  }
  return [];
}

function extractRelatedForms(prop) {
  if (!prop) return [];
  const names = extractMultiSelectNames(prop.multi_select);
  if (names) return names;
  const value = extractPlainText(prop);
  if (!value) return [];
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function resolvePageTitles(token, pageIds) {
  /** Batch-fetch Notion pages by ID and return a map of id → title. */
  const titleMap = {};
  const batchSize = 3;

  for (let i = 0; i < pageIds.length; i += batchSize) {
    const batch = pageIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Notion-Version": "2022-06-28",
            },
          });
          if (!res.ok) return null;
          const page = await res.json();
          const props = page.properties ?? {};
          const titleProp = Object.values(props).find(
            (p) => p.type === "title"
          );
          if (titleProp?.title) {
            const title = titleProp.title
              .map((t) => t.plain_text)
              .join("")
              .trim();
            return { id, title: title || "(untitled)" };
          }
          return { id, title: "(untitled)" };
        } catch {
          return null;
        }
      })
    );
    for (const r of results) {
      if (r) titleMap[r.id] = r.title;
    }
    // Respect Notion rate-limit (~3 req/s)
    if (i + batchSize < pageIds.length) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  return titleMap;
}

function makeExampleEntry(page) {
  const props = page.properties ?? {};
  const synonyms = extractSynonyms(props["Synonyms"]);

  // Mark entries with relation-type synonyms so fetchAllEntries
  // can resolve the page IDs to actual page titles later.
  const synProp = props["Synonyms"];
  const isRelation =
    synProp?.type === "relation" && Array.isArray(synonyms) && synonyms.length > 0;

  return {
    id: page.id,
    word: extractWord(props["Word"]),
    pronounce: extractPlainText(props["Pronounce"]),
    meaning: extractPlainText(props["Meaning"]),
    type:
      extractSelectName(props["Type"]) ?? extractPlainText(props["Type"]),
    spacedTime: extractSpacedTime(props["Spaced Time"]),
    level:
      extractSelectName(props["Level"]) ?? extractPlainText(props["Level"]),
    synonyms,
    example: extractPlainText(props["Example"]),
    relatedForms: extractRelatedForms(props["Related forms"]),
    ...(isRelation ? { _synonymRelationIds: synonyms } : {}),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const onlyMissing = args.includes("--only-missing");
  const positional = args.filter((a) => !a.startsWith("--"));

  const config = loadConfig(positional);
  const entries = await fetchAllEntries(
    config.notionToken,
    config.notionDatabaseID,
    onlyMissing
  );

  // Ensure output directory exists
  const dir = path.dirname(config.outputFile);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    config.outputFile,
    JSON.stringify(entries, Object.keys(entries[0] ?? {}).sort(), 2)
  );

  const mode = onlyMissing ? "missing-Example only" : "all";
  console.log(
    `Saved ${entries.count ?? entries.length} entries (${mode}) to ${config.outputFile}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
