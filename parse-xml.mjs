#!/usr/bin/env node
/**
 * parse-xml.mjs
 * Parses the WordPress XML export and writes public/rescue-data.json
 * Usage: node parse-xml.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const XML_FILE  = "./shiftingradius.WordPress.2026-03-04.xml";
const OUT_FILE  = "./public/rescue-data.json";

const RESCUE_PAGES = [
  { slug: "sr22",         year: 2022 },
  { slug: "sr23",         year: 2023 },
  { slug: "sr23-part-2",  year: 2023 },
  { slug: "sr23-part-3",  year: 2023 },
  { slug: "sr24",         year: 2024 },
  { slug: "sr24-part-2",  year: 2024 },
  { slug: "sr25",         year: 2025 },
  { slug: "sr25-part-2",  year: 2025 },
  { slug: "sr-25-part-3", year: 2025 },
];

const VENOMOUS_KEYWORDS = ["cobra", "viper", "krait", "saw-scaled"];
const isVenomous = (s) => VENOMOUS_KEYWORDS.some(k => s.toLowerCase().includes(k));

// Date pattern: "22 Feb 22" or "9 Mar 2022"
const DATE_RE = /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}$/;

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#8211;/g, "-").replace(/&#8212;/g, "-")
    .replace(/&#8216;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ");
}

function stripShortcodes(s) {
  // Remove WPBakery shortcode tags but keep their inner text if any
  return s.replace(/\[\/?[a-z_]+[^\]]*\]/g, " ");
}

function cleanText(s) {
  return decodeEntities(stripShortcodes(stripTags(s)))
    .replace(/\s+/g, " ").trim();
}

// ── Build attachment ID → URL map ────────────────────────────────────────────

const xml = readFileSync(XML_FILE, "utf8");

const attachmentMap = new Map();
// Split on </item> to process each WP item independently
const itemChunks = xml.split("</item>");
for (const chunk of itemChunks) {
  if (!chunk.includes("attachment")) continue;
  const typeM = chunk.match(/<wp:post_type><!\[CDATA\[attachment\]\]><\/wp:post_type>/);
  if (!typeM) continue;
  const idM  = chunk.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
  const urlM = chunk.match(/<wp:attachment_url><!\[CDATA\[(.*?)\]\]><\/wp:attachment_url>/);
  if (idM && urlM) attachmentMap.set(idM[1], urlM[1]);
}
console.log(`Attachment map: ${attachmentMap.size} entries`);

// ── Extract page content by slug ─────────────────────────────────────────────

function getPageContent(slug) {
  for (const chunk of itemChunks) {
    const slugM = chunk.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/);
    if (!slugM || slugM[1] !== slug) continue;
    const contentM = chunk.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    return contentM ? contentM[1] : null;
  }
  return null;
}

// ── Parse rescues from page content ──────────────────────────────────────────

function parseRescues(content, year) {
  const rescues = [];

  // Each rescue starts with <h3>N. Species</h3>
  // Some entries cover multiple rescues: "340 & 341." or "342, 343, 344, 345."
  const H3_RE = /<h3[^>]*>\s*([\d]+(?:\s*(?:&amp;|[,&])\s*\d+)*)\.\s*([\s\S]*?)<\/h3>/gi;
  const entries = [];
  let m;
  while ((m = H3_RE.exec(content)) !== null) {
    // Parse all numbers in the group (e.g. "340 & 341" → [340, 341])
    const numbers = m[1].split(/\s*(?:&amp;|[,&])\s*/).map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    // Use the first number as the index marker; we'll expand to one entry per number later
    entries.push({ index: m.index, end: m.index + m[0].length, numbers, rawSpecies: m[2] });
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Species: strip any HTML/shortcodes from the h3 content
    const species = cleanText(entry.rawSpecies);
    const segEnd = i + 1 < entries.length ? entries[i + 1].index : content.length;
    const seg = content.slice(entry.index, segEnd);

    // h6 tags → first match of date pattern = date, first non-date = location
    const H6_RE = /<h6[^>]*>([\s\S]*?)<\/h6>/gi;
    let date = "", location = "";
    let h6m;
    while ((h6m = H6_RE.exec(seg)) !== null) {
      const val = cleanText(h6m[1]);
      if (!date && DATE_RE.test(val)) { date = val; continue; }
      if (!location && val.length > 0 && val.length < 80) { location = val; }
    }

    // Description: extract text from [vc_column_text]...[/vc_column_text] blocks
    const vcTextBlocks = [...seg.matchAll(/\[vc_column_text[^\]]*\]([\s\S]*?)\[\/vc_column_text\]/g)];
    let description = "";
    if (vcTextBlocks.length > 0) {
      const parts = vcTextBlocks.map(b => {
        let t = b[1];
        // Remove the h3/h6 headings from description text
        t = t.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");
        // Remove YouTube anchor links (keep the surrounding sentence, just drop the anchor)
        t = t.replace(/<a[^>]*href="[^"]*(?:youtube|youtu\.be)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, "$1");
        return cleanText(t);
      }).filter(Boolean);
      description = parts.join(" ").replace(/\s+/g, " ").trim();
    }

    // Images: bg_image is always in [vc_row] BEFORE the h3 (missed by h3→h3 segment).
    // Find the enclosing [vc_row...[/vc_row] block for correct image extraction.
    const beforeH3 = content.slice(0, entry.index);
    const rowStart = beforeH3.lastIndexOf("[vc_row");
    const rowEnd   = rowStart !== -1 ? content.indexOf("[/vc_row]", rowStart) : -1;
    const rowSeg   = rowStart !== -1 && rowEnd !== -1
      ? content.slice(rowStart, rowEnd + 9)  // 9 = "[/vc_row]".length
      : seg;
    const bgIds  = [...rowSeg.matchAll(/\bbg_image="(\d+)"/g)].map(m => m[1]);
    const imgIds = [...rowSeg.matchAll(/\bimage_url="(\d+)"/g)].map(m => m[1]);
    const allIds = [...new Set([...bgIds, ...imgIds])];
    const images = allIds.map(id => attachmentMap.get(id)).filter(Boolean);

    // YouTube ID
    let youtubeId = null;
    for (const pat of [
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,15})/,
      /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,15})/,
      /youtu\.be\/([A-Za-z0-9_-]{6,15})/,
    ]) {
      const ym = seg.match(pat);
      if (ym) { youtubeId = ym[1]; break; }
    }

    // Create one entry per rescue number (handles combined entries like "340 & 341.")
    for (const number of entry.numbers) {
      rescues.push({ number, species, description, date, location, images, youtubeId, venomous: isVenomous(species), year });
    }
  }

  return rescues;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("\nParsing rescue pages...");
