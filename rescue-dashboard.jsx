import { useState, useEffect, useCallback, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Point this at your GitHub Pages raw URL once deployed, e.g.:
// https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/rescue-data.json
const DATA_URL = "./rescue-data.json";

const VENOMOUS_KEYWORDS = ["cobra", "viper", "krait", "saw-scaled"];
const isVenomous = (r) => r.venomous ?? VENOMOUS_KEYWORDS.some(k => r.species?.toLowerCase().includes(k));

// ── YOUTUBE EMBED ─────────────────────────────────────────────────────────────
function YouTubeEmbed({ videoId }) {
  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
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
function RescueModal({ rescue, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const venom = isVenomous(rescue);
  const accent = venom ? "#e05c3a" : "#5dba6e";
  const bg = venom ? "rgba(224,92,58,0.12)" : "rgba(93,186,110,0.12)";

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
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0b1610", border: `1px solid ${accent}35`, borderRadius: 16, maxWidth: 700, width: "100%", position: "relative", boxShadow: `0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px ${accent}15`, maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 0", position: "sticky", top: 0, background: "#0b1610", zIndex: 2, borderRadius: "16px 16px 0 0" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onPrev} disabled={!hasPrev} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: hasPrev ? "#e8dcc8" : "rgba(255,255,255,0.2)", borderRadius: 6, padding: "5px 12px", cursor: hasPrev ? "pointer" : "default", fontSize: 13 }}>←</button>
            <button onClick={onNext} disabled={!hasNext} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: hasNext ? "#e8dcc8" : "rgba(255,255,255,0.2)", borderRadius: 6, padding: "5px 12px", cursor: hasNext ? "pointer" : "default", fontSize: 13 }}>→</button>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8dcc8", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          {/* Tags */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: accent, background: bg, border: `1px solid ${accent}30`, borderRadius: 4, padding: "3px 9px", letterSpacing: 1 }}>
              RESCUE #{rescue.number}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 4, background: venom ? "rgba(224,92,58,0.2)" : "rgba(93,186,110,0.15)", color: accent, letterSpacing: 1, border: `1px solid ${accent}25`, textTransform: "uppercase" }}>
              {venom ? "⚠ VENOMOUS" : "✓ NON-VENOMOUS"}
            </span>
            {rescue.youtubeId && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 4, background: "rgba(255,40,40,0.15)", color: "#ff6b6b", letterSpacing: 1, border: "1px solid rgba(255,40,40,0.25)" }}>▶ VIDEO</span>}
            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", letterSpacing: 1, border: "1px solid rgba(255,255,255,0.08)" }}>{rescue.year}</span>
          </div>

          {/* Species */}
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#e8dcc8", margin: "0 0 10px", lineHeight: 1.2 }}>{rescue.species}</h2>

          {/* Meta */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,0.38)" }}>
            <span>📅 {rescue.date}</span>
            <span>📍 {rescue.location}</span>
          </div>

          {/* Description */}
          <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,0.72)", margin: "0 0 22px", fontFamily: "'Crimson Text', Georgia, serif" }}>{rescue.description}</p>

          {/* Images */}
          {rescue.images?.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: rescue.images.length > 1 ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 22 }}>
              {rescue.images.slice(0, 2).map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 240, display: "block" }} onError={e => { e.target.style.display = "none"; }} />
              ))}
            </div>
          )}

          {/* YouTube */}
          {rescue.youtubeId && (
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Rescue video</div>
              <YouTubeEmbed videoId={rescue.youtubeId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMPACT ROW (browse mode) ─────────────────────────────────────────────────
function RescueRow({ rescue, onClick }) {
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
        padding: "12px 16px", borderRadius: 8, cursor: "pointer",
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? accent + "30" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.15s",
      }}
    >
      {/* Thumbnail */}
      {rescue.images?.[0]
        ? <img src={rescue.images[0]} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} onError={e => { e.target.style.display = "none"; }} />
        : <div style={{ width: 48, height: 48, borderRadius: 6, background: venom ? "rgba(224,92,58,0.12)" : "rgba(93,186,110,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🐍</div>
      }
      {/* Info */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: accent, letterSpacing: 1 }}>#{rescue.number}</span>
          <span style={{ fontSize: 13, color: "#e8dcc8", fontFamily: "'Playfair Display', serif" }}>{rescue.species}</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{rescue.date} · {rescue.location}</div>
      </div>
      {/* Badges */}
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: venom ? "rgba(224,92,58,0.15)" : "rgba(93,186,110,0.12)", color: accent, fontWeight: 700, letterSpacing: 1 }}>
          {venom ? "⚠" : "✓"}
        </span>
        {rescue.youtubeId && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(255,40,40,0.15)", color: "#ff6b6b", fontWeight: 700 }}>▶</span>}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("home");     // home | browse | lookup | random
  const [modal, setModal] = useState(null);
  const [modalList, setModalList] = useState([]); // for prev/next navigation
  const [lookupVal, setLookupVal] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [browseYear, setBrowseYear] = useState(null);
  const [browseFilter, setBrowseFilter] = useState("all"); // all | venomous | nonvenomous | video
  const [randomRescue, setRandomRescue] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load the JSON
  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error("Could not load rescue-data.json"); return r.json(); })
      .then(d => { setData(d); setLoading(false); setBrowseYear(Math.max(...d.rescues.map(r => r.year))); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const openModal = useCallback((rescue, list) => {
    setModal(rescue);
    setModalList(list || []);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const modalIdx = modal && modalList.length ? modalList.findIndex(r => r.number === modal.number) : -1;

  const handleLookup = useCallback((num) => {
    const n = parseInt(num);
    if (!data) return;
    if (isNaN(n) || n < 1 || n > data.meta.latestRescue) {
      setLookupError(`Enter a number between 1 and ${data.meta.latestRescue}`);
      return;
    }
    const found = data.rescues.find(r => r.number === n);
    if (found) { setLookupError(""); openModal(found, data.rescues); }
    else setLookupError(`Rescue #${n} not found in the data.`);
  }, [data, openModal]);

  const rollRandom = useCallback(() => {
    if (!data) return;
    const r = data.rescues[Math.floor(Math.random() * data.rescues.length)];
    setRandomRescue(r);
    openModal(r, data.rescues);
  }, [data, openModal]);

  // Filtered browse list
  const browseList = data ? data.rescues.filter(r => {
    if (browseYear && r.year !== browseYear) return false;
    if (browseFilter === "venomous" && !isVenomous(r)) return false;
    if (browseFilter === "nonvenomous" && isVenomous(r)) return false;
    if (browseFilter === "video" && !r.youtubeId) return false;
    if (searchQuery && !r.species.toLowerCase().includes(searchQuery.toLowerCase()) && !r.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) : [];

  const years = data ? [...new Set(data.rescues.map(r => r.year))].sort() : [];
  const yearCounts = data ? Object.fromEntries(years.map(y => [y, data.rescues.filter(r => r.year === y).length])) : {};

  // ── Loading / Error ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060e08", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 3, fontSize: 13 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 20, animation: "pulse 1.5s ease-in-out infinite" }}>🐍</div>
        LOADING ARCHIVE...
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#060e08", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#e05c3a", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 13, marginBottom: 8, letterSpacing: 2 }}>FAILED TO LOAD DATA</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>{error}<br /><br />Make sure rescue-data.json is in the same directory as index.html, or update DATA_URL in the source.</div>
      </div>
    </div>
  );

  const C = {
    app: { minHeight: "100vh", background: "#060e08", color: "#e8dcc8", fontFamily: "'Crimson Text', Georgia, serif", backgroundImage: "radial-gradient(ellipse at 15% 0%, rgba(18,42,20,0.7) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(35,15,5,0.5) 0%, transparent 55%)" },
    header: { padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 },
    nav: { padding: "12px 28px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 6, flexWrap: "wrap" },
    main: { maxWidth: 900, margin: "0 auto", padding: "28px 20px" },
    navBtn: (active) => ({ padding: "7px 16px", borderRadius: 6, border: active ? "1px solid rgba(93,186,110,0.45)" : "1px solid rgba(255,255,255,0.08)", background: active ? "rgba(93,186,110,0.12)" : "transparent", color: active ? "#5dba6e" : "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, transition: "all 0.15s" }),
    input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "9px 14px", color: "#e8dcc8", fontSize: 15, fontFamily: "monospace", outline: "none" },
    btn: (color = "#5dba6e") => ({ background: `${color}20`, border: `1px solid ${color}45`, color, borderRadius: 7, padding: "9px 20px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, transition: "all 0.15s" }),
  };

  return (
    <div style={C.app}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={C.header}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.25)", marginBottom: 5 }}>SHIFTINGRADIUS.COM</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, margin: 0, color: "#e8dcc8" }}>🐍 Snake Rescue Archive</h1>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 3 }}>Bangalore · 2022–{Math.max(...years)}</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[[data.meta.total, "RESCUES"], [data.meta.venomous, "VENOMOUS"], [data.meta.nonVenomous, "NON-VENOM"], [data.meta.withVideo, "VIDEOS"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#5dba6e", lineHeight: 1 }}>{n}</div>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </header>

      {/* NAV */}
      <nav style={C.nav}>
        {[["home","HOME"],["browse","BROWSE"],["lookup","FIND #"],["random","RANDOM"]].map(([id,label]) => (
          <button key={id} style={C.navBtn(mode===id)} onClick={() => { setMode(id); if (id==="random") rollRandom(); }}>{label}</button>
        ))}
      </nav>

      <main style={C.main}>

        {/* ── HOME ── */}
        {mode === "home" && (
          <div>
            <p style={{ fontSize: 16, lineHeight: 1.9, color: "rgba(255,255,255,0.6)", maxWidth: 580, marginBottom: 36 }}>
              Four years, 372 rescues. Cobras, Vipers, Kraits, Rat snakes, and a dozen others — mostly from gated communities in and around Bangalore. Every rescue logged.
            </p>

            {/* Year cards */}
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.2)", marginBottom: 14, textTransform: "uppercase" }}>By year</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
              {years.map((y, i) => {
                const colors = ["#5dba6e","#6aacde","#e8c44a","#c47ade","#e05c3a"];
                const col = colors[i % colors.length];
                return (
                  <div key={y} onClick={() => { setMode("browse"); setBrowseYear(y); }} style={{ background: `${col}12`, border: `1px solid ${col}25`, borderRadius: 10, padding: "16px 22px", cursor: "pointer", minWidth: 90, textAlign: "center", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${col}22`; e.currentTarget.style.borderColor = `${col}50`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${col}12`; e.currentTarget.style.borderColor = `${col}25`; }}
                  >
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: col }}>{yearCounts[y]}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginTop: 3 }}>{y}</div>
                  </div>
                );
              })}
            </div>

            {/* Quick actions */}
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.2)", marginBottom: 14 }}>QUICK ACTIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {[
                { icon: "🎲", label: "Random rescue", sub: "Pull any of the 372", action: () => { setMode("random"); rollRandom(); }, color: "#e8c44a" },
                { icon: "🔍", label: "Find by number", sub: "Jump to any rescue #", action: () => setMode("lookup"), color: "#6aacde" },
                { icon: "📹", label: "Only with video", sub: `${data.meta.withVideo} rescues have footage`, action: () => { setMode("browse"); setBrowseFilter("video"); }, color: "#e05c3a" },
                { icon: "⚠", label: "Venomous only", sub: `${data.meta.venomous} of the big ones`, action: () => { setMode("browse"); setBrowseFilter("venomous"); }, color: "#e05c3a" },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${item.color}20`, borderRadius: 10, padding: "18px", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#e8dcc8", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BROWSE ── */}
        {mode === "browse" && (
          <div>
            {/* Controls */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
              {years.map(y => (
                <button key={y} onClick={() => setBrowseYear(y)} style={{ ...C.navBtn(browseYear === y), fontSize: 12 }}>{y}</button>
              ))}
              <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.1)" }} />
              {[["all","ALL"],["venomous","⚠ VENOMOUS"],["nonvenomous","✓ SAFE"],["video","▶ VIDEO"]].map(([f, l]) => (
                <button key={f} onClick={() => setBrowseFilter(f)} style={C.navBtn(browseFilter === f)}>{l}</button>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <input style={{ ...C.input, width: "100%", maxWidth: 320, fontSize: 13 }} placeholder="Search species or location..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginBottom: 14 }}>
              {browseList.length} RESCUES
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {browseList.map(r => <RescueRow key={r.number} rescue={r} onClick={rescue => openModal(rescue, browseList)} />)}
            </div>
          </div>
        )}

        {/* ── LOOKUP ── */}
        {mode === "lookup" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 8 }}>Find a rescue</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>Enter any number from 1 to {data.meta.latestRescue}</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                type="number" min={1} max={data.meta.latestRescue}
                value={lookupVal} onChange={e => setLookupVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleLookup(lookupVal); }}
                placeholder="e.g. 56" style={{ ...C.input, width: 110 }}
              />
              <button onClick={() => handleLookup(lookupVal)} style={C.btn()}>FIND RESCUE →</button>
            </div>
            {lookupError && <div style={{ fontSize: 13, color: "#e05c3a", marginBottom: 16 }}>{lookupError}</div>}

            <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 10 }}>NOTABLE NUMBERS</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[1, 6, 50, 100, 150, 200, 250, 300, 350, data.meta.latestRescue].map(n => (
                <button key={n} onClick={() => { setLookupVal(String(n)); handleLookup(n); }}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.45)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>
                  #{n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RANDOM ── */}
        {mode === "random" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 8 }}>Random rescue</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>A random pick from all {data.meta.total} rescues.</div>
            <button onClick={rollRandom} style={{ ...C.btn("#e8c44a"), marginBottom: 28 }}>🎲 ROLL AGAIN</button>
            {randomRescue && <RescueRow rescue={randomRescue} onClick={rescue => openModal(rescue, data.rescues)} />}
          </div>
        )}

      </main>

      {/* MODAL */}
      {modal && (
        <RescueModal
          rescue={modal}
          onClose={closeModal}
          onPrev={() => modalIdx > 0 && setModal(modalList[modalIdx - 1])}
          onNext={() => modalIdx < modalList.length - 1 && setModal(modalList[modalIdx + 1])}
          hasPrev={modalIdx > 0}
          hasNext={modalIdx < modalList.length - 1}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
}
