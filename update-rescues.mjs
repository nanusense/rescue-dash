#!/usr/bin/env node
/**
 * Snake Rescue Archive Builder
 * ─────────────────────────────
 * FULL BUILD:   node update-rescues.mjs
 * UPDATE ONLY:  node update-rescues.mjs --update
 *
 * --update mode only re-fetches the current year's page (sr-26 etc.)
 * and merges new rescues into the existing rescue-data.json.
 *
 * Requires: ANTHROPIC_API_KEY in environment
 *   export ANTHROPIC_API_KEY=sk-ant-...
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OUTPUT_FILE = "./public/rescue-data.json";
const UPDATE_MODE = process.argv.includes("--update");

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY environment variable not set.");
  console.error("   Run: export ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

const SOURCES = [
  { url: "https://shiftingradius.com/sr22/",         range: [1,   53],  year: 2022, slug: "sr22",   current: false },
  { url: "https://shiftingradius.com/sr23/",         range: [54,  100], year: 2023, slug: "sr23",   current: false },
  { url: "https://shiftingradius.com/sr23-part-2/",  range: [101, 150], year: 2023, slug: "sr23p2", current: false },
  { url: "https://shiftingradius.com/sr23-part-3/",  range: [151, 163], year: 2023, slug: "sr23p3", current: false },
  { url: "https://shiftingradius.com/sr24/",         range: [164, 200], year: 2024, slug: "sr24",   current: false },
  { url: "https://shiftingradius.com/sr24-part-2/",  range: [201, 248], year: 2024, slug: "sr24p2", current: false },
  { url: "https://shiftingradius.com/sr25/",         range: [249, 300], year: 2025, slug: "sr25",   current: false },
  { url: "https://shiftingradius.com/sr25-part-2/",  range: [301, 350], year: 2025, slug: "sr25p2", current: false },
  { url: "https://shiftingradius.com/sr-25-part-3/", range: [351, 362], year: 2025, slug: "sr25p3", current: false },
  { url: "https://shiftingradius.com/sr-26/",        range: [363, 999], year: 2026, slug: "sr26",   current: true  },
  // When you start sr-27, add it here and set current: true, set sr-26 current: false
];

const SYSTEM_PROMPT = `You are a data extraction assistant. Given raw HTML from a snake rescue webpage, extract ALL rescue entries on the page into a JSON array.

Each entry must have:
- number (integer: rescue number)
- species (string: snake species name)
- description (string: full narrative text)
- date (string: as written on page, e.g. "22 Feb 22")
- location (string: place/address)
- images (array: all https://i0.wp.com/... or https://i1.wp.com/... image URLs near this rescue)
- youtubeId (string|null: YouTube video ID if present. Extract from shorts/XXXX, watch?v=XXXX, or youtu.be/XXXX)
- venomous (boolean: true for Cobra/Russell's Viper/Krait/Saw-scaled Viper; false for all others)
- year (integer: year of rescue)

Return ONLY a valid JSON array. No markdown, no explanation. Start with [ end with ].`;

async function fetchPage(url) {
  console.log(`  ↓ ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; rescue-archiver/1.0)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function stripHTML(html) {
  let c = html;

  // Remove scripts, styles, comments
  c = c.replace(/<script[\s\S]*?<\/script>/gi, "");
  c = c.replace(/<style[\s\S]*?<\/style>/gi, "");
  c = c.replace(/<!--[\s\S]*?-->/g, "");

  // Try to extract just the WordPress post/article content area
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div\s*>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div\s*>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];
  for (const pat of contentPatterns) {
    const m = c.match(pat);
    if (m && m[1].length > 2000) { c = m[1]; break; }
  }

  // Preserve image URLs compactly
  c = c.replace(/<img[^>]*src="([^"]*i[01]\.wp\.com[^"]*)"[^>]*>/gi, "\n[IMG:$1]\n");
  c = c.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "\n[IMG:$1]\n");

  // Preserve YouTube IDs compactly
  c = c.replace(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,15})/g, "\n[YT:$1]\n");
  c = c.replace(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,15})/g, "\n[YT:$1]\n");
  c = c.replace(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,15})/g, "\n[YT:$1]\n");
  c = c.replace(/youtu\.be\/([A-Za-z0-9_-]{6,15})/g, "\n[YT:$1]\n");

  // Strip all remaining HTML tags
  c = c.replace(/<[^>]+>/g, " ");

  // Decode common entities
  c = c.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
       .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
       .replace(/&quot;/g, '"').replace(/&#8211;/g, "-")
       .replace(/&#8212;/g, "-").replace(/&#8216;/g, "'")
       .replace(/&#8217;/g, "'").replace(/&#8220;/g, '"')
       .replace(/&#8221;/g, '"');

  // Collapse whitespace
  c = c.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return c.slice(0, 150000);
}

async function parseWithClaude(html, source) {
  console.log(`  🤖 Parsing with Claude...`);
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Page: ${source.url}\nRescue range: ${source.range[0]}–${source.range[1]}\nYear: ${source.year}\n\n${stripHTML(html)}`
      }]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`API: ${data.error.message}`);

  const text = data.content?.[0]?.text || "[]";
  const clean = text.replace(/```json[\n\r]?|```/g, "").trim();

  try {
    const rescues = JSON.parse(clean);
    console.log(`  ✓ ${rescues.length} rescues extracted`);
    return rescues.map(r => ({ ...r, year: r.year || source.year, sourceUrl: source.url }));
  } catch (e) {
    console.error(`  ✗ JSON parse error:`, e.message);
    return [];
  }
}

function buildMeta(rescues) {
  return {
    total: rescues.length,
    venomous: rescues.filter(r => r.venomous).length,
    nonVenomous: rescues.filter(r => !r.venomous).length,
    withVideo: rescues.filter(r => r.youtubeId).length,
    lastUpdated: new Date().toISOString(),
    latestRescue: rescues.length ? Math.max(...rescues.map(r => r.number)) : 0
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── FULL BUILD ──────────────────────────────────────────────────────────────
async function fullBuild() {
  console.log("🐍 Full build: fetching all 10 pages...\n");
  const allRescues = [];

  for (const source of SOURCES) {
    console.log(`\n📄 ${source.slug} (${source.year}, #${source.range[0]}–${source.range[1]})`);
    try {
      const html = await fetchPage(source.url);
      await sleep(500);
      const rescues = await parseWithClaude(html, source);
      allRescues.push(...rescues);
      await sleep(1200);
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
    }
  }

  // Deduplicate by number, sort
  const map = new Map();
  for (const r of allRescues) map.set(r.number, r);
  const sorted = Array.from(map.values()).sort((a, b) => a.number - b.number);

  const output = { meta: buildMeta(sorted), rescues: sorted };
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Full build complete!`);
  console.log(`   Total: ${sorted.length} | Venomous: ${output.meta.venomous} | Videos: ${output.meta.withVideo}`);
  return output;
}

// ── INCREMENTAL UPDATE ──────────────────────────────────────────────────────
async function incrementalUpdate() {
  console.log("🔄 Incremental update: fetching current year pages only...\n");

  if (!existsSync(OUTPUT_FILE)) {
    console.log("  No existing rescue-data.json found. Running full build instead.");
    return fullBuild();
  }

  const existing = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
  const existingMap = new Map(existing.rescues.map(r => [r.number, r]));
  const prevLatest = existing.meta.latestRescue;
  console.log(`  Existing: ${existing.meta.total} rescues, latest #${prevLatest}`);

  const currentSources = SOURCES.filter(s => s.current);
  const newRescues = [];

  for (const source of currentSources) {
    console.log(`\n📄 ${source.slug} (current year page)`);
    try {
      const html = await fetchPage(source.url);
      await sleep(500);
      const rescues = await parseWithClaude(html, source);
      newRescues.push(...rescues);
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
    }
  }

  // Merge: new rescues override existing ones with same number
  let added = 0;
  let updated = 0;
  for (const r of newRescues) {
    if (!existingMap.has(r.number)) added++;
    else if (JSON.stringify(existingMap.get(r.number)) !== JSON.stringify(r)) updated++;
    existingMap.set(r.number, r);
  }

  const sorted = Array.from(existingMap.values()).sort((a, b) => a.number - b.number);
  const output = { meta: buildMeta(sorted), rescues: sorted };
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Update complete!`);
  console.log(`   Added: ${added} new rescues | Updated: ${updated} | Total: ${sorted.length}`);
  if (added === 0) console.log("   (No new rescues since last update)");

  return output;
}

// ── GIT COMMIT & PUSH ───────────────────────────────────────────────────────
function gitPush(meta) {
  try {
    execSync("git add public/rescue-data.json", { stdio: "inherit" });
    execSync(`git commit -m "rescue data: ${meta.total} rescues, latest #${meta.latestRescue} [${new Date().toLocaleDateString()}]"`, { stdio: "inherit" });
    execSync("git push", { stdio: "inherit" });
    console.log("\n🚀 Pushed to GitHub.");
  } catch (e) {
    console.log("\n⚠️  Git push failed (you may need to push manually):", e.message);
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
const result = UPDATE_MODE ? await incrementalUpdate() : await fullBuild();
gitPush(result.meta);