const allRescues = [];

for (const { slug, year } of RESCUE_PAGES) {
  const content = getPageContent(slug);
  if (!content) { console.log(`  ✗ Not found: ${slug}`); continue; }
  const rescues = parseRescues(content, year);
  console.log(`  ${slug.padEnd(14)} → ${rescues.length} rescues`);
  allRescues.push(...rescues);
}

// Deduplicate by number (last write wins), sort
const map = new Map();
for (const r of allRescues) map.set(r.number, r);
const sorted = Array.from(map.values()).sort((a, b) => a.number - b.number);

const meta = {
  total: sorted.length,
  venomous: sorted.filter(r => r.venomous).length,
  nonVenomous: sorted.filter(r => !r.venomous).length,
  withVideo: sorted.filter(r => r.youtubeId).length,
  lastUpdated: new Date().toISOString(),
  latestRescue: sorted.length ? Math.max(...sorted.map(r => r.number)) : 0,
};

writeFileSync(OUT_FILE, JSON.stringify({ meta, rescues: sorted }, null, 2));

console.log(`\n✅ Done!`);
console.log(`   Total: ${meta.total} | Venomous: ${meta.venomous} | Non-venomous: ${meta.nonVenomous} | Videos: ${meta.withVideo}`);
console.log(`   Latest rescue: #${meta.latestRescue}`);
console.log(`   Written to: ${OUT_FILE}`);
