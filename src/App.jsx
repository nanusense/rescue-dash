import { useState, useEffect, useCallback, useMemo } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const DATA_URL = "./rescue-data.json";
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_COLORS = ["#8fbe86", "#7aaec4", "#d4a85e", "#a894cc", "#d4756a"];

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
const SPECIES_ALIASES = {
  "Annamalai Wolf Snake": "Anamalai Wolf Snake",
  "Buff-Striped Keelback":  "Buff Striped Keelback",
  "Checkered Keelback(S)":  "Checkered Keelback",
};

function normalizeSpecies(s) {
  const titled = (s || "Unknown").trim()
    .toLowerCase()
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
    bg: "#16140f",
    bgGradient: "radial-gradient(ellipse at 20% 0%, rgba(65,52,30,0.3) 0%, transparent 60%)",
    surface: "#1f1c16",
    headerBorder: "rgba(255,255,255,0.05)",
    text: "#f0ebe0",
    textMuted: "rgba(240,235,224,0.6)",
    textFaint: "rgba(240,235,224,0.32)",
    navBorder: "rgba(255,255,255,0.04)",
    navBtnBorder: "rgba(255,255,255,0.07)",
    inputBg: "rgba(255,255,255,0.04)",
    inputBorder: "rgba(255,255,255,0.10)",
    rowBg: "rgba(255,255,255,0.02)",
    rowHoverBg: "rgba(255,255,255,0.05)",
    cardBg: "rgba(255,255,255,0.02)",
    barTrack: "rgba(255,255,255,0.06)",
    modalOverlay: "rgba(0,0,0,0.82)",
    scrollbar: "rgba(255,255,255,0.08)",
    toggleBg: "rgba(255,255,255,0.06)",
    toggleBorder: "rgba(255,255,255,0.10)",
    tableBorder: "rgba(255,255,255,0.05)",
    tableRowHover: "rgba(255,255,255,0.03)",
  },
  light: {
    bg: "#f2ede4",
    bgGradient: "radial-gradient(ellipse at 15% 0%, rgba(180,165,130,0.15) 0%, transparent 55%)",
    surface: "#fdfcf9",
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

// ── VENOMOUS SPLIT RING ───────────────────────────────────────────────────────
function VenomousRing({ venomous, total, T }) {
  const nonVenomous = total - venomous;
  const venPct = total ? Math.round((venomous / total) * 100) : 0;
  const nonPct = 100 - venPct;

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const strokeW = 14;
  const circumference = 2 * Math.PI * r;

  const venDash = (venomous / total) * circumference;
  const nonDash = (nonVenomous / total) * circumference;
  const gap = 3;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.barTrack} strokeWidth={strokeW} />
          {/* Non-venomous arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#7a9e72"
            strokeWidth={strokeW}
            strokeDasharray={`${nonDash - gap} ${circumference - (nonDash - gap)}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
          {/* Venomous arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#b86858"
            strokeWidth={strokeW}
            strokeDasharray={`${venDash - gap} ${circumference - (venDash - gap)}`}
            strokeDashoffset={-(nonDash)}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none"
        }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 24, fontWeight: 700, color: "#b86858", lineHeight: 1 }}>{venPct}%</span>
          <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", marginTop: 3, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>VENOMOUS</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#b86858", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1 }}>{venomous}</div>
            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Venomous ({venPct}%)</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7a9e72", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1 }}>{nonVenomous}</div>
            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Non-venomous ({nonPct}%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LOCATION BUBBLES ──────────────────────────────────────────────────────────
function LocationBubbles({ rescues, T, onLocationClick }) {
  const locations = useMemo(() => {
    const counts = {};
    for (const r of rescues) {
      if (!r.location) continue;
      const loc = r.location.trim();
      counts[loc] = (counts[loc] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [rescues]);

  if (!locations.length) return null;
  const max = locations[0][1];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {locations.map(([loc, count]) => {
        const scale = 0.5 + (count / max) * 0.5;
        const opacity = 0.4 + (count / max) * 0.6;
        const fontSize = Math.round(10 + (count / max) * 5);
        return (
          <div key={loc}
            onClick={() => onLocationClick && onLocationClick(loc)}
            style={{
              background: `rgba(200,135,58,${opacity * 0.15})`,
              border: `1px solid rgba(200,135,58,${opacity * 0.35})`,
              borderRadius: 20,
              padding: `${Math.round(4 + scale * 3)}px ${Math.round(10 + scale * 6)}px`,
              cursor: onLocationClick ? "pointer" : "default",
              transition: "all 0.2s",
            }}>
            <span style={{
              fontSize,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontWeight: count === max ? 700 : 500,
              color: T.textMuted,
              lineHeight: 1,
            }}>{loc}</span>
            <span style={{
              marginLeft: 6,
              fontSize: fontSize - 2,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontWeight: 700,
              color: "#c8873a",
              opacity: 0.8,
            }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── MONTHLY ACTIVITY CHART ────────────────────────────────────────────────────
function MonthlyChart({ rescues, years, T }) {
  const [hovered, setHovered] = useState(null);

  const monthData = useMemo(() => {
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
  // Monsoon months: Jun(5) through Sep(8)
  const MONSOON = [5, 6, 7, 8];

  return (
    <div>
      <div style={{ position: "relative" }}>
        {/* Monsoon band background */}
        <div style={{
          position: "absolute",
          top: 0,
          left: `${(5 / 12) * 100}%`,
          width: `${(4 / 12) * 100}%`,
          height: "100%",
          background: "rgba(200,135,58,0.06)",
          borderRadius: 4,
          pointerEvents: "none",
        }} />
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 110, position: "relative" }}>
          {MONTH_NAMES.map((m, i) => {
            const { total, byYear } = monthData[i];
            const isHovered = hovered === i;
            const isMonsoon = MONSOON.includes(i);
            return (
              <div
                key={m}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "default" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <span style={{
                  fontSize: 9,
                  color: isHovered ? T.text : T.textFaint,
                  fontWeight: isHovered ? 700 : 400,
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  minHeight: 12,
                }}>
                  {total > 0 ? total : ""}
                </span>
                <div style={{
                  width: "100%",
                  background: T.barTrack,
                  borderRadius: "3px 3px 0 0",
                  height: 88,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  overflow: "hidden",
                  position: "relative",
                  outline: isMonsoon && isHovered ? "1px solid rgba(200,135,58,0.3)" : "none",
                }}>
                  <div style={{ width: "100%", height: `${(total / max) * 100}%`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    {years.map((y, yi) => {
                      const c = byYear[y] || 0;
                      if (!c) return null;
                      return (
                        <div key={y} style={{
                          width: "100%",
                          flex: c,
                          background: YEAR_COLORS[yi % YEAR_COLORS.length],
                          opacity: isHovered ? 1 : 0.75,
                          transition: "opacity 0.15s",
                        }} />
                      );
                    })}
                  </div>
                </div>
                <span style={{
                  fontSize: 9,
                  color: isMonsoon ? "rgba(200,135,58,0.7)" : (isHovered ? T.text : T.textFaint),
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontWeight: isHovered ? 700 : (isMonsoon ? 600 : 400),
                }}>{m}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monsoon label */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingLeft: `${(5 / 12) * 100}%` }}>
        <div style={{ width: 20, height: 1, background: "rgba(200,135,58,0.4)" }} />
        <span style={{ fontSize: 9, color: "rgba(200,135,58,0.6)", letterSpacing: "0.12em", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600 }}>MONSOON JUN-SEP</span>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        {years.map((y, i) => (
          <div key={y} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: YEAR_COLORS[i % YEAR_COLORS.length], opacity: 0.8 }} />
            <span style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{y}</span>
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
    const parsed = yr.map(r => parseRescueDate(r.date)).filter(Boolean);
    const months = parsed.length ? new Set(parsed.map(p => p.month)).size : 12;
    return {
      year: y,
      color: YEAR_COLORS[yi % YEAR_COLORS.length],
      total: yr.length,
      venPct: yr.length ? Math.round((ven / yr.length) * 100) : 0,
      vidPct: yr.length ? Math.round((vid / yr.length) * 100) : 0,
      perMonth: (yr.length / 12).toFixed(1),
    };
  });

  const cols = ["Year", "Rescues", "Venomous", "/mo"];

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{
                textAlign: c === "Year" ? "left" : "right",
                padding: "10px 10px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: T.textFaint,
                borderBottom: `1px solid ${T.tableBorder}`,
                whiteSpace: "nowrap",
              }}>
                {c.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.year} style={{ borderBottom: `1px solid ${T.tableBorder}` }}>
              <td style={{ padding: "10px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 28, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, color: r.color, fontSize: 15 }}>{r.year}</span>
                </div>
              </td>
              <td style={{ padding: "10px 10px", textAlign: "right", color: T.text, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{r.total}</td>
              <td style={{ padding: "10px 10px", textAlign: "right", color: r.venPct > 60 ? "#b86858" : T.textMuted }}>{r.venPct}%</td>
              <td style={{ padding: "10px 10px", textAlign: "right", color: T.textMuted }}>{r.perMonth}</td>
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
    const monthYearCounts = {};
    for (const r of rescues) {
      const p = parseRescueDate(r.date);
      if (!p) continue;
      const key = `${MONTH_NAMES[p.month]} ${p.year}`;
      monthYearCounts[key] = (monthYearCounts[key] || 0) + 1;
    }
    const busiestEntry = Object.entries(monthYearCounts).sort((a, b) => b[1] - a[1])[0];
    const busiest = busiestEntry ? { label: busiestEntry[0], count: busiestEntry[1] } : null;

    const speciesCounts = {};
    for (const r of rescues) {
      const s = normalizeSpecies(r.species);
      speciesCounts[s] = (speciesCounts[s] || 0) + 1;
    }
    const speciesEntries = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]);
    const topSpecies = speciesEntries[0];
    const uniqueCount = speciesEntries.length;
    const rarestList = speciesEntries.filter(([, c]) => c === 1);

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
        gapLabel = `${dated[i - 1].date} to ${dated[i].date}`;
      }
    }

    return { busiest, topSpecies, uniqueCount, rarestCount: rarestList.length, longestGap, gapLabel };
  }, [rescues]);

  const cards = [
    { icon: "📊", label: "Busiest month", value: records.busiest?.label ?? "-", sub: records.busiest ? `${records.busiest.count} rescues` : "", color: "#6b8a9e" },
    { icon: "🐍", label: "Most rescued", value: records.topSpecies?.[0] ?? "-", sub: records.topSpecies ? `${records.topSpecies[1]} rescues total` : "", color: "#7a9e72" },
    { icon: "🔭", label: "Species diversity", value: `${records.uniqueCount} species`, sub: `${records.rarestCount} seen only once`, color: "#c47ade" },
    { icon: "⏳", label: "Longest quiet spell", value: `${records.longestGap} days`, sub: records.gapLabel, color: "#e8c44a" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: T.cardBg,
          border: `1px solid ${T.navBtnBorder}`,
          borderLeft: `3px solid ${c.color}`,
          borderRadius: 12,
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}>
          <Em style={{ fontSize: 20, marginBottom: 12, display: "block" }}>{c.icon}</Em>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: T.textFaint, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{c.label.toUpperCase()}</div>
          <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 16, fontWeight: 700, color: c.color, marginBottom: 4, lineHeight: 1.25 }}>{c.value}</div>
          <div style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", lineHeight: 1.5 }}>{c.sub}</div>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
            <span style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500 }}>{species}</span>
            <span style={{ fontSize: 12, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700, color }}>{count}</span>
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
  const accent = venom ? "#b86858" : "#7a9e72";

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
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: T.modalOverlay,
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
        overflowY: "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: T.surface,
        border: `1px solid ${accent}30`,
        borderRadius: "20px 20px 0 0",
        width: "100%",
        maxWidth: 700,
        position: "relative",
        boxShadow: `0 -20px 80px rgba(0,0,0,0.3)`,
        maxHeight: "92vh",
        overflowY: "auto",
        /* On wider screens, center it properly */
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.navBtnBorder }} />
        </div>

        {/* Nav bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 20px 0",
          position: "sticky", top: 0, background: T.surface, zIndex: 2,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onPrev} disabled={!hasPrev} style={{
              background: T.rowBg, border: `1px solid ${T.navBtnBorder}`,
              color: hasPrev ? T.text : T.textFaint,
              borderRadius: 10, padding: "10px 18px",
              cursor: hasPrev ? "pointer" : "default",
              fontSize: 15, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              minWidth: 48, minHeight: 44,
            }}>←</button>
            <button onClick={onNext} disabled={!hasNext} style={{
              background: T.rowBg, border: `1px solid ${T.navBtnBorder}`,
              color: hasNext ? T.text : T.textFaint,
              borderRadius: 10, padding: "10px 18px",
              cursor: hasNext ? "pointer" : "default",
              fontSize: 15, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              minWidth: 48, minHeight: 44,
            }}>→</button>
          </div>
          <button onClick={onClose} style={{
            background: T.rowBg, border: `1px solid ${T.navBtnBorder}`,
            color: T.text, borderRadius: "50%",
            width: 44, height: 44,
            cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 36px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{
              fontSize: 11, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600,
              color: accent, background: `${accent}15`, border: `1px solid ${accent}28`,
              borderRadius: 6, padding: "4px 10px", letterSpacing: "0.05em"
            }}>RESCUE #{rescue.number}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
              background: venom ? "rgba(224,92,58,0.15)" : "rgba(93,186,110,0.12)",
              color: accent, letterSpacing: "0.06em",
              border: `1px solid ${accent}22`, textTransform: "uppercase",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>
              {venom ? "! VENOMOUS" : "NON-VENOMOUS"}
            </span>
            {rescue.youtubeId && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                background: "rgba(255,40,40,0.12)", color: "#e05050",
                letterSpacing: "0.06em", border: "1px solid rgba(255,40,40,0.2)",
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              }}>VIDEO</span>
            )}
            <span style={{
              fontSize: 10, padding: "4px 10px", borderRadius: 6,
              background: T.rowBg, color: T.textFaint,
              letterSpacing: "0.05em", border: `1px solid ${T.navBtnBorder}`,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>{rescue.year}</span>
          </div>

          <h2 style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: 26, fontWeight: 700, color: T.text,
            margin: "0 0 12px", lineHeight: 1.2,
          }}>{rescue.species}</h2>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 22, fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", lineHeight: 1.7 }}>
            {rescue.date && <span><Em>🗒️</Em> {rescue.date}</span>}
            {rescue.location && <span><Em>📍</Em> {rescue.location}</span>}
          </div>

          {rescue.description && (
            <p style={{ fontSize: 15, lineHeight: 1.8, color: T.textMuted, margin: "0 0 24px", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{rescue.description}</p>
          )}

          {rescue.images?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {rescue.images.slice(0, 2).map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }} onError={e => { e.target.style.display = "none"; }} />
              ))}
            </div>
          )}

          {rescue.youtubeId && (
            <div>
              <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 500 }}>Rescue video</div>
              <YouTubeEmbed videoId={rescue.youtubeId} T={T} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RESCUE ROW (browse mode) ──────────────────────────────────────────────────
function RescueRow({ rescue, onClick, T }) {
  const venom = isVenomous(rescue);
  const accent = venom ? "#b86858" : "#7a9e72";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(rescue)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "12px 52px 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        borderRadius: 10,
        cursor: "pointer",
        minHeight: 56,
        background: hovered ? T.rowHoverBg : T.rowBg,
        border: `1px solid ${hovered ? accent + "30" : T.navBtnBorder}`,
        transition: "all 0.15s",
      }}
    >
      {/* Venom dot */}
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0, opacity: 0.85 }} />

      {/* Thumbnail */}
      {rescue.images?.[0]
        ? <img src={rescue.images[0]} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8 }} onError={e => { e.target.style.display = "none"; }} />
        : <div style={{ width: 52, height: 52, borderRadius: 8, background: venom ? "rgba(184,104,88,0.1)" : "rgba(122,158,114,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Em style={{ fontSize: 22 }}>🐍</Em></div>
      }

      {/* Info */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 10, fontWeight: 600, color: accent, letterSpacing: "0.05em" }}>#{rescue.number}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: "'Outfit', system-ui, sans-serif", lineHeight: 1.2 }}>{rescue.species}</span>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", lineHeight: 1.5 }}>
          {rescue.date}{rescue.location ? ` · ${rescue.location}` : ""}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        {rescue.youtubeId && (
          <span style={{ fontSize: 9, padding: "3px 7px", borderRadius: 4, background: "rgba(255,40,40,0.1)", color: "#e05050", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>VID</span>
        )}
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
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseLocation, setBrowseLocation] = useState("");
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
    if (browseSearch && !normalizeSpecies(r.species).toLowerCase().includes(browseSearch.toLowerCase())) return false;
    if (browseLocation && r.location !== browseLocation) return false;
    return true;
  });

  // ── STYLE HELPERS ──────────────────────────────────────────────────────────
  const navBtn = (active) => ({
    padding: "0 18px",
    height: 44,
    borderRadius: 0,
    border: "none",
    borderBottom: active ? "2px solid #c8873a" : "2px solid transparent",
    background: "transparent",
    color: active ? "#c8873a" : T.textFaint,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontWeight: active ? 700 : 500,
    letterSpacing: "0.1em",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  });

  const filterPill = (active, color = "#c8873a") => ({
    padding: "8px 16px",
    borderRadius: 20,
    border: active ? `1px solid ${color}60` : `1px solid ${T.navBtnBorder}`,
    background: active ? `${color}15` : T.rowBg,
    color: active ? color : T.textMuted,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontWeight: active ? 700 : 500,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    flexShrink: 0,
    minHeight: 36,
  });

  const sectionLabel = {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.2em",
    color: T.textFaint,
    marginBottom: 16,
    textTransform: "uppercase",
  };

  const inputStyle = {
    background: T.inputBg,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 8,
    padding: "10px 14px",
    color: T.text,
    fontSize: 15,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    outline: "none",
    width: "100%",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: THEMES.dark.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", fontSize: 12 }}>
      <div style={{ textAlign: "center" }}><Em style={{ fontSize: 40, marginBottom: 20, display: "block" }}>🐍</Em>LOADING...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: THEMES.dark.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#b86858", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 13, marginBottom: 8, letterSpacing: "0.15em", fontWeight: 600 }}>FAILED TO LOAD DATA</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, backgroundImage: T.bgGradient, color: T.text, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-size: 15px; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollbar}; border-radius: 3px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        select option { background: ${T.bg}; color: ${T.text}; }
        @media (min-width: 600px) {
          .modal-sheet {
            align-items: center !important;
            padding: 20px !important;
          }
          .modal-inner {
            border-radius: 16px !important;
            max-height: 90vh !important;
          }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.headerBorder}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Top row: title + toggle */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, marginBottom: 5 }}>SHIFTINGRADIUS.COM</div>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: 22, fontWeight: 800, margin: 0, color: T.text, letterSpacing: "-0.02em", lineHeight: 1.2,
              }}><Em>🐍</Em> Snake Rescue Dashboard</h1>
              <div style={{ fontSize: 12, color: T.textFaint, marginTop: 5, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 400, lineHeight: 1.5 }}>
                Sandeep Nanu · Kengeri, Bangalore · 2022-{Math.max(...years)}
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: T.toggleBg, border: `1px solid ${T.toggleBorder}`,
                color: T.textMuted, borderRadius: 10, padding: "8px 12px",
                cursor: "pointer", fontSize: 15, lineHeight: 1,
                transition: "all 0.2s", display: "flex", alignItems: "center", flexShrink: 0,
                minHeight: 40,
              }}>
              <Em>{darkMode ? "☀️" : "🌙"}</Em>
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 10 }}>
            {[
              [meta.total, "rescues", T.text],
              [meta.speciesCount, "species", T.text],
              [meta.withVideo, "videos", T.textMuted],
            ].map(([n, l, col], idx) => (
              <div key={l} style={{
                textAlign: "left",
                paddingRight: 20,
                marginRight: 20,
                borderRight: idx < 2 ? `1px solid ${T.navBtnBorder}` : "none",
              }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: col, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 10, color: T.textFaint, letterSpacing: "0.08em", marginTop: 3, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Venomous split bar */}
          <div>
            <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", gap: 1, marginBottom: 6 }}>
              <div style={{ flex: meta.venomous, background: "#b86858", opacity: 0.75, borderRadius: "3px 0 0 3px" }} />
              <div style={{ flex: meta.nonVenomous, background: "#7a9e72", opacity: 0.65, borderRadius: "0 3px 3px 0" }} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 10, color: "#b86858", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600 }}>
                {meta.venPct}% venomous ({meta.venomous})
              </span>
              <span style={{ fontSize: 10, color: "#7a9e72", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600 }}>
                {100 - meta.venPct}% non-venomous ({meta.nonVenomous})
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav style={{
        borderBottom: `1px solid ${T.navBorder}`,
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
        <div style={{ display: "flex", paddingLeft: 20, minWidth: "max-content", maxWidth: 900, margin: "0 auto" }}>
          {[["home","HOME"],["species","SPECIES"],["browse","BROWSE"],["lookup","FIND #"],["random","RANDOM"]].map(([id, label]) => (
            <button
              key={id}
              style={navBtn(mode === id)}
              onClick={() => { setMode(id); if (id === "random") rollRandom(); }}
            >{label}</button>
          ))}
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* ── HOME ── */}
        {mode === "home" && (
          <div>
            {/* Intro */}
            <div style={{ maxWidth: 620, marginBottom: 40 }}>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: T.textMuted, margin: "0 0 10px", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                A four-year field record: {meta.total} rescues, {meta.speciesCount} species, {meta.venPct}% venomous. From residential gardens to storm drains, every snake in and around where I live that got a second chance is logged here.
              </p>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: T.textFaint, margin: 0 }}>
                Annual figures cover completed years only. Data sourced from{" "}
                <a href="https://shiftingradius.com/snake-rescues" target="_blank" rel="noopener noreferrer" style={{ color: "#c8873a", textDecoration: "none" }}>
                  shiftingradius.com
                </a>
              </p>
            </div>

            {/* Year cards */}
            <div style={{ marginBottom: 44 }}>
              <div style={sectionLabel}>By year</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 10 }}>
                {years.map((y, i) => {
                  const col = YEAR_COLORS[i % YEAR_COLORS.length];
                  return (
                    <div
                      key={y}
                      onClick={() => { setMode("browse"); setBrowseYear(y); }}
                      style={{
                        background: `${col}12`, border: `1px solid ${col}25`,
                        borderRadius: 14, padding: "18px 12px",
                        cursor: "pointer", textAlign: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${col}22`; e.currentTarget.style.borderColor = `${col}50`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${col}12`; e.currentTarget.style.borderColor = `${col}25`; }}
                    >
                      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 28, fontWeight: 700, color: col, lineHeight: 1 }}>{yearCounts[y]}</div>
                      <div style={{ fontSize: 10, color: T.textFaint, letterSpacing: "0.12em", marginTop: 7 }}>{y}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Venomous ring */}
            <div style={{ marginBottom: 44 }}>
              <div style={sectionLabel}>Venomous split</div>
              <div style={{ background: T.cardBg, border: `1px solid ${T.tableBorder}`, borderRadius: 14, padding: "22px 24px" }}>
                <VenomousRing venomous={meta.venomous} total={meta.total} T={T} />
              </div>
            </div>

            {/* Monthly activity */}
            <div style={{ marginBottom: 44 }}>
              <div style={sectionLabel}>Monthly activity</div>
              <div style={{ background: T.cardBg, border: `1px solid ${T.tableBorder}`, borderRadius: 14, padding: "22px 24px" }}>
                <MonthlyChart rescues={rescues} years={years} T={T} />
              </div>
            </div>

            {/* Location hotspots */}
            <div style={{ marginBottom: 44 }}>
              <div style={sectionLabel}>Where they were found</div>
              <div style={{ background: T.cardBg, border: `1px solid ${T.tableBorder}`, borderRadius: 14, padding: "20px 24px" }}>
                <LocationBubbles rescues={rescues} T={T} onLocationClick={loc => {
                  setBrowseLocation(loc);
                  setBrowseYear(null);
                  setBrowseFilter("all");
                  setBrowseSearch("");
                  setBrowseSpecies("");
                  setMode("browse");
                }} />
              </div>
            </div>

            {/* Year over year */}
            <div style={{ marginBottom: 44 }}>
              <div style={sectionLabel}>Year over year</div>
              <div style={{ background: T.cardBg, border: `1px solid ${T.tableBorder}`, borderRadius: 14, overflow: "hidden" }}>
                <YearTrends rescues={rescues} years={years} T={T} />
              </div>
            </div>

            {/* Records */}
            <div style={{ marginBottom: 44 }}>
              <div style={sectionLabel}>Records</div>
              <Records rescues={rescues} T={T} />
            </div>

            {/* Quick actions */}
            <div>
              <div style={sectionLabel}>Quick actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                {[
                  { icon: "🎲", label: "Random rescue", sub: `Pull any of the ${meta.total}`, action: () => { setMode("random"); rollRandom(); }, color: "#e8c44a" },
                  { icon: "🔍", label: "Find by number", sub: "Jump to any rescue #", action: () => setMode("lookup"), color: "#6b8a9e" },
                  { icon: "📹", label: "Only with video", sub: `${meta.withVideo} rescues have footage`, action: () => { setMode("browse"); setBrowseFilter("video"); }, color: "#b86858" },
                  { icon: "!", label: "Venomous only", sub: `${meta.venomous} of the big ones`, action: () => { setMode("browse"); setBrowseFilter("venomous"); }, color: "#b86858" },
                ].map(item => (
                  <div
                    key={item.label}
                    onClick={item.action}
                    style={{
                      background: T.rowBg, border: `1px solid ${item.color}18`,
                      borderLeft: `3px solid ${item.color}60`,
                      borderRadius: 12, padding: "18px", cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.rowHoverBg; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.rowBg; }}
                  >
                    <Em style={{ fontSize: 22, marginBottom: 10, display: "block" }}>{item.icon}</Em>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SPECIES ── */}
        {mode === "species" && (
          <div>
            <p style={{ fontSize: 15, color: T.textMuted, marginBottom: 32, maxWidth: 500, lineHeight: 1.7 }}>Top species rescued each year, by count.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20 }}>
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
            {/* Active location filter banner */}
            {browseLocation && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(200,135,58,0.10)", border: "1px solid rgba(200,135,58,0.30)",
                borderRadius: 10, padding: "10px 16px", marginBottom: 14,
              }}>
                <span style={{ fontSize: 13, color: "#c8873a", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600 }}>
                  📍 {browseLocation}
                </span>
                <button onClick={() => setBrowseLocation("")} style={{
                  background: "none", border: "none", color: "#c8873a", cursor: "pointer",
                  fontSize: 18, lineHeight: 1, padding: "0 4px",
                }}>×</button>
              </div>
            )}

            {/* Search */}
            <div style={{ marginBottom: 14 }}>
              <input
                type="text"
                placeholder="Search species..."
                value={browseSearch}
                onChange={e => setBrowseSearch(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Year chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 10, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
              {years.map(y => (
                <button key={y} onClick={() => setBrowseYear(y)} style={filterPill(browseYear === y)}>{y}</button>
              ))}
            </div>

            {/* Filter chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 10, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
              {[["all","All"],["venomous","Venomous"],["nonvenomous","Non-venomous"],["video","With video"]].map(([f, l]) => (
                <button key={f} onClick={() => setBrowseFilter(f)} style={filterPill(browseFilter === f)}>{l}</button>
              ))}
            </div>

            {/* Species dropdown */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
              <select
                value={browseSpecies}
                onChange={e => setBrowseSpecies(e.target.value)}
                style={{
                  background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                  borderRadius: 8, padding: "9px 14px", color: T.text,
                  fontSize: 13, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  outline: "none", cursor: "pointer", minWidth: 180,
                }}
              >
                <option value="">All species</option>
                {allSpecies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {browseSpecies && (
                <button
                  onClick={() => setBrowseSpecies("")}
                  style={{
                    background: "rgba(184,104,88,0.1)", border: "1px solid rgba(184,104,88,0.25)",
                    color: "#b86858", borderRadius: 8, padding: "9px 14px",
                    cursor: "pointer", fontSize: 12, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  }}>x Clear</button>
              )}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: T.textFaint, marginBottom: 14 }}>
              {browseList.length} RESCUES
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {browseList.map(r => (
                <RescueRow key={r.number} rescue={r} onClick={rescue => openModal(rescue, browseList)} T={T} />
              ))}
            </div>
          </div>
        )}

        {/* ── LOOKUP ── */}
        {mode === "lookup" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8, color: T.text }}>Find a rescue</div>
            <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 24, lineHeight: 1.7 }}>Enter any number from 1 to {meta.latestRescue}</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                type="number" min={1} max={meta.latestRescue}
                value={lookupVal}
                onChange={e => setLookupVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleLookup(lookupVal); }}
                placeholder="e.g. 56"
                style={{ ...inputStyle, width: 120 }}
              />
              <button
                onClick={() => handleLookup(lookupVal)}
                style={{
                  background: "rgba(200,135,58,0.12)", border: "1px solid rgba(200,135,58,0.35)",
                  color: "#c8873a", borderRadius: 8, padding: "10px 22px",
                  cursor: "pointer", fontSize: 12, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontWeight: 700, letterSpacing: "0.07em", minHeight: 44,
                }}>FIND RESCUE</button>
            </div>
            {lookupError && <div style={{ fontSize: 13, color: "#b86858", marginBottom: 16, lineHeight: 1.6 }}>{lookupError}</div>}

            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, marginBottom: 12 }}>NOTABLE NUMBERS</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[1, 6, 50, 100, 150, 200, 250, 300, 350, meta.latestRescue].map(n => (
                <button key={n} onClick={() => { setLookupVal(String(n)); handleLookup(n); }}
                  style={{
                    background: T.rowBg, border: `1px solid ${T.navBtnBorder}`,
                    color: T.textMuted, borderRadius: 8, padding: "8px 14px",
                    cursor: "pointer", fontSize: 12,
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600,
                    minHeight: 40,
                  }}>
                  #{n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RANDOM ── */}
        {mode === "random" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8, color: T.text }}>Random rescue</div>
            <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 24, lineHeight: 1.7 }}>A random pick from all {meta.total} rescues.</div>
            <button onClick={rollRandom} style={{
              background: "rgba(232,196,74,0.12)", border: "1px solid rgba(232,196,74,0.35)",
              color: "#e8c44a", borderRadius: 8, padding: "12px 24px",
              cursor: "pointer", fontSize: 12, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontWeight: 700, letterSpacing: "0.07em", marginBottom: 28, minHeight: 44,
            }}>
              <Em>🎲</Em> ROLL AGAIN
            </button>
            {randomRescue && (
              <RescueRow rescue={randomRescue} onClick={rescue => openModal(rescue, rescues)} T={T} />
            )}
          </div>
        )}

      </main>

      {modal && (
        <RescueModal
          rescue={modal} onClose={closeModal}
          onPrev={() => modalIdx > 0 && setModal(modalList[modalIdx - 1])}
          onNext={() => modalIdx < modalList.length - 1 && setModal(modalList[modalIdx + 1])}
          hasPrev={modalIdx > 0}
          hasNext={modalIdx < modalList.length - 1}
          T={T}
        />
      )}
    </div>
  );
}
