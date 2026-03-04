import { useState, useEffect, useCallback, useMemo } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const DATA_URL = "./rescue-data.json";
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_COLORS = ["#5dba6e", "#6aacde", "#e8c44a", "#c47ade", "#e05c3a"];

const VENOMOUS_KEYWORDS = ["cobra", "viper", "krait", "saw-scaled"];
const isVenomous = (r) => r.venomous ?? VENOMOUS_KEYWORDS.some(k => r.species?.toLowerCase().includes(k));

// ── DATE PARSING ──────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_IDX = Object.fromEntries(MONTH_NAMES.map((m, i) => [m.toLowerCase(), i]));

function parseRescueDate(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/);
  if (!m) return null;
  const month = MONTH_IDX[m[2].toLowerCase()];
  if (month === undefined) return null;
  let year = parseInt(m[3]);
  if (year < 100) year += 2000;
  return { day: parseInt(m[1]), month, year, ts: new Date(year, month, parseInt(m[1])).getTime() };
}

// ── SPECIES NORMALISATION ─────────────────────────────────────────────────────
// Correct known typos/variants from the source content.
const SPECIES_ALIASES = {
  "Annamalai Wolf Snake": "Anamalai Wolf Snake",
  "Buff-Striped Keelback":  "Buff Striped Keelback",
  "Checkered Keelback(S)":  "Checkered Keelback",
};

function normalizeSpecies(s) {
  const titled = (s || "Unknown").trim()
    .toLowerCase()
    // Title-case word boundaries, but don't capitalise after apostrophes
    .replace(/(?<!['])\b\w/g, c => c.toUpperCase());
  return SPECIES_ALIASES[titled] || titled;
}

// ── GRAYSCALE EMOJI WRAPPER ───────────────────────────────────────────────────
const Em = ({ children, style = {} }) => (
  <span style={{ filter: "grayscale(1)", display: "inline-block", ...style }}>{children}</span>
);

// ── THEME ─────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#060e08",
    bgGradient: "radial-gradient(ellipse at 15% 0%, rgba(18,42,20,0.7) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(35,15,5,0.5) 0%, transparent 55%)",
    surface: "#0b1610",
    headerBorder: "rgba(255,255,255,0.06)",
    text: "#e8dcc8",
    textMuted: "rgba(255,255,255,0.38)",
    textFaint: "rgba(255,255,255,0.22)",
    navBorder: "rgba(255,255,255,0.04)",
    navBtnBorder: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.05)",
    inputBorder: "rgba(255,255,255,0.12)",
    rowBg: "rgba(255,255,255,0.03)",
    rowHoverBg: "rgba(255,255,255,0.07)",
    cardBg: "rgba(255,255,255,0.025)",
    barTrack: "rgba(255,255,255,0.07)",
    modalOverlay: "rgba(0,0,0,0.85)",
    scrollbar: "rgba(255,255,255,0.1)",
    toggleBg: "rgba(255,255,255,0.07)",
    toggleBorder: "rgba(255,255,255,0.12)",
    tableBorder: "rgba(255,255,255,0.06)",
    tableRowHover: "rgba(255,255,255,0.04)",
  },
  light: {
    bg: "#f0ece0",
    bgGradient: "radial-gradient(ellipse at 15% 0%, rgba(160,215,165,0.2) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(220,195,155,0.18) 0%, transparent 55%)",
    surface: "#fdfcfa",
    headerBorder: "rgba(0,0,0,0.07)",
    text: "#1c2018",
    textMuted: "rgba(0,0,0,0.45)",
    textFaint: "rgba(0,0,0,0.28)",
    navBorder: "rgba(0,0,0,0.06)",
    navBtnBorder: "rgba(0,0,0,0.09)",
    inputBg: "rgba(0,0,0,0.04)",
    inputBorder: "rgba(0,0,0,0.12)",
    rowBg: "rgba(0,0,0,0.03)",
    rowHoverBg: "rgba(0,0,0,0.06)",
    cardBg: "rgba(0,0,0,0.025)",
    barTrack: "rgba(0,0,0,0.07)",
    modalOverlay: "rgba(0,0,0,0.5)",
    scrollbar: "rgba(0,0,0,0.15)",
    toggleBg: "rgba(0,0,0,0.06)",
    toggleBorder: "rgba(0,0,0,0.1)",
    tableBorder: "rgba(0,0,0,0.07)",
    tableRowHover: "rgba(0,0,0,0.03)",
  },
};

// ── MONTHLY ACTIVITY CHART ────────────────────────────────────────────────────
function MonthlyChart({ rescues, years, T }) {
  const [hovered, setHovered] = useState(null);

  const monthData = useMemo(() => {
    // counts[month] = { total, byYear: {year: count} }
    const data = Array.from({ length: 12 }, () => ({ total: 0, byYear: {} }));
    for (const r of rescues) {
      const p = parseRescueDate(r.date);
      if (!p) continue;
      data[p.month].total++;
      data[p.month].byYear[p.year] = (data[p.month].byYear[p.year] || 0) + 1;
    }
    return data;
  }, [rescues]);

  const max = Math.max(...monthData.map(d => d.total), 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 110 }}>
        {MONTH_NAMES.map((m, i) => {
          const { total, byYear } = monthData[i];
          const isHovered = hovered === i;
          return (
            <div
              key={m}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "default" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={{ fontSize: 9, color: isHovered ? T.text : T.textFaint, fontWeight: isHovered ? 600 : 400, fontFamily: "'Inter', system-ui, sans-serif", minHeight: 12 }}>
                {total > 0 ? total : ""}
              </span>
              <div style={{ width: "100%", background: T.barTrack, borderRadius: "3px 3px 0 0", height: 88, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", position: "relative" }}>
                {/* Stacked bars by year */}
                <div style={{ width: "100%", height: `${(total / max) * 100}%`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {years.map((y, yi) => {
                    const c = byYear[y] || 0;
                    if (!c) return null;
                    return (
                      <div key={y} style={{ width: "100%", flex: c, background: YEAR_COLORS[yi % YEAR_COLORS.length], opacity: isHovered ? 1 : 0.75, transition: "opacity 0.15s" }} />
                    );
                  })}
                </div>
              </div>
              <span style={{ fontSize: 9, color: isHovered ? T.text : T.textFaint, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: isHovered ? 600 : 400 }}>{m}</span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        {years.map((y, i) => (
          <div key={y} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: YEAR_COLORS[i % YEAR_COLORS.length], opacity: 0.8 }} />
            <span style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Inter', system-ui, sans-serif" }}>{y}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── YEAR TRENDS TABLE ─────────────────────────────────────────────────────────
function YearTrends({ rescues, years, T }) {
  const rows = years.map((y, yi) => {
    const yr = rescues.filter(r => r.year === y);
    const ven = yr.filter(r => isVenomous(r)).length;
    const vid = yr.filter(r => r.youtubeId).length;
    // Find month range from actual dates
    const parsed = yr.map(r => parseRescueDate(r.date)).filter(Boolean);
    const months = parsed.length
      ? new Set(parsed.map(p => p.month)).size
      : 12;
    return {
      year: y,
      color: YEAR_COLORS[yi % YEAR_COLORS.length],
      total: yr.length,
      venPct: yr.length ? Math.round((ven / yr.length) * 100) : 0,
      vidPct: yr.length ? Math.round((vid / yr.length) * 100) : 0,
      perMonth: (yr.length / 12).toFixed(1),
    };
  });

  const cols = ["Year", "Rescues", "Venomous", "Per month"];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ textAlign: c === "Year" ? "left" : "right", padding: "8px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: T.textFaint, borderBottom: `1px solid ${T.tableBorder}`, whiteSpace: "nowrap" }}>
                {c.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.year} style={{ borderBottom: `1px solid ${T.tableBorder}` }}>
              <td style={{ padding: "11px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, color: r.color }}>{r.year}</span>
                </div>
              </td>
              <td style={{ padding: "11px 12px", textAlign: "right", color: T.text, fontWeight: 600 }}>{r.total}</td>
              <td style={{ padding: "11px 12px", textAlign: "right", color: r.venPct > 60 ? "#e05c3a" : T.textMuted }}>{r.venPct}%</td>
              <td style={{ padding: "11px 12px", textAlign: "right", color: T.textMuted }}>{r.perMonth}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── RECORDS ───────────────────────────────────────────────────────────────────
function Records({ rescues, T }) {
  const records = useMemo(() => {
    // Busiest month
    const monthYearCounts = {};
    for (const r of rescues) {
      const p = parseRescueDate(r.date);
      if (!p) continue;
      const key = `${MONTH_NAMES[p.month]} ${p.year}`;
      monthYearCounts[key] = (monthYearCounts[key] || 0) + 1;
    }
    const busiestEntry = Object.entries(monthYearCounts).sort((a, b) => b[1] - a[1])[0];
    const busiest = busiestEntry ? { label: busiestEntry[0], count: busiestEntry[1] } : null;

    // Species counts
    const speciesCounts = {};
    for (const r of rescues) {
      const s = normalizeSpecies(r.species);
      speciesCounts[s] = (speciesCounts[s] || 0) + 1;
    }
    const speciesEntries = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]);
    const topSpecies = speciesEntries[0];
    const uniqueCount = speciesEntries.length;
    const rarestList = speciesEntries.filter(([, c]) => c === 1);

    // Longest gap between consecutive rescues
    const dated = rescues
      .map(r => ({ ...r, p: parseRescueDate(r.date) }))
      .filter(r => r.p)
      .sort((a, b) => a.p.ts - b.p.ts);

    let longestGap = 0;
    let gapLabel = "";
    for (let i = 1; i < dated.length; i++) {
      const gap = Math.round((dated[i].p.ts - dated[i - 1].p.ts) / 86400000);
      if (gap > longestGap) {
        longestGap = gap;
        gapLabel = `${dated[i - 1].date} → ${dated[i].date}`;
      }
    }

    return { busiest, topSpecies, uniqueCount, rarestCount: rarestList.length, longestGap, gapLabel };
  }, [rescues]);

  const cards = [
    {
      icon: "📅",
      label: "Busiest month",
      value: records.busiest?.label ?? "—",
      sub: records.busiest ? `${records.busiest.count} rescues` : "",
      color: "#6aacde",
    },
    {
      icon: "🐍",
      label: "Most rescued",
      value: records.topSpecies?.[0] ?? "—",
      sub: records.topSpecies ? `${records.topSpecies[1]} rescues total` : "",
      color: "#5dba6e",
    },
    {
      icon: "🔭",
      label: "Species diversity",
      value: `${records.uniqueCount} species`,
      sub: `${records.rarestCount} seen only once`,
      color: "#c47ade",
    },
    {
      icon: "⏳",
      label: "Longest quiet spell",
      value: `${records.longestGap} days`,
      sub: records.gapLabel,
      color: "#e8c44a",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: T.cardBg, border: `1px solid ${c.color}20`, borderRadius: 12, padding: "18px 20px" }}>
          <Em style={{ fontSize: 22, marginBottom: 10, display: "block" }}>{c.icon}</Em>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: T.textFaint, marginBottom: 6, fontFamily: "'Inter', system-ui, sans-serif" }}>{c.label.toUpperCase()}</div>
          <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 16, fontWeight: 700, color: c.color, marginBottom: 4, lineHeight: 1.2 }}>{c.value}</div>
          <div style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Inter', system-ui, sans-serif" }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── SPECIES CHART ─────────────────────────────────────────────────────────────
function SpeciesChart({ rescues, color, T }) {
  const counts = {};
  for (const r of rescues) {
    const key = normalizeSpecies(r.species);
    counts[key] = (counts[key] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = sorted[0]?.[1] || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map(([species, count]) => (
        <div key={species}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Inter', system-ui, sans-serif" }}>{species}</span>
            <span style={{ fontSize: 11, fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600, color }}>{count}</span>
          </div>
          <div style={{ height: 3, background: T.barTrack, borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: color, borderRadius: 2, opacity: 0.8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── YOUTUBE EMBED ─────────────────────────────────────────────────────────────
function YouTubeEmbed({ videoId, T }) {
  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.navBtnBorder}` }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen title="Rescue video"
      />
    </div>
  );
}

// ── RESCUE MODAL ──────────────────────────────────────────────────────────────
function RescueModal({ rescue, onClose, onPrev, onNext, hasPrev, hasNext, T }) {
  const venom = isVenomous(rescue);
  const accent = venom ? "#e05c3a" : "#5dba6e";

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasNext) onNext();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNext, onPrev, hasPrev, hasNext]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: T.modalOverlay, backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: T.surface, border: `1px solid ${accent}30`, borderRadius: 16, maxWidth: 700, width: "100%", position: "relative", boxShadow: `0 40px 120px rgba(0,0,0,0.25), 0 0 0 1px ${accent}10`, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 0", position: "sticky", top: 0, background: T.surface, zIndex: 2, borderRadius: "16px 16px 0 0" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onPrev} disabled={!hasPrev} style={{ background: T.rowBg, border: `1px solid ${T.navBtnBorder}`, color: hasPrev ? T.text : T.textFaint, borderRadius: 7, padding: "5px 14px", cursor: hasPrev ? "pointer" : "default", fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>←</button>
            <button onClick={onNext} disabled={!hasNext} style={{ background: T.rowBg, border: `1px solid ${T.navBtnBorder}`, color: hasNext ? T.text : T.textFaint, borderRadius: 7, padding: "5px 14px", cursor: hasNext ? "pointer" : "default", fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>→</button>
          </div>
          <button onClick={onClose} style={{ background: T.rowBg, border: `1px solid ${T.navBtnBorder}`, color: T.text, borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, color: accent, background: `${accent}15`, border: `1px solid ${accent}28`, borderRadius: 5, padding: "3px 9px", letterSpacing: "0.05em" }}>RESCUE #{rescue.number}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, background: venom ? "rgba(224,92,58,0.15)" : "rgba(93,186,110,0.12)", color: accent, letterSpacing: "0.06em", border: `1px solid ${accent}22`, textTransform: "uppercase", fontFamily: "'Inter', system-ui, sans-serif" }}>
              {venom ? "⚠ VENOMOUS" : "✓ NON-VENOMOUS"}
            </span>
            {rescue.youtubeId && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, background: "rgba(255,40,40,0.12)", color: "#e05050", letterSpacing: "0.06em", border: "1px solid rgba(255,40,40,0.2)", fontFamily: "'Inter', system-ui, sans-serif" }}>▶ VIDEO</span>}
            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 5, background: T.rowBg, color: T.textFaint, letterSpacing: "0.05em", border: `1px solid ${T.navBtnBorder}`, fontFamily: "'Inter', system-ui, sans-serif" }}>{rescue.year}</span>
          </div>

          <h2 style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 10px", lineHeight: 1.2 }}>{rescue.species}</h2>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20, fontSize: 12, color: T.textMuted, fontFamily: "'Inter', system-ui, sans-serif" }}>
            {rescue.date && <span><Em>📅</Em> {rescue.date}</span>}
            {rescue.location && <span><Em>📍</Em> {rescue.location}</span>}
          </div>

          {rescue.description && (
            <p style={{ fontSize: 15, lineHeight: 1.8, color: T.textMuted, margin: "0 0 22px", fontFamily: "'Inter', system-ui, sans-serif" }}>{rescue.description}</p>
          )}

          {rescue.images?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {rescue.images.slice(0, 2).map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: "100%", height: "auto", borderRadius: 10, display: "block" }} onError={e => { e.target.style.display = "none"; }} />
              ))}
            </div>
          )}

          {rescue.youtubeId && (
            <div>
              <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 }}>Rescue video</div>
              <YouTubeEmbed videoId={rescue.youtubeId} T={T} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMPACT ROW (browse mode) ─────────────────────────────────────────────────
function RescueRow({ rescue, onClick, T }) {
  const venom = isVenomous(rescue);
  const accent = venom ? "#e05c3a" : "#5dba6e";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(rescue)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 14, alignItems: "center",
        padding: "12px 16px", borderRadius: 9, cursor: "pointer",
        background: hovered ? T.rowHoverBg : T.rowBg,
        border: `1px solid ${hovered ? accent + "30" : T.navBtnBorder}`,
        transition: "all 0.15s",
      }}
    >
      {rescue.images?.[0]
        ? <img src={rescue.images[0]} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 7 }} onError={e => { e.target.style.display = "none"; }} />
        : <div style={{ width: 48, height: 48, borderRadius: 7, background: venom ? "rgba(224,92,58,0.1)" : "rgba(93,186,110,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Em style={{ fontSize: 20 }}>🐍</Em></div>
      }
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 10, fontWeight: 600, color: accent, letterSpacing: "0.05em" }}>#{rescue.number}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: "'Outfit', system-ui, sans-serif" }}>{rescue.species}</span>
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Inter', system-ui, sans-serif" }}>{rescue.date} - {rescue.location}</div>
      </div>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: venom ? "rgba(224,92,58,0.12)" : "rgba(93,186,110,0.1)", color: accent, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {venom ? "⚠" : "✓"}
        </span>
        {rescue.youtubeId && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(255,40,40,0.1)", color: "#e05050", fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>▶</span>}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("home");
  const [modal, setModal] = useState(null);
  const [modalList, setModalList] = useState([]);
  const [lookupVal, setLookupVal] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [browseYear, setBrowseYear] = useState(null);
  const [browseFilter, setBrowseFilter] = useState("all");
  const [browseSpecies, setBrowseSpecies] = useState("");
  const [randomRescue, setRandomRescue] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("theme") !== "light"; } catch { return true; }
  });

  const T = THEMES[darkMode ? "dark" : "light"];

  useEffect(() => {
    try { localStorage.setItem("theme", darkMode ? "dark" : "light"); } catch {}
  }, [darkMode]);

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error("Could not load rescue-data.json"); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const openModal = useCallback((rescue, list) => { setModal(rescue); setModalList(list || []); }, []);
  const closeModal = useCallback(() => setModal(null), []);
  const modalIdx = modal && modalList.length ? modalList.findIndex(r => r.number === modal.number) : -1;

  const rescues = data ? data.rescues.filter(r => r.year < CURRENT_YEAR) : [];
  const years = [...new Set(rescues.map(r => r.year))].sort();
  const yearCounts = Object.fromEntries(years.map(y => [y, rescues.filter(r => r.year === y).length]));

  const meta = {
    total: rescues.length,
    venomous: rescues.filter(r => isVenomous(r)).length,
    nonVenomous: rescues.filter(r => !isVenomous(r)).length,
    withVideo: rescues.filter(r => r.youtubeId).length,
    latestRescue: rescues.length ? Math.max(...rescues.map(r => r.number)) : 0,
    speciesCount: new Set(rescues.map(r => normalizeSpecies(r.species))).size,
    venPct: rescues.length ? Math.round((rescues.filter(r => isVenomous(r)).length / rescues.length) * 100) : 0,
  };

  // Unique species list for filter dropdown
  const allSpecies = useMemo(() =>
    [...new Set(rescues.map(r => normalizeSpecies(r.species)))].sort(),
    [rescues]
  );

  useEffect(() => {
    if (years.length && browseYear === null) setBrowseYear(Math.max(...years));
  }, [years.length]);

  const handleLookup = useCallback((num) => {
    const n = parseInt(num);
    if (isNaN(n) || n < 1 || n > meta.latestRescue) { setLookupError(`Enter a number between 1 and ${meta.latestRescue}`); return; }
    const found = rescues.find(r => r.number === n);
    if (found) { setLookupError(""); openModal(found, rescues); }
    else setLookupError(`Rescue #${n} not found.`);
  }, [rescues, meta.latestRescue, openModal]);

  const rollRandom = useCallback(() => {
    if (!rescues.length) return;
    const r = rescues[Math.floor(Math.random() * rescues.length)];
    setRandomRescue(r);
    openModal(r, rescues);
  }, [rescues, openModal]);

  const browseList = rescues.filter(r => {
    if (browseYear && r.year !== browseYear) return false;
    if (browseFilter === "venomous" && !isVenomous(r)) return false;
    if (browseFilter === "nonvenomous" && isVenomous(r)) return false;
    if (browseFilter === "video" && !r.youtubeId) return false;
    if (browseSpecies && normalizeSpecies(r.species) !== browseSpecies) return false;
    return true;
  });

  const C = {
    navBtn: (active) => ({
      padding: "6px 14px", borderRadius: 7,
      border: active ? "1px solid rgba(93,186,110,0.4)" : `1px solid ${T.navBtnBorder}`,
      background: active ? "rgba(93,186,110,0.1)" : "transparent",
      color: active ? "#5dba6e" : T.textFaint,
      cursor: "pointer", fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: 600, letterSpacing: "0.06em", transition: "all 0.15s",
    }),
    input: { background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "9px 14px", color: T.text, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif", outline: "none" },
    select: { background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "7px 12px", color: T.text, fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", outline: "none", cursor: "pointer" },
    btn: (color = "#5dba6e") => ({ background: `${color}18`, border: `1px solid ${color}40`, color, borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, letterSpacing: "0.07em", transition: "all 0.15s" }),
    label: { fontFamily: "'Inter', system-ui, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, marginBottom: 14, textTransform: "uppercase" },
    section: { marginBottom: 44 },
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: THEMES.dark.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", fontSize: 12 }}>
      <div style={{ textAlign: "center" }}><Em style={{ fontSize: 40, marginBottom: 20 }}>🐍</Em>LOADING...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: THEMES.dark.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", color: "#e05c3a", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 13, marginBottom: 8, letterSpacing: "0.15em", fontWeight: 600 }}>FAILED TO LOAD DATA</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, backgroundImage: T.bgGradient, color: T.text, fontFamily: "'Inter', system-ui, sans-serif", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollbar}; border-radius: 3px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        select option { background: ${T.bg}; color: ${T.text}; }
      `}</style>

      {/* HEADER */}
      <header style={{ padding: "22px 28px", borderBottom: `1px solid ${T.headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, marginBottom: 6 }}>SHIFTINGRADIUS.COM</div>
          <h1 style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 22, fontWeight: 900, margin: 0, color: T.text, letterSpacing: "-0.01em" }}><Em>🐍</Em> Snake Rescue Dashboard</h1>
          <div style={{ fontSize: 12, color: T.textFaint, marginTop: 4, fontWeight: 500 }}>Bangalore - 2022 to {Math.max(...years)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[[meta.total, "RESCUES"], [meta.venomous, "VENOMOUS"], [meta.nonVenomous, "NON-VENOM"], [meta.withVideo, "VIDEOS"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 20, fontWeight: 700, color: "#5dba6e", lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: T.textFaint, letterSpacing: "0.18em", marginTop: 3 }}>{l}</div>
            </div>
          ))}
          <button onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            style={{ background: T.toggleBg, border: `1px solid ${T.toggleBorder}`, color: T.textMuted, borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontSize: 15, lineHeight: 1, transition: "all 0.2s", display: "flex", alignItems: "center" }}>
            <Em>{darkMode ? "☀️" : "🌙"}</Em>
          </button>
        </div>
      </header>

      {/* NAV */}
      <nav style={{ padding: "10px 28px", borderBottom: `1px solid ${T.navBorder}`, display: "flex", gap: 5, flexWrap: "wrap" }}>
        {[["home","HOME"],["species","SPECIES"],["browse","BROWSE"],["lookup","FIND #"],["random","RANDOM"]].map(([id,label]) => (
          <button key={id} style={C.navBtn(mode===id)} onClick={() => { setMode(id); if (id==="random") rollRandom(); }}>{label}</button>
        ))}
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {/* ── HOME ── */}
        {mode === "home" && (
          <div>
            <div style={{ maxWidth: 620, marginBottom: 40 }}>
              <p style={{ fontSize: 16, lineHeight: 1.9, color: T.textMuted, margin: "0 0 12px" }}>
                A four-year field record: {meta.total} rescues, {meta.speciesCount} species, {meta.venPct}% venomous. From residential gardens to storm drains, every snake in and around where I live, that got a second chance is logged here. What is not logged is an equal (or more) number of calls when we didn't get to even see the snake after reaching the spot.
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: T.textMuted, margin: 0, fontStyle: "italic" }}>
                Annual figures cover completed years only.
              </p>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: T.textMuted, margin: "4px 0 0", opacity: 0.7 }}>
                Data sourced from:{" "}
                <a href="https://shiftingradius.com/snake-rescues" target="_blank" rel="noopener noreferrer" style={{ color: "#5dba6e", textDecoration: "none" }}>
                  shiftingradius.com/snake-rescues
                </a>
              </p>
            </div>

            {/* Year cards */}
            <div style={C.section}>
              <div style={C.label}>By year</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {years.map((y, i) => {
                  const col = YEAR_COLORS[i % YEAR_COLORS.length];
                  return (
                    <div key={y} onClick={() => { setMode("browse"); setBrowseYear(y); }}
                      style={{ background: `${col}12`, border: `1px solid ${col}25`, borderRadius: 12, padding: "18px 24px", cursor: "pointer", minWidth: 90, textAlign: "center", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${col}22`; e.currentTarget.style.borderColor = `${col}50`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${col}12`; e.currentTarget.style.borderColor = `${col}25`; }}
                    >
                      <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 24, fontWeight: 700, color: col }}>{yearCounts[y]}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.textFaint, letterSpacing: "0.15em", marginTop: 4 }}>{y}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly activity */}
            <div style={C.section}>
              <div style={C.label}>Monthly activity</div>
              <MonthlyChart rescues={rescues} years={years} T={T} />
            </div>

            {/* Year trends */}
            <div style={C.section}>
              <div style={C.label}>Year over year</div>
              <div style={{ background: T.cardBg, border: `1px solid ${T.tableBorder}`, borderRadius: 12, overflow: "hidden" }}>
                <YearTrends rescues={rescues} years={years} T={T} />
              </div>
            </div>

            {/* Records */}
            <div style={C.section}>
              <div style={C.label}>Records</div>
              <Records rescues={rescues} T={T} />
            </div>

            {/* Quick actions */}
            <div>
              <div style={C.label}>Quick actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {[
                  { icon: "🎲", label: "Random rescue", sub: `Pull any of the ${meta.total}`, action: () => { setMode("random"); rollRandom(); }, color: "#e8c44a" },
                  { icon: "🔍", label: "Find by number", sub: "Jump to any rescue #", action: () => setMode("lookup"), color: "#6aacde" },
                  { icon: "📹", label: "Only with video", sub: `${meta.withVideo} rescues have footage`, action: () => { setMode("browse"); setBrowseFilter("video"); }, color: "#e05c3a" },
                  { icon: "⚠️", label: "Venomous only", sub: `${meta.venomous} of the big ones`, action: () => { setMode("browse"); setBrowseFilter("venomous"); }, color: "#e05c3a" },
                ].map(item => (
                  <div key={item.label} onClick={item.action}
                    style={{ background: T.rowBg, border: `1px solid ${item.color}18`, borderRadius: 12, padding: "18px", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.rowHoverBg; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.rowBg; }}
                  >
                    <Em style={{ fontSize: 24, marginBottom: 10, display: "block" }}>{item.icon}</Em>
                    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SPECIES ── */}
        {mode === "species" && (
          <div>
            <p style={{ fontSize: 14, color: T.textMuted, marginBottom: 32, maxWidth: 500 }}>Top species rescued each year, by count.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {years.map((y, i) => {
                const col = YEAR_COLORS[i % YEAR_COLORS.length];
                const yearRescues = rescues.filter(r => r.year === y);
                return (
                  <div key={y} style={{ background: T.cardBg, border: `1px solid ${col}20`, borderRadius: 14, padding: "22px 24px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: col }}>{y}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.15em" }}>{yearRescues.length} RESCUES</div>
                    </div>
                    <SpeciesChart rescues={yearRescues} color={col} T={T} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BROWSE ── */}
        {mode === "browse" && (
          <div>
            {/* Year + type filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
              {years.map(y => (
                <button key={y} onClick={() => setBrowseYear(y)} style={{ ...C.navBtn(browseYear === y), fontSize: 12 }}>{y}</button>
              ))}
              <div style={{ height: 20, width: 1, background: T.navBtnBorder }} />
              {[["all","ALL"],["venomous","⚠ VENOMOUS"],["nonvenomous","✓ SAFE"],["video","▶ VIDEO"]].map(([f, l]) => (
                <button key={f} onClick={() => setBrowseFilter(f)} style={C.navBtn(browseFilter === f)}>{l}</button>
              ))}
            </div>

            {/* Species filter */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
              <select
                value={browseSpecies}
                onChange={e => setBrowseSpecies(e.target.value)}
                style={{ ...C.select, minWidth: 180 }}
              >
                <option value="">All species</option>
                {allSpecies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {browseSpecies && (
                <button onClick={() => setBrowseSpecies("")} style={{ ...C.btn("#e05c3a"), padding: "7px 14px" }}>✕ Clear</button>
              )}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: T.textFaint, marginBottom: 14 }}>
              {browseList.length} RESCUES
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {browseList.map(r => <RescueRow key={r.number} rescue={r} onClick={rescue => openModal(rescue, browseList)} T={T} />)}
            </div>
          </div>
        )}

        {/* ── LOOKUP ── */}
        {mode === "lookup" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8, color: T.text }}>Find a rescue</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>Enter any number from 1 to {meta.latestRescue}</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input type="number" min={1} max={meta.latestRescue} value={lookupVal} onChange={e => setLookupVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleLookup(lookupVal); }} placeholder="e.g. 56" style={{ ...C.input, width: 110 }} />
              <button onClick={() => handleLookup(lookupVal)} style={C.btn()}>FIND RESCUE →</button>
            </div>
            {lookupError && <div style={{ fontSize: 13, color: "#e05c3a", marginBottom: 16 }}>{lookupError}</div>}
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, marginBottom: 12 }}>NOTABLE NUMBERS</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[1, 6, 50, 100, 150, 200, 250, 300, 350, meta.latestRescue].map(n => (
                <button key={n} onClick={() => { setLookupVal(String(n)); handleLookup(n); }}
                  style={{ background: T.rowBg, border: `1px solid ${T.navBtnBorder}`, color: T.textMuted, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>
                  #{n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RANDOM ── */}
        {mode === "random" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8, color: T.text }}>Random rescue</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>A random pick from all {meta.total} rescues.</div>
            <button onClick={rollRandom} style={{ ...C.btn("#e8c44a"), marginBottom: 28 }}><Em>🎲</Em> ROLL AGAIN</button>
            {randomRescue && <RescueRow rescue={randomRescue} onClick={rescue => openModal(rescue, rescues)} T={T} />}
          </div>
        )}

      </main>

      {modal && (
        <RescueModal
          rescue={modal} onClose={closeModal}
          onPrev={() => modalIdx > 0 && setModal(modalList[modalIdx - 1])}
          onNext={() => modalIdx < modalList.length - 1 && setModal(modalList[modalIdx + 1])}
          hasPrev={modalIdx > 0} hasNext={modalIdx < modalList.length - 1}
          T={T}
        />
      )}
    </div>
  );
}
