import { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext } from "react";
import { supabase } from "./lib/supabase";
import JSZip from "jszip";

const MobileCtx = createContext(false);
const useMobile = () => useContext(MobileCtx);
function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ─── KONSTANTY ────────────────────────────────────────────────────────────────
const ZANRY = [
  "Akční","Animovaný","Biografie","Dobrodružný","Dokument","Drama",
  "Fantasy","Historický","Horor","Komedie","Krimi","Krátkometrážní",
  "Muzikál","Mysteriózní","Romantický","Rodinný","Sci-Fi","Sport",
  "Stand-up","Thriller","Válečný","Western",
];
const PLATFORMY = [
  "Apple TV+","Canal+","Disney+","Edisonline","HBO Max",
  "Kino","Kino - IMAX","KVIFF TV","Letní kino","MUBI",
  "Netflix","Oneplay","Prime Video","SkyShowtime",
];
const STAV_SERIALU = ["Sleduji","Dokoukáno","Nedokončeno","Plánuji"];
const SERIE = ["První","Druhá","Třetí","Čtvrtá","Pátá","Šestá","Sedmá","Osmá"];
const NARODNOSTI = [
  "USA","Velká Británie","Francie","Německo","Itálie","Španělsko",
  "Česká republika","Slovensko","Japonsko","Jižní Korea","Austrálie",
  "Kanada","Mexiko","Brazílie","Dánsko","Švédsko","Norsko","Finsko",
  "Polsko","Maďarsko","Rusko","Čína","Irsko","Belgie","Nizozemsko",
  "Švýcarsko","Rakousko","Indie","Nový Zéland","Izrael","Írán","Řecko",
];

// ─── HOOKS & UTILS ────────────────────────────────────────────────────────────
function useLS(key, init) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = useCallback((x) => {
    setV(prev => {
      const next = typeof x === "function" ? x(prev) : x;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [v, set];
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s) => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}.${m}.${y}`; };

function toCSV(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = v => {
    if (v == null) return "";
    const s = Array.isArray(v) ? v.join(", ") : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map(r => cols.map(c => escape(r[c])).join(","))].join("\n");
}

async function stahnoutZalohu() {
  const [filmy, serialy, herci, reziseri] = await Promise.all([
    supabase.from("filmy").select("*").then(r => r.data ?? []),
    supabase.from("serialy").select("*").then(r => r.data ?? []),
    supabase.from("herci").select("*").then(r => r.data ?? []),
    supabase.from("reziseri").select("*").then(r => r.data ?? []),
  ]);
  const zip = new JSZip();
  zip.file("filmy.csv", toCSV(filmy));
  zip.file("serialy.csv", toCSV(serialy));
  zip.file("herci.csv", toCSV(herci));
  zip.file("reziseri.csv", toCSV(reziseri));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `filmoteka-zaloha-${today()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
async function fetchTmdbCeskyNazev(nazev, rok, typ = "movie") {
  if (!TMDB_KEY || !nazev) return null;
  const endpoint = typ === "tv" ? "search/tv" : "search/movie";
  const getTitle = (item) => (typ === "tv" ? item.name : item.title) || null;
  const search = async (withYear) => {
    const yearParam = withYear && rok
      ? (typ === "tv" ? `&first_air_date_year=${rok}` : `&year=${rok}`)
      : "";
    const res = await fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(nazev)}${yearParam}&language=cs`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0] ?? null;
  };
  try {
    let item = await search(true);
    if (!item) item = await search(false);
    if (!item) return null;
    const nazevCs = getTitle(item);
    return nazevCs && nazevCs !== nazev ? nazevCs : null;
  } catch (e) { console.error("TMDB error:", e); return null; }
}

// ─── FONTY ────────────────────────────────────────────────────────────────────
const F = {
  display: '"Fraunces", "Georgia", serif',
  sans:    '"Inter", system-ui, sans-serif',
  mono:    '"JetBrains Mono", "Menlo", monospace',
};

// ─── TÉMA ─────────────────────────────────────────────────────────────────────
const TDark = {
  bg: "#0f0e0c", surface: "#16150f", elevated: "#1a1813",
  border: "#2a271f", borderHover: "#3a3628",
  gold: "#e85a44", goldBg: "#3a1a14",
  text: "#f1ece0", muted: "#5f594c", dimmer: "#2a271f",
  inkSoft: "#cfc9b8", inkMuted: "#8a8370",
  danger: "#e85a44", blue: "#4a9eca", purple: "#9b6ec8", green: "#4caf7d", orange: "#e67e22",
};
const TLight = {
  bg: "#f5f1e8", surface: "#fbf8f0", elevated: "#efeadd",
  border: "#e2dccc", borderHover: "#c8c0ac",
  gold: "#c43a2a", goldBg: "#f1dcd6",
  text: "#141311", muted: "#8f877a", dimmer: "#e2dccc",
  inkSoft: "#3a3632", inkMuted: "#6b645a",
  danger: "#c43a2a", blue: "#2563a8", purple: "#7c3aad", green: "#1e7e4a", orange: "#b45309",
};
let T = { ...TDark };

let inp = {
  background: T.elevated, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 4, padding: "7px 10px", fontSize: 13, width: "100%",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
let btnPrimary = {
  padding: "7px 18px", borderRadius: 4, border: "none", cursor: "pointer",
  fontSize: 12, fontWeight: 700, background: T.gold, color: "#0b0b0d",
  letterSpacing: "0.05em", textTransform: "uppercase",
};
let btnSecondary = {
  padding: "6px 12px", borderRadius: 4, cursor: "pointer",
  fontSize: 11, fontWeight: 500, background: "transparent",
  border: `1px solid ${T.border}`, color: T.muted,
};
let btnDanger = { ...btnSecondary, color: T.danger + "bb", borderColor: T.danger + "44" };

function applyTheme(dark) {
  Object.assign(T, dark ? TDark : TLight);
  Object.assign(inp, { background: T.elevated, border: `1px solid ${T.border}`, color: T.text, fontFamily: F.sans });
  Object.assign(btnPrimary, { background: T.gold, color: dark ? "#0f0e0c" : "#fff8f0" });
  Object.assign(btnSecondary, { border: `1px solid ${T.border}`, color: T.muted });
  Object.assign(btnDanger, { ...btnSecondary, color: T.danger + "bb", borderColor: T.danger + "44" });
  Object.assign(cardStyle, { background: T.surface, border: `1px solid ${T.border}` });
  document.body.style.background = T.bg;
  document.body.style.fontFamily = F.sans;
  document.body.style.color = T.text;
}

// ─── PRIMITIVA ────────────────────────────────────────────────────────────────
function Modal({ open, title, onClose, onSave, children, wide }) {
  const isMobile = useMobile();
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
      zIndex: 1000, padding: isMobile ? 0 : 20,
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: isMobile ? "12px 12px 0 0" : 8,
        width: isMobile ? "100%" : (wide ? 740 : 520),
        maxWidth: "100%", maxHeight: isMobile ? "92vh" : "92vh",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: F.display, letterSpacing: "0.04em" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>{children}</div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={btnSecondary}>Zrušit</button>
          <button onClick={onSave} style={btnPrimary}>Uložit</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
function TextInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <Field label={label}>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} />
    </Field>
  );
}
function SelectInput({ label, value, onChange, options, placeholder }) {
  return (
    <Field label={label}>
      <select value={value ?? ""} onChange={e => onChange(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
        <option value="">{placeholder ?? "Vyberte..."}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}
function CheckInput({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 6 }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: T.gold, width: 13, height: 13 }} />
      <span style={{ fontSize: 13, color: T.text }}>{label}</span>
    </label>
  );
}

function GenreSelector({ value = [], onChange }) {
  const toggle = g => onChange(value.includes(g) ? value.filter(x => x !== g) : [...value, g]);
  return (
    <Field label="Žánry">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {ZANRY.map(g => (
          <button key={g} onClick={() => toggle(g)} style={{
            padding: "3px 9px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            border: `1px solid ${value.includes(g) ? T.gold : T.border}`,
            background: value.includes(g) ? T.gold : "transparent",
            color: value.includes(g) ? "#0b0b0d" : T.muted,
            fontWeight: value.includes(g) ? 600 : 400,
          }}>{g}</button>
        ))}
      </div>
    </Field>
  );
}

function RatingInput({ value, onChange }) {
  const colors = [null, "#e74c3c","#e74c3c","#e67e22","#e67e22","#e67e22","#f1c40f","#f1c40f","#2ecc71","#2ecc71","#27ae60"];
  return (
    <Field label="Hodnocení">
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => {
          const active = n <= (value ?? 0);
          const c = colors[value] ?? T.gold;
          return (
            <button key={n} onClick={() => onChange(n === value ? null : n)} style={{
              width: 28, height: 28, borderRadius: 4,
              border: `1px solid ${active ? c : T.border}`,
              background: active ? c + "33" : "transparent",
              color: active ? c : T.muted,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>{n}</button>
          );
        })}
        {value && <button onClick={() => onChange(null)} style={{ ...btnSecondary, padding: "3px 8px", marginLeft: 4, fontSize: 11 }}>✕ Smazat</button>}
      </div>
    </Field>
  );
}

function PersonSearch({ label, persons, selected, onChange, multi = false }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selectedArr = multi ? (selected ?? []) : (selected ? [selected] : []);
  const selectedPersons = persons.filter(p => selectedArr.includes(p.id));

  const filtered = useMemo(() =>
    persons.filter(p =>
      p.jmeno.toLowerCase().includes(q.toLowerCase()) && !selectedArr.includes(p.id)
    ).slice(0, 10),
    [persons, q, selectedArr]
  );

  const add = id => {
    if (multi) onChange([...selectedArr, id]);
    else onChange(id);
    setQ("");
    if (!multi) setOpen(false);
  };
  const remove = id => {
    if (multi) onChange(selectedArr.filter(x => x !== id));
    else onChange(null);
  };

  return (
    <Field label={label}>
      <div ref={ref} style={{ position: "relative" }}>
        {selectedPersons.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {selectedPersons.map(p => (
              <span key={p.id} style={{
                background: T.elevated, border: `1px solid ${T.border}`,
                padding: "3px 8px", borderRadius: 3, fontSize: 12, color: T.text,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {p.jmeno}
                <button onClick={() => remove(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Vyhledat..."
          style={inp}
        />
        {open && filtered.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0,
            background: T.elevated, border: `1px solid ${T.border}`,
            borderRadius: 4, zIndex: 300, maxHeight: 210, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => add(p.id)} style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13, color: T.text,
                display: "flex", gap: 8, alignItems: "center",
              }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>{p.jmeno}</span>
                {p.narodnost && <span style={{ color: T.muted, fontSize: 11 }}>{p.narodnost}</span>}
                {p.rokNarozeni && <span style={{ color: T.muted, fontSize: 11 }}>*{p.rokNarozeni}</span>}
              </div>
            ))}
          </div>
        )}
        {open && q && filtered.length === 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0,
            background: T.elevated, border: `1px solid ${T.border}`,
            borderRadius: 4, zIndex: 300, padding: "10px 12px",
            fontSize: 12, color: T.muted,
          }}>
            Nenalezeno — osobu přidej v záložce Herci / Režiséři
          </div>
        )}
      </div>
    </Field>
  );
}

// ─── FORMY ────────────────────────────────────────────────────────────────────
const emptyFilm = () => ({
  id: uid(), datum: today(), nazev: "", ceskyNazev: "", zanry: [], rok: "", platforma: "",
  stopaz: "", reziserIds: [], herciIds: [],
  hodnoceni: null, rewatch: false, ceskyFilm: false, doporuceni: false,
});
const emptySerial = () => ({
  id: uid(), nazev: "", ceskyNazev: "", zanry: [], rok: "", platforma: "",
  serie: [], pocetDilu: "", stav: "Sleduji",
  zacatekSledovani: today(), konecSledovani: "",
  hodnoceni: null, herciIds: [],
});
const emptyOsoba = () => ({
  id: uid(), jmeno: "", narodnost: "", rokNarozeni: "", zijici: "Ano",
  oblibeny: false, neoblibeny: false,
});

function FilmForm({ data, setData, herci, reziseri }) {
  const u = (k, v) => setData(d => ({ ...d, [k]: v }));
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const nacistZTmdb = async () => {
    setTmdbLoading(true);
    const nazev = await fetchTmdbCeskyNazev(data.nazev, data.rok, "movie");
    if (nazev) u("ceskyNazev", nazev);
    setTmdbLoading(false);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
      <div style={{ gridColumn: "1/-1" }}>
        <TextInput label="Originální název *" value={data.nazev} onChange={v => u("nazev", v)} />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TextInput label="Český název" value={data.ceskyNazev} onChange={v => u("ceskyNazev", v)} />
          </div>
          <button onClick={nacistZTmdb} disabled={tmdbLoading || !data.nazev} style={{ ...btnSecondary, marginBottom: 12, whiteSpace: "nowrap", opacity: (!data.nazev || tmdbLoading) ? 0.5 : 1 }}>
            {tmdbLoading ? "…" : "Načíst z TMDB"}
          </button>
        </div>
      </div>
      <TextInput label="Datum zhlédnutí" value={data.datum} onChange={v => u("datum", v)} type="date" />
      <TextInput label="Rok vydání" value={data.rok} onChange={v => u("rok", v)} type="number" placeholder="2024" />
      <SelectInput label="Platforma" value={data.platforma} onChange={v => u("platforma", v)} options={PLATFORMY} />
      <TextInput label="Stopáž (min)" value={data.stopaz} onChange={v => u("stopaz", v)} type="number" placeholder="120" />
      <div style={{ gridColumn: "1/-1" }}>
        <GenreSelector value={data.zanry} onChange={v => u("zanry", v)} />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <PersonSearch label="Režisér" persons={reziseri} selected={data.reziserIds} onChange={v => u("reziserIds", v)} multi />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <PersonSearch label="Herci" persons={herci} selected={data.herciIds} onChange={v => u("herciIds", v)} multi />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <RatingInput value={data.hodnoceni} onChange={v => u("hodnoceni", v)} />
      </div>
      <Field label="Příznaky">
        <CheckInput label="Rewatch" checked={data.rewatch} onChange={v => u("rewatch", v)} />
        <CheckInput label="Český film" checked={data.ceskyFilm} onChange={v => u("ceskyFilm", v)} />
        <CheckInput label="Doporučil bych" checked={data.doporuceni} onChange={v => u("doporuceni", v)} />
      </Field>
    </div>
  );
}

function SerialForm({ data, setData, herci }) {
  const u = (k, v) => setData(d => ({ ...d, [k]: v }));
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const nacistZTmdb = async () => {
    setTmdbLoading(true);
    const nazev = await fetchTmdbCeskyNazev(data.nazev, data.rok, "tv");
    if (nazev) u("ceskyNazev", nazev);
    setTmdbLoading(false);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
      <div style={{ gridColumn: "1/-1" }}>
        <TextInput label="Originální název *" value={data.nazev} onChange={v => u("nazev", v)} />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TextInput label="Český název" value={data.ceskyNazev} onChange={v => u("ceskyNazev", v)} />
          </div>
          <button onClick={nacistZTmdb} disabled={tmdbLoading || !data.nazev} style={{ ...btnSecondary, marginBottom: 12, whiteSpace: "nowrap", opacity: (!data.nazev || tmdbLoading) ? 0.5 : 1 }}>
            {tmdbLoading ? "…" : "Načíst z TMDB"}
          </button>
        </div>
      </div>
      <TextInput label="Rok vydání" value={data.rok} onChange={v => u("rok", v)} type="number" placeholder="2024" />
      <SelectInput label="Platforma" value={data.platforma} onChange={v => u("platforma", v)} options={PLATFORMY} />
      <TextInput label="Začátek sledování" value={data.zacatekSledovani} onChange={v => u("zacatekSledovani", v)} type="date" />
      <TextInput label="Konec sledování" value={data.konecSledovani} onChange={v => u("konecSledovani", v)} type="date" />
      <Field label="Série">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {SERIE.map(s => {
            const val = Array.isArray(data.serie) ? data.serie : (data.serie ? data.serie.split(",").map(x => x.trim()).filter(Boolean) : []);
            const active = val.includes(s);
            const toggle = () => { const next = active ? val.filter(x => x !== s) : [...val, s]; u("serie", next); };
            return (
              <button key={s} onClick={toggle} style={{ padding: "3px 9px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: `1px solid ${active ? T.gold : T.border}`, background: active ? T.gold : "transparent", color: active ? "#0b0b0d" : T.muted, fontWeight: active ? 600 : 400 }}>{s}</button>
            );
          })}
        </div>
      </Field>
      <TextInput label="Počet dílů" value={data.pocetDilu} onChange={v => u("pocetDilu", v)} type="number" />
      <SelectInput label="Stav" value={data.stav} onChange={v => u("stav", v)} options={STAV_SERIALU} />
      <div style={{ gridColumn: "1/-1" }}>
        <GenreSelector value={data.zanry} onChange={v => u("zanry", v)} />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <PersonSearch label="Herci" persons={herci} selected={data.herciIds} onChange={v => u("herciIds", v)} multi />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <RatingInput value={data.hodnoceni} onChange={v => u("hodnoceni", v)} />
      </div>
    </div>
  );
}

function OsobaForm({ data, setData, showNeoblibeny = false }) {
  const u = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
      <div style={{ gridColumn: "1/-1" }}>
        <TextInput label="Jméno *" value={data.jmeno} onChange={v => u("jmeno", v)} />
      </div>
      <SelectInput label="Národnost" value={data.narodnost} onChange={v => u("narodnost", v)} options={NARODNOSTI} />
      <TextInput label="Rok narození" value={data.rokNarozeni} onChange={v => u("rokNarozeni", v)} type="number" placeholder="1970" />
      <SelectInput label="Žijící" value={data.zijici} onChange={v => u("zijici", v)} options={["Ano", "Ne"]} />
      <div style={{ gridColumn: "1/-1" }}>
        <Field label="Příznaky">
          <div style={{ display: "flex", gap: 24 }}>
            <CheckInput label="Oblíbený" checked={data.oblibeny} onChange={v => u("oblibeny", v)} />
            {showNeoblibeny && <CheckInput label="Neoblíbený" checked={data.neoblibeny} onChange={v => u("neoblibeny", v)} />}
          </div>
        </Field>
      </div>
    </div>
  );
}

// ─── SDÍLENÉ UI ───────────────────────────────────────────────────────────────
function Badge({ children, color }) {
  return (
    <span style={{
      padding: "2px 7px", borderRadius: 3, fontSize: 10, fontWeight: 600,
      background: color + "22", color, border: `1px solid ${color}44`,
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function Rating({ value }) {
  if (!value) return <span style={{ color: T.muted, fontSize: 12 }}>—</span>;
  const color = value >= 8 ? T.green : value >= 6 ? T.gold : value >= 4 ? T.orange : T.danger;
  return (
    <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: F.display }}>
      {value}<span style={{ fontSize: 10, color: T.muted, fontFamily: "inherit" }}>/10</span>
    </span>
  );
}

function TagList({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {items.map(g => (
        <span key={g} style={{ fontSize: 10, color: T.muted, background: T.elevated, padding: "1px 6px", borderRadius: 2, border: `1px solid ${T.border}` }}>{g}</span>
      ))}
    </div>
  );
}

// ─── KARTY ────────────────────────────────────────────────────────────────────
let cardStyle = {
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 6, padding: "13px 16px", marginBottom: 8,
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  transition: "border-color 0.15s",
};

const FILM_COLS = "80px minmax(0,1fr) 120px 100px 54px 160px";

function FilmTableHeader() {
  const isMobile = useMobile();
  if (isMobile) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: FILM_COLS, gap: 12,
      padding: "8px 16px", borderBottom: `1px solid ${T.border}`,
      fontFamily: F.mono, fontSize: 9, color: T.muted,
      letterSpacing: "0.14em", textTransform: "uppercase",
      background: T.surface,
    }}>
      <div>datum</div><div>název</div><div>žánr</div><div>platforma</div><div>stopáž</div><div style={{ paddingLeft: 16 }}>hodnocení</div>
    </div>
  );
}

function FilmDetailModal({ film: initialFilm, filmy, herci, reziseri, onClose, onEdit, isAdmin }) {
  const [film, setFilm] = useState(initialFilm);
  const isMobile = useMobile();
  const filmReziseri = reziseri.filter(r => (film.reziserIds ?? []).includes(r.id));
  const filmHerci = herci.filter(h => (film.herciIds ?? []).includes(h.id));
  const ratingColor = film.hodnoceni >= 9 ? T.green : film.hodnoceni <= 4 && film.hodnoceni > 0 ? T.danger : T.text;

  // Od stejného režiséra
  const odRezisera = filmy
    .filter(f => f.id !== film.id && !f.rewatch && (film.reziserIds ?? []).some(rid => (f.reziserIds ?? []).includes(rid)))
    .sort((a, b) => (b.hodnoceni ?? 0) - (a.hodnoceni ?? 0))
    .slice(0, 6);

  // Ze stejného žánru se stejným hodnocením
  const podobne = filmy
    .filter(f => f.id !== film.id && f.hodnoceni === film.hodnoceni && (film.zanry ?? []).some(z => (f.zanry ?? []).includes(z)))
    .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? ""))
    .slice(0, 6);

  const metaRow = [
    film.rok,
    filmReziseri.length > 0 ? filmReziseri.map(r => r.jmeno).join(", ") : null,
    film.stopaz ? `${film.stopaz} min` : null,
    (film.zanry ?? []).join(", ") || null,
    film.platforma,
  ].filter(Boolean);

  const SideSection = ({ title, items }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>{title}</div>
      {items.length === 0 && <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>Žádné záznamy.</div>}
      {items.map((f, i) => (
        <div key={f.id} onClick={() => setFilm(f)} style={{ display: "grid", gridTemplateColumns: "1fr 36px 36px", gap: 8, padding: "7px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "baseline", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = T.elevated}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.gold, letterSpacing: "-0.01em" }}>{f.nazev}</span>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, textAlign: "right" }}>{f.rok}</span>
          <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 500, color: f.hodnoceni >= 9 ? T.green : f.hodnoceni <= 4 && f.hodnoceni ? T.danger : T.text, textAlign: "right" }}>{f.hodnoceni ?? "—"}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.bg, width: "100%", maxWidth: 960, height: isMobile ? "92vh" : "auto", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        {/* Masthead */}
        <div style={{ padding: isMobile ? "16px 16px 12px" : "28px 36px 20px", borderBottom: `1px solid ${T.text}`, flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 24, alignItems: "flex-end" }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: F.display, fontSize: isMobile ? 28 : 42, fontWeight: 500, color: T.text, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
                {film.nazev}
              </h2>
              {film.ceskyNazev && <div style={{ fontFamily: F.sans, fontSize: 14, color: T.muted, fontStyle: "italic", marginTop: 6 }}>({film.ceskyNazev})</div>}
            </div>
            {!isMobile && film.hodnoceni && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>hodnocení</div>
                <div style={{ fontFamily: F.display, fontSize: 96, fontWeight: 500, color: ratingColor, letterSpacing: "-0.06em", lineHeight: 0.85 }}>
                  {film.hodnoceni}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: isMobile ? "12px 16px" : "24px 36px", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "200px 1fr 1fr", gap: isMobile ? 20 : 32 }}>
            {/* LEFT — metadata + obsazení */}
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>Informace</div>
              {[
                ["datum", film.datum ? fmtDate(film.datum) : null],
                ["rok výroby", film.rok],
                ["délka", film.stopaz ? `${film.stopaz} min` : null],
                ["platforma", film.platforma],
                ["žánr", (film.zanry ?? []).join(", ") || null],
                ["česky film", film.ceskyFilm ? "Ano" : null],
                ["rewatch", film.rewatch ? "Ano" : null],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.border}`, fontFamily: F.mono, fontSize: 11, alignItems: "baseline" }}>
                  <span style={{ color: T.muted }}>{k}</span>
                  <span style={{ color: T.text }}>{v}</span>
                </div>
              ))}
              {filmReziseri.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>Režie</div>
                  {filmReziseri.map((r, i) => (
                    <div key={r.id} style={{ padding: "6px 0", borderBottom: i < filmReziseri.length - 1 ? `1px solid ${T.border}` : "none", fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>{r.jmeno}</div>
                  ))}
                </div>
              )}
              {filmHerci.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>Obsazení</div>
                  {filmHerci.map((h, i) => (
                    <div key={h.id} style={{ padding: "6px 0", borderBottom: i < filmHerci.length - 1 ? `1px solid ${T.border}` : "none", fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>{h.jmeno}</div>
                  ))}
                </div>
              )}
              {film.poznamka && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>Poznámka</div>
                  <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.55, fontFamily: F.sans }}>{film.poznamka}</p>
                </div>
              )}
            </div>

            {/* MIDDLE — od stejného režiséra */}
            <SideSection title={filmReziseri.length > 0 ? `Od ${filmReziseri.map(r => r.jmeno).join(", ")}` : "Od stejného režiséra"} items={odRezisera} />

            {/* RIGHT — ze stejného žánru */}
            <SideSection title={`Žánr · hodnocení ${film.hodnoceni ?? "—"}`} items={podobne} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? "10px 16px" : "12px 36px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          {isAdmin && <button onClick={() => { onClose(); onEdit(film); }} style={{ ...btnSecondary, fontFamily: F.mono, fontSize: 11 }}>Upravit</button>}
          <button onClick={onClose} style={{ ...btnSecondary, fontFamily: F.mono, fontSize: 11 }}>Zavřít</button>
        </div>
      </div>
    </div>
  );
}

function FilmCard({ film, herci, reziseri, onEdit, onDelete, onDetail, isAdmin }) {
  const isMobile = useMobile();
  const [hover, setHover] = useState(false);
  const filmReziseri = reziseri.filter(r => (film.reziserIds ?? []).includes(r.id));
  const filmHerci = herci.filter(h => (film.herciIds ?? []).includes(h.id));
  const ratingColor = film.hodnoceni >= 9 ? T.green : film.hodnoceni <= 4 && film.hodnoceni > 0 ? T.danger : T.text;
  const rowHighlight = film.hodnoceni >= 9 ? T.green + "18" : film.hodnoceni <= 4 && film.hodnoceni > 0 ? T.danger + "18" : null;

  if (isMobile) {
    return (
      <div style={{ ...cardStyle, borderColor: hover ? T.borderHover : T.border }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div style={{ flexShrink: 0, marginRight: 12, minWidth: 38 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.gold, lineHeight: 1, fontFamily: F.mono }}>{fmtDate(film.datum).slice(0, 5)}</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 2, fontFamily: F.mono }}>{fmtDate(film.datum).slice(6)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
            <span onClick={() => onDetail && onDetail(film)} style={{ fontSize: 14, fontWeight: 500, color: T.text, fontFamily: F.display, cursor: "pointer" }} onMouseEnter={e => e.target.style.color=T.gold} onMouseLeave={e => e.target.style.color=T.text}>{film.nazev}</span>
            {film.rok && <span style={{ color: T.muted, fontSize: 10, fontFamily: F.mono }}>{film.rok}</span>}
          </div>
          {film.ceskyNazev && <div style={{ fontSize: 11, color: T.muted, fontStyle: "italic", marginBottom: 3 }}>({film.ceskyNazev})</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {film.platforma && <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{film.platforma}</span>}
            {(film.zanry ?? []).length > 0 && <span style={{ fontSize: 11, color: T.muted }}>{film.zanry.join(", ")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 10, flexShrink: 0 }}>
          {film.hodnoceni && <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 500, color: ratingColor, lineHeight: 1 }}>{film.hodnoceni}</span>}
          <div style={{ display: "flex", gap: 4 }}>
            {isAdmin && <button onClick={() => onEdit(film)} style={btnSecondary}>Upravit</button>}
            {isAdmin && <button onClick={() => onDelete(film.id)} style={btnDanger}>✕</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: FILM_COLS, gap: 12,
      padding: "12px 16px", alignItems: "center",
      borderBottom: `1px solid ${T.border}`,
      background: hover ? T.elevated : rowHighlight ?? T.surface,
      transition: "background 0.1s",
      cursor: "default",
    }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {/* Datum */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>
        {film.datum ? fmtDate(film.datum) : "—"}
      </div>
      {/* Název */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span onClick={() => onDetail && onDetail(film)}
            style={{ fontFamily: F.display, fontSize: 15, fontWeight: 500, color: T.text, letterSpacing: "-0.02em", cursor: "pointer" }}
            onMouseEnter={e => e.target.style.color=T.gold} onMouseLeave={e => e.target.style.color=T.text}>{film.nazev}</span>
          {film.rok && <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{film.rok}</span>}
          {film.ceskyFilm && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.gold, letterSpacing: "0.1em" }}>CZ</span>}
          {film.rewatch && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.muted, letterSpacing: "0.1em" }}>Rewatch</span>}
        </div>
        {film.ceskyNazev && <div style={{ fontFamily: F.sans, fontSize: 11, color: T.muted, fontStyle: "italic", marginTop: 1 }}>({film.ceskyNazev})</div>}
        {(filmReziseri.length > 0 || filmHerci.length > 0) && (
          <div style={{ fontFamily: F.mono, fontSize: 10, marginTop: 3, letterSpacing: "0.02em" }}>
            {filmReziseri.length > 0 && (
              <span style={{ color: T.gold }}>rež. {filmReziseri.map(r => r.jmeno).join(", ")}</span>
            )}
            {filmReziseri.length > 0 && filmHerci.length > 0 && <span style={{ color: T.muted }}> · </span>}
            {filmHerci.length > 0 && (
              <span style={{ color: T.muted }}>{filmHerci.map(h => h.jmeno).join(", ")}</span>
            )}
          </div>
        )}
      </div>
      {/* Žánr */}
      <div style={{ fontFamily: F.sans, fontSize: 11, color: T.muted }}>{(film.zanry ?? []).join(", ")}</div>
      {/* Platforma */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{film.platforma}</div>
      {/* Stopáž */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{film.stopaz || ""}</div>
      {/* Hodnocení + admin */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16 }}>
        <div>
          <Rating value={film.hodnoceni} />
          {film.doporuceni && <div style={{ fontFamily: F.mono, fontSize: 9, color: T.green, letterSpacing: "0.1em", marginTop: 3 }}>Doporučení</div>}
        </div>
        {isAdmin && <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button onClick={() => onEdit(film)} style={{ ...btnSecondary, padding: "3px 8px", fontSize: 10 }}>upravit</button>
          <button onClick={() => onDelete(film.id)} style={{ ...btnDanger, padding: "3px 8px", fontSize: 10 }}>✕</button>
        </div>}
      </div>
    </div>
  );
}

const SERIAL_COLS = "80px minmax(0,1fr) 120px 100px 60px 160px";

function SerialTableHeader() {
  const isMobile = useMobile();
  if (isMobile) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: SERIAL_COLS, gap: 12,
      padding: "8px 16px", borderBottom: `1px solid ${T.border}`,
      fontFamily: F.mono, fontSize: 9, color: T.muted,
      letterSpacing: "0.14em", textTransform: "uppercase",
      background: T.surface,
    }}>
      <div>datum</div><div>název</div><div>žánr</div><div>platforma</div><div>série</div><div style={{ paddingLeft: 16 }}>hodnocení</div>
    </div>
  );
}

function SerialDetailModal({ serial: initialSerial, serialy, herci, onClose, onEdit, isAdmin }) {
  const [serial, setSerial] = useState(initialSerial);
  const isMobile = useMobile();
  const serialHerci = herci.filter(h => (serial.herciIds ?? []).includes(h.id));
  const ratingColor = serial.hodnoceni >= 9 ? T.green : serial.hodnoceni <= 4 && serial.hodnoceni > 0 ? T.danger : T.text;
  const stavColor = { Dokoukáno: T.green, Sleduji: T.gold, Nedokončeno: T.orange, Plánuji: T.muted };

  const podobne = serialy
    .filter(s => s.id !== serial.id && s.hodnoceni === serial.hodnoceni && (serial.zanry ?? []).some(z => (s.zanry ?? []).includes(z)))
    .sort((a, b) => (b.konecSledovani || b.zacatekSledovani || "").localeCompare(a.konecSledovani || a.zacatekSledovani || ""))
    .slice(0, 8);

  const datumLabel = [
    serial.zacatekSledovani ? fmtDate(serial.zacatekSledovani) : null,
    serial.konecSledovani && serial.konecSledovani !== serial.zacatekSledovani ? fmtDate(serial.konecSledovani) : null,
  ].filter(Boolean).join(" → ");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.bg, width: "100%", maxWidth: 820, height: isMobile ? "92vh" : "auto", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        {/* Masthead */}
        <div style={{ padding: isMobile ? "16px 16px 12px" : "28px 36px 20px", borderBottom: `1px solid ${T.text}`, flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 24, alignItems: "flex-end" }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: F.display, fontSize: isMobile ? 28 : 42, fontWeight: 500, color: T.text, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
                {serial.nazev}
              </h2>
              {serial.ceskyNazev && <div style={{ fontFamily: F.sans, fontSize: 14, color: T.muted, fontStyle: "italic", marginTop: 6 }}>({serial.ceskyNazev})</div>}
            </div>
            {!isMobile && serial.hodnoceni && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>hodnocení</div>
                <div style={{ fontFamily: F.display, fontSize: 96, fontWeight: 500, color: ratingColor, letterSpacing: "-0.06em", lineHeight: 0.85 }}>
                  {serial.hodnoceni}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: isMobile ? "12px 16px" : "24px 36px", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", gap: isMobile ? 20 : 36 }}>
            {/* LEFT — metadata + obsazení */}
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>Informace</div>
              {[
                ["sledováno", datumLabel || null],
                ["rok výroby", serial.rok],
                ["platforma", serial.platforma],
                ["žánr", (serial.zanry ?? []).join(", ") || null],
                ["stav", serial.stav],
                ["série", Array.isArray(serial.serie) && serial.serie.length > 0 ? serial.serie.join(", ") : (serial.serie || null)],
                ["dílů", serial.pocetDilu || null],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.border}`, fontFamily: F.mono, fontSize: 11, alignItems: "baseline" }}>
                  <span style={{ color: T.muted }}>{k}</span>
                  <span style={{ color: k === "stav" ? (stavColor[v] ?? T.text) : T.text }}>{v}</span>
                </div>
              ))}
              {serialHerci.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>Obsazení</div>
                  {serialHerci.map((h, i) => (
                    <div key={h.id} style={{ padding: "6px 0", borderBottom: i < serialHerci.length - 1 ? `1px solid ${T.border}` : "none", fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>{h.jmeno}</div>
                  ))}
                </div>
              )}
              {serial.poznamka && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>Poznámka</div>
                  <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.55, fontFamily: F.sans }}>{serial.poznamka}</p>
                </div>
              )}
            </div>

            {/* RIGHT — stejný žánr + hodnocení */}
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 6, borderBottom: `1px solid ${T.text}`, marginBottom: 10 }}>
                Žánr · hodnocení {serial.hodnoceni ?? "—"}
              </div>
              {podobne.length === 0 && <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>Žádné záznamy.</div>}
              {podobne.map((s, i) => (
                <div key={s.id} onClick={() => setSerial(s)} style={{ display: "grid", gridTemplateColumns: "1fr 36px 36px", gap: 8, padding: "8px 0", borderBottom: i < podobne.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "baseline", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.elevated}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.gold, letterSpacing: "-0.01em" }}>{s.nazev}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, textAlign: "right" }}>{s.rok}</span>
                  <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 500, color: s.hodnoceni >= 9 ? T.green : s.hodnoceni <= 4 && s.hodnoceni ? T.danger : T.text, textAlign: "right" }}>{s.hodnoceni ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? "10px 16px" : "12px 36px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          {isAdmin && <button onClick={() => { onClose(); onEdit(serial); }} style={{ ...btnSecondary, fontFamily: F.mono, fontSize: 11 }}>Upravit</button>}
          <button onClick={onClose} style={{ ...btnSecondary, fontFamily: F.mono, fontSize: 11 }}>Zavřít</button>
        </div>
      </div>
    </div>
  );
}

function SerialCard({ serial, herci, onEdit, onDelete, onDetail, isAdmin }) {
  const isMobile = useMobile();
  const [hover, setHover] = useState(false);
  const stavColor = { Dokoukáno: T.green, Sleduji: T.gold, Nedokončeno: T.orange, Plánuji: "#95a5a6" };
  const serialHerci = herci.filter(h => (serial.herciIds ?? []).includes(h.id));
  const ratingColor = serial.hodnoceni >= 9 ? T.green : serial.hodnoceni <= 4 && serial.hodnoceni > 0 ? T.danger : T.text;
  const rowHighlight = serial.hodnoceni >= 9 ? T.green + "18" : serial.hodnoceni <= 4 && serial.hodnoceni > 0 ? T.danger + "18" : null;

  if (isMobile) {
    return (
      <div style={{ ...cardStyle, borderColor: hover ? T.borderHover : T.border, ...(rowHighlight ? { background: rowHighlight } : {}) }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div style={{ flexShrink: 0, marginRight: 12, minWidth: 38 }}>
          {serial.zacatekSledovani && <div style={{ fontSize: 13, fontWeight: 500, color: T.gold, lineHeight: 1, fontFamily: F.mono }}>{fmtDate(serial.zacatekSledovani).slice(0, 5)}</div>}
          {serial.zacatekSledovani && <div style={{ fontSize: 10, color: T.muted, marginTop: 2, fontFamily: F.mono }}>{fmtDate(serial.zacatekSledovani).slice(6)}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
            <span onClick={() => onDetail && onDetail(serial)} style={{ fontSize: 14, fontWeight: 500, color: T.text, fontFamily: F.display, cursor: "pointer" }} onMouseEnter={e => e.target.style.color=T.gold} onMouseLeave={e => e.target.style.color=T.text}>{serial.nazev}</span>
            {serial.rok && <span style={{ color: T.muted, fontSize: 10, fontFamily: F.mono }}>{serial.rok}</span>}
          </div>
          {serial.ceskyNazev && <div style={{ fontSize: 11, color: T.muted, fontStyle: "italic", marginBottom: 3 }}>({serial.ceskyNazev})</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {serial.platforma && <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{serial.platforma}</span>}
            {serial.stav && <span style={{ fontFamily: F.mono, fontSize: 10, color: stavColor[serial.stav] ?? T.muted }}>{serial.stav}</span>}
            {(serial.zanry ?? []).length > 0 && <span style={{ fontSize: 11, color: T.muted }}>{serial.zanry.join(", ")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 10, flexShrink: 0 }}>
          {serial.hodnoceni && <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 500, color: ratingColor, lineHeight: 1 }}>{serial.hodnoceni}</span>}
          <div style={{ display: "flex", gap: 4 }}>
            {isAdmin && <button onClick={() => onEdit(serial)} style={btnSecondary}>Upravit</button>}
            {isAdmin && <button onClick={() => onDelete(serial.id)} style={btnDanger}>✕</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: SERIAL_COLS, gap: 12,
      padding: "12px 16px", alignItems: "center",
      borderBottom: `1px solid ${T.border}`,
      background: hover ? T.elevated : rowHighlight ?? T.surface,
      transition: "background 0.1s",
      cursor: "default",
    }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {/* Datum */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>
        {serial.zacatekSledovani ? fmtDate(serial.zacatekSledovani) : "—"}
        {serial.konecSledovani && serial.konecSledovani !== serial.zacatekSledovani && (
          <div>→ {fmtDate(serial.konecSledovani)}</div>
        )}
      </div>
      {/* Název */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span onClick={() => onDetail && onDetail(serial)}
            style={{ fontFamily: F.display, fontSize: 15, fontWeight: 500, color: T.text, letterSpacing: "-0.02em", cursor: "pointer" }}
            onMouseEnter={e => e.target.style.color=T.gold} onMouseLeave={e => e.target.style.color=T.text}>{serial.nazev}</span>
          {serial.rok && <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{serial.rok}</span>}
          {serial.rewatch && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.muted, letterSpacing: "0.1em" }}>Rewatch</span>}
        </div>
        {serial.ceskyNazev && <div style={{ fontFamily: F.sans, fontSize: 11, color: T.muted, fontStyle: "italic", marginTop: 1 }}>({serial.ceskyNazev})</div>}
        {serialHerci.length > 0 && (
          <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, marginTop: 3, letterSpacing: "0.02em" }}>
            {serialHerci.map(h => h.jmeno).join(", ")}
          </div>
        )}
      </div>
      {/* Žánr */}
      <div style={{ fontFamily: F.sans, fontSize: 11, color: T.muted }}>{(serial.zanry ?? []).join(", ")}</div>
      {/* Platforma */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{serial.platforma}</div>
      {/* Série */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>
        {serial.serie && (Array.isArray(serial.serie) ? serial.serie.length > 0 : serial.serie)
          ? (Array.isArray(serial.serie) ? serial.serie.join(", ") : serial.serie)
          : ""}
        {serial.pocetDilu ? <div style={{ fontSize: 10 }}>{serial.pocetDilu} dílů</div> : null}
      </div>
      {/* Hodnocení + stav + admin */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16 }}>
        <div>
          <Rating value={serial.hodnoceni} />
          {serial.stav && <div style={{ fontFamily: F.mono, fontSize: 9, color: stavColor[serial.stav] ?? T.muted, letterSpacing: "0.1em", marginTop: 3 }}>{serial.stav}</div>}
        </div>
        {isAdmin && <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button onClick={() => onEdit(serial)} style={{ ...btnSecondary, padding: "3px 8px", fontSize: 10 }}>upravit</button>
          <button onClick={() => onDelete(serial.id)} style={{ ...btnDanger, padding: "3px 8px", fontSize: 10 }}>✕</button>
        </div>}
      </div>
    </div>
  );
}

function OsobaDetailModal({ osoba, filmy, serialy, herci, reziseri, onClose, onToggle, showNeoblibeny = false }) {
  const [filmDetail, setFilmDetail] = useState(null);
  const [serialDetail, setSerialDetail] = useState(null);
  const osobaFilmy = filmy.filter(f =>
    !f.rewatch && ((f.herciIds ?? []).includes(osoba.id) || (f.reziserIds ?? []).includes(osoba.id))
  ).sort((a, b) => (b.rok || 0) - (a.rok || 0));
  const osobaSerialy = (serialy ?? []).filter(s =>
    (s.herciIds ?? []).includes(osoba.id)
  ).sort((a, b) => (b.rok || 0) - (a.rok || 0));

  const total = osobaFilmy.length + osobaSerialy.length;

  const isMobile = useMobile();

  const toggleBtn = (label, active, color, field) => (
    <button
      onClick={() => onToggle && onToggle(osoba.id, field, !active)}
      style={{
        padding: "5px 12px", borderRadius: 4, cursor: "pointer",
        fontSize: 12, fontWeight: 600, border: `1px solid`,
        borderColor: active ? color : T.border,
        background: active ? color + "22" : "transparent",
        color: active ? color : T.muted,
        transition: "all 0.15s",
      }}
    >{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: isMobile ? "12px 12px 0 0" : 8, width: isMobile ? "100%" : 600, maxWidth: "100%", height: isMobile ? "85vh" : "auto", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: F.display }}>{osoba.jmeno}</span>
            <span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>
              {osoba.narodnost}{osoba.rokNarozeni ? ` · *${osoba.rokNarozeni}` : ""}
              {osoba.zijici === "Ne" ? " · †" : ""}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        {onToggle && (
          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {toggleBtn("★ Oblíbený", osoba.oblibeny, T.gold, "oblibeny")}
            {showNeoblibeny && toggleBtn("✕ Neoblíbený", osoba.neoblibeny, T.danger, "neoblibeny")}
            {toggleBtn("† Po smrti", osoba.zijici === "Ne", T.muted, "zijici")}
          </div>
        )}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
          {total === 0 && <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Žádné záznamy</div>}

          {osobaFilmy.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Filmy ({osobaFilmy.length})</div>
              {osobaFilmy.map(f => (
                <div key={f.id} onClick={() => setFilmDetail(f)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.elevated}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.gold, fontFamily: F.display }}>{f.nazev}</span>
                    {f.zanry?.length > 0 && <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>{f.zanry.join(", ")}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
                    {f.rok && <span style={{ fontSize: 12, color: T.muted }}>{f.rok}</span>}
                    {f.hodnoceni && <span style={{ fontSize: 13, fontWeight: 700, color: f.hodnoceni >= 8 ? T.green : f.hodnoceni >= 6 ? T.gold : f.hodnoceni >= 4 ? T.orange : T.danger }}>{f.hodnoceni}/10</span>}
                  </div>
                </div>
              ))}
            </>
          )}

          {osobaSerialy.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: osobaFilmy.length > 0 ? 20 : 0, marginBottom: 10 }}>Seriály ({osobaSerialy.length})</div>
              {osobaSerialy.map(s => (
                <div key={s.id} onClick={() => setSerialDetail(s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.elevated}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.gold, fontFamily: F.display }}>{s.nazev}</span>
                    {s.zanry?.length > 0 && <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>{s.zanry.join(", ")}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
                    {s.rok && <span style={{ fontSize: 12, color: T.muted }}>{s.rok}</span>}
                    {s.hodnoceni && <span style={{ fontSize: 13, fontWeight: 700, color: s.hodnoceni >= 8 ? T.green : s.hodnoceni >= 6 ? T.gold : s.hodnoceni >= 4 ? T.orange : T.danger }}>{s.hodnoceni}/10</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ padding: "10px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary}>Zavřít</button>
        </div>
      </div>
      {filmDetail && <FilmDetailModal film={filmDetail} filmy={filmy} herci={herci ?? []} reziseri={reziseri ?? []} onClose={() => setFilmDetail(null)} onEdit={() => {}} isAdmin={false} />}
      {serialDetail && <SerialDetailModal serial={serialDetail} serialy={serialy ?? []} herci={herci ?? []} onClose={() => setSerialDetail(null)} onEdit={() => {}} isAdmin={false} />}
    </div>
  );
}

const OSOBA_COLS = "minmax(0,1fr) 130px 80px 80px 130px";

function OsobaTableHeader() {
  const isMobile = useMobile();
  if (isMobile) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: OSOBA_COLS, gap: 12,
      padding: "8px 16px", borderBottom: `1px solid ${T.border}`,
      fontFamily: F.mono, fontSize: 9, color: T.muted,
      letterSpacing: "0.14em", textTransform: "uppercase",
      background: T.surface,
    }}>
      <div>jméno</div><div>národnost</div><div>narozen</div><div style={{ textAlign: "right" }}>záznamy</div><div></div>
    </div>
  );
}

function OsobaCard({ osoba, onEdit, onDelete, onDetail, filmCount, isAdmin }) {
  const isMobile = useMobile();
  const [hover, setHover] = useState(false);

  if (isMobile) {
    return (
      <div style={{ ...cardStyle, borderColor: hover ? T.borderHover : T.border, alignItems: "center", cursor: "pointer" }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onClick={() => onDetail(osoba)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 500, color: T.text, letterSpacing: "-0.02em" }}>{osoba.jmeno}</span>
            {osoba.zijici === "Ne" && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.muted }}>†</span>}
            {osoba.oblibeny && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.gold }}>★</span>}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
            {osoba.narodnost}{osoba.rokNarozeni ? ` · *${osoba.rokNarozeni}` : ""}
            {filmCount > 0 ? ` · ${filmCount} záz.` : ""}
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(osoba)} style={{ ...btnSecondary, padding: "3px 8px", fontSize: 10 }}>upravit</button>
            <button onClick={() => onDelete(osoba.id)} style={{ ...btnDanger, padding: "3px 8px", fontSize: 10 }}>✕</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: OSOBA_COLS, gap: 12,
      padding: "11px 16px", alignItems: "center",
      borderBottom: `1px solid ${T.border}`,
      background: hover ? T.elevated : T.surface,
      transition: "background 0.1s",
      cursor: "pointer",
    }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onDetail(osoba)}>
      {/* Jméno + příznaky */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 500, color: T.text, letterSpacing: "-0.02em" }}>{osoba.jmeno}</span>
          {osoba.zijici === "Ne" && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.muted, letterSpacing: "0.1em" }}>†</span>}
          {osoba.oblibeny && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.gold, letterSpacing: "0.1em" }}>★ oblíbený</span>}
          {osoba.neoblibeny && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.danger, letterSpacing: "0.1em" }}>✕ neoblíbený</span>}
        </div>
      </div>
      {/* Národnost */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{osoba.narodnost || ""}</div>
      {/* Rok narození */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{osoba.rokNarozeni ? `*${osoba.rokNarozeni}` : ""}</div>
      {/* Počet záznamů */}
      <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 500, color: filmCount > 0 ? T.text : T.muted, textAlign: "right", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {filmCount > 0 ? filmCount : "—"}
      </div>
      {/* Admin */}
      <div style={{ display: "flex", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
        {isAdmin && <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onEdit(osoba)} style={{ ...btnSecondary, padding: "3px 8px", fontSize: 10 }}>upravit</button>
          <button onClick={() => onDelete(osoba.id)} style={{ ...btnDanger, padding: "3px 8px", fontSize: 10 }}>✕</button>
        </div>}
      </div>
    </div>
  );
}

// ─── FILTRY ───────────────────────────────────────────────────────────────────
const emptyFilmFilters  = () => ({ hodnoceniMin: null, platformy: [], zanry: [], rewatch: null, ceskyFilm: null, doporuceni: null, rokOd: "", rokDo: "" });
const emptySerialFilters = () => ({ hodnoceniMin: null, platformy: [], zanry: [], stav: [], rokOd: "", rokDo: "" });

function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "4px 10px", fontSize: 11, cursor: "pointer", border: `1px solid ${active ? T.gold : T.border}`, background: active ? T.gold : "transparent", color: active ? (T.mode === "dark" ? "#0f0e0c" : "#fff8f0") : T.muted, fontWeight: active ? 600 : 400, whiteSpace: "nowrap", fontFamily: F.mono, letterSpacing: "0.04em" }}>
      {label}
    </button>
  );
}

function FilmyFilters({ filters, setFilters, filmy }) {
  const f = filters;
  const set = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k, v) => set(k, f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]);

  const usedPlatforms = [...new Set(filmy.map(x => x.platforma).filter(Boolean))].sort();
  const usedZanry = [...new Set(filmy.flatMap(x => x.zanry ?? []))].sort();

  return (
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderBottom: `1px solid ${T.text}`, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 32px" }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Hodnocení min.</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[null,5,6,7,8,9].map(v => <FilterPill key={v ?? "vše"} label={v ? `${v}+` : "Vše"} active={f.hodnoceniMin === v} onClick={() => set("hodnoceniMin", v)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Rok</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={f.rokOd} onChange={e => set("rokOd", e.target.value)} placeholder="od" style={{ ...inp, width: 60, padding: "4px 8px" }} />
            <span style={{ color: T.muted, fontSize: 12 }}>–</span>
            <input value={f.rokDo} onChange={e => set("rokDo", e.target.value)} placeholder="do" style={{ ...inp, width: 60, padding: "4px 8px" }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Příznaky</div>
          <div style={{ display: "flex", gap: 4 }}>
            <FilterPill label="↺ Rewatch" active={f.rewatch === true} onClick={() => set("rewatch", f.rewatch === true ? null : true)} />
            <FilterPill label="CZ film" active={f.ceskyFilm === true} onClick={() => set("ceskyFilm", f.ceskyFilm === true ? null : true)} />
            <FilterPill label="Doporučil bych" active={f.doporuceni === true} onClick={() => set("doporuceni", f.doporuceni === true ? null : true)} />
          </div>
        </div>
        {usedPlatforms.length > 0 && (
          <div style={{ flexBasis: "100%" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Platforma</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {usedPlatforms.map(p => <FilterPill key={p} label={p} active={f.platformy.includes(p)} onClick={() => toggleArr("platformy", p)} />)}
            </div>
          </div>
        )}
        {usedZanry.length > 0 && (
          <div style={{ flexBasis: "100%" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Žánr</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {usedZanry.map(z => <FilterPill key={z} label={z} active={f.zanry.includes(z)} onClick={() => toggleArr("zanry", z)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SerialyFilters({ filters, setFilters, serialy }) {
  const f = filters;
  const set = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k, v) => set(k, f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]);

  const usedPlatforms = [...new Set(serialy.map(x => x.platforma).filter(Boolean))].sort();
  const usedZanry = [...new Set(serialy.flatMap(x => x.zanry ?? []))].sort();

  return (
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderBottom: `1px solid ${T.text}`, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 32px" }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Hodnocení min.</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[null,5,6,7,8,9].map(v => <FilterPill key={v ?? "vše"} label={v ? `${v}+` : "Vše"} active={f.hodnoceniMin === v} onClick={() => set("hodnoceniMin", v)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Rok</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={f.rokOd} onChange={e => set("rokOd", e.target.value)} placeholder="od" style={{ ...inp, width: 60, padding: "4px 8px" }} />
            <span style={{ color: T.muted, fontSize: 12 }}>–</span>
            <input value={f.rokDo} onChange={e => set("rokDo", e.target.value)} placeholder="do" style={{ ...inp, width: 60, padding: "4px 8px" }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Stav</div>
          <div style={{ display: "flex", gap: 4 }}>
            {STAV_SERIALU.map(s => <FilterPill key={s} label={s} active={f.stav.includes(s)} onClick={() => toggleArr("stav", s)} />)}
          </div>
        </div>
        {usedPlatforms.length > 0 && (
          <div style={{ flexBasis: "100%" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Platforma</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {usedPlatforms.map(p => <FilterPill key={p} label={p} active={f.platformy.includes(p)} onClick={() => toggleArr("platformy", p)} />)}
            </div>
          </div>
        )}
        {usedZanry.length > 0 && (
          <div style={{ flexBasis: "100%" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Žánr</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {usedZanry.map(z => <FilterPill key={z} label={z} active={f.zanry.includes(z)} onClick={() => toggleArr("zanry", z)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function countActiveFilters(f) {
  return [
    f.hodnoceniMin != null,
    f.platformy?.length > 0,
    f.zanry?.length > 0,
    f.rewatch != null,
    f.ceskyFilm != null,
    f.doporuceni != null,
    f.stav?.length > 0,
    f.rokOd,
    f.rokDo,
  ].filter(Boolean).length;
}

// ─── ZÁHLAVÍ ZÁLOŽKY ──────────────────────────────────────────────────────────
function TabHeader({ count, onAdd, q, setQ, addLabel, onToggleFilters, activeFilterCount, sortOptions, sort, setSort }) {
  const isMobile = useMobile();
  if (isMobile) {
    return (
      <div style={{ marginBottom: 12, fontFamily: F.mono, fontSize: 11 }}>
        {/* Row 1: search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: T.surface, border: `1px solid ${T.border}`, marginBottom: 8 }}>
          <span style={{ flexShrink: 0, color: T.muted }}>⌕</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Vyhledat..."
            style={{ background: "none", border: "none", outline: "none", color: T.text, fontFamily: F.mono, fontSize: 13, width: "100%", padding: 0 }} />
        </div>
        {/* Row 2: filtry + sort + count + add */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {onToggleFilters && (
            <button onClick={onToggleFilters} style={{
              padding: "5px 10px", background: activeFilterCount > 0 ? T.gold : "transparent",
              border: `1px solid ${activeFilterCount > 0 ? T.gold : T.border}`,
              color: activeFilterCount > 0 ? "#0f0e0c" : T.muted,
              fontFamily: F.mono, fontSize: 11, cursor: "pointer",
            }}>Filtry{activeFilterCount > 0 ? ` · ${activeFilterCount} ×` : ""}</button>
          )}
          {sortOptions && (
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              background: T.surface, border: `1px solid ${T.border}`,
              color: T.muted, fontFamily: F.mono, fontSize: 11,
              padding: "5px 8px", cursor: "pointer", outline: "none",
            }}>
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <span style={{ color: T.muted, marginLeft: "auto", flexShrink: 0 }}>{count} záz.</span>
          {onAdd && (
            <button onClick={onAdd} style={{
              padding: "5px 12px", background: T.text, color: T.bg,
              border: "none", fontFamily: F.mono, fontSize: 11,
              letterSpacing: "0.06em", cursor: "pointer", fontWeight: 600,
            }}>+ Přidat</button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "center",
      padding: "10px 0",
      borderBottom: `1px solid ${T.border}`,
      marginBottom: 16,
      fontFamily: F.mono, fontSize: 11,
    }}>
      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 10px", background: T.surface,
        border: `1px solid ${T.border}`, color: T.muted, minWidth: 220,
      }}>
        <span style={{ flexShrink: 0 }}>⌕</span>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Vyhledat..."
          style={{ background: "none", border: "none", outline: "none", color: T.text, fontFamily: F.mono, fontSize: 11, width: "100%", padding: 0 }}
        />
      </div>
      <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />
      {onToggleFilters && (
        <button onClick={onToggleFilters} style={{
          padding: "5px 10px", background: activeFilterCount > 0 ? T.gold : "transparent",
          border: `1px solid ${activeFilterCount > 0 ? T.gold : T.border}`,
          color: activeFilterCount > 0 ? (T.mode === "dark" ? "#0f0e0c" : "#fff8f0") : T.muted,
          fontFamily: F.mono, fontSize: 11, cursor: "pointer", letterSpacing: "0.04em",
        }}>
          Filtry{activeFilterCount > 0 ? ` · ${activeFilterCount} ×` : ""}
        </button>
      )}
      {sortOptions && (
        <select value={sort} onChange={e => setSort(e.target.value)} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          color: T.muted, fontFamily: F.mono, fontSize: 11,
          padding: "5px 8px", cursor: "pointer", outline: "none",
        }}>
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <div style={{ flex: 1 }} />
      <span style={{ color: T.muted, letterSpacing: "0.05em", flexShrink: 0 }}>{count} záznamů</span>
      {onAdd && (
        <button onClick={onAdd} style={{
          padding: "5px 12px", background: T.text, color: T.bg,
          border: "none", fontFamily: F.mono, fontSize: 11,
          letterSpacing: "0.06em", cursor: "pointer", fontWeight: 600,
        }}>+ {addLabel}</button>
      )}
    </div>
  );
}

// ─── ZÁLOŽKY ──────────────────────────────────────────────────────────────────
const FILM_SORT_OPTS = [
  { value: "datum-desc", label: "Datum zhlédnutí ↓" },
  { value: "datum-asc", label: "Datum zhlédnutí ↑" },
  { value: "hodnoceni-desc", label: "Hodnocení ↓" },
  { value: "nazev-asc", label: "Název A–Z" },
  { value: "rok-desc", label: "Rok výroby ↓" },
  { value: "rok-asc", label: "Rok výroby ↑" },
];

function FilmyTab({ filmy, setFilmy, herci, reziseri, isAdmin, userId }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFilm);
  const [detail, setDetail] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptyFilmFilters());
  const [sort, setSort] = useState("datum-desc");
  const filtered = useMemo(() => {
    const f = filters;
    const list = filmy
      .filter(x => !q || x.nazev?.toLowerCase().includes(q.toLowerCase()))
      .filter(x => f.hodnoceniMin == null || (x.hodnoceni ?? 0) >= f.hodnoceniMin)
      .filter(x => !f.platformy.length || f.platformy.includes(x.platforma))
      .filter(x => !f.zanry.length || f.zanry.every(z => (x.zanry ?? []).includes(z)))
      .filter(x => f.rewatch == null || x.rewatch === f.rewatch)
      .filter(x => f.ceskyFilm == null || x.ceskyFilm === f.ceskyFilm)
      .filter(x => f.doporuceni == null || x.doporuceni === f.doporuceni)
      .filter(x => !f.rokOd || (x.rok ?? 0) >= parseInt(f.rokOd))
      .filter(x => !f.rokDo || (x.rok ?? 9999) <= parseInt(f.rokDo))
    list.sort((a, b) => {
      if (sort === "datum-desc") { const d = (b.datum ?? "").localeCompare(a.datum ?? ""); return d !== 0 ? d : (b.id ?? "").localeCompare(a.id ?? ""); }
      if (sort === "datum-asc") { const d = (a.datum ?? "").localeCompare(b.datum ?? ""); return d !== 0 ? d : (b.id ?? "").localeCompare(a.id ?? ""); }
      if (sort === "hodnoceni-desc") return (b.hodnoceni ?? 0) - (a.hodnoceni ?? 0);
      if (sort === "nazev-asc") return (a.nazev ?? "").localeCompare(b.nazev ?? "", "cs");
      if (sort === "rok-desc") return (parseInt(b.rok) || 0) - (parseInt(a.rok) || 0);
      if (sort === "rok-asc") return (parseInt(a.rok) || 0) - (parseInt(b.rok) || 0);
      return 0;
    });
    return list;
  }, [filmy, q, filters, sort]);

  const openAdd = () => { setEditing(null); setForm(emptyFilm()); setModal(true); };
  const openEdit = f => { setEditing(f.id); setForm({ ...f }); setModal(true); };
  const save = async () => {
    if (!form.nazev?.trim()) return;
    if (editing) {
      const { error } = await supabase.from("filmy").update(form).eq("id", form.id);
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setFilmy(fs => fs.map(f => f.id === editing ? form : f));
    } else {
      const { error } = await supabase.from("filmy").insert({ ...form, user_id: userId });
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setFilmy(fs => [form, ...fs]);
    }
    setModal(false);
  };
  const del = async id => {
    if (!window.confirm("Opravdu chceš smazat tento záznam?")) return;
    await supabase.from("filmy").delete().eq("id", id);
    setFilmy(fs => fs.filter(f => f.id !== id));
  };
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={isAdmin ? openAdd : null} q={q} setQ={setQ} addLabel="Přidat film" onToggleFilters={() => setShowFilters(v => !v)} activeFilterCount={activeFilterCount} sortOptions={FILM_SORT_OPTS} sort={sort} setSort={setSort} />
      {showFilters && <FilmyFilters filters={filters} setFilters={setFilters} filmy={filmy} />}
      {activeFilterCount > 0 && <button onClick={() => setFilters(emptyFilmFilters())} style={{ ...btnSecondary, fontSize: 11, marginBottom: 12, color: T.danger, borderColor: T.danger }}>× Zrušit filtry</button>}
      {filtered.length > 0 ? (
        <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <FilmTableHeader />
          {filtered.map(f => <FilmCard key={f.id} film={f} herci={herci} reziseri={reziseri} onEdit={openEdit} onDelete={del} onDetail={setDetail} isAdmin={isAdmin} />)}
        </div>
      ) : <Empty />}
      {detail && <FilmDetailModal film={detail} filmy={filmy} herci={herci} reziseri={reziseri} onClose={() => setDetail(null)} onEdit={f => { setDetail(null); openEdit(f); }} isAdmin={isAdmin} />}
      <Modal open={modal} title={editing ? "Upravit film" : "Přidat film"} onClose={() => setModal(false)} onSave={save} wide>
        <FilmForm data={form} setData={setForm} herci={herci} reziseri={reziseri} />
      </Modal>
    </div>
  );
}

const SERIAL_SORT_OPTS = [
  { value: "datum-desc", label: "Datum sledování ↓" },
  { value: "datum-asc", label: "Datum sledování ↑" },
  { value: "hodnoceni-desc", label: "Hodnocení ↓" },
  { value: "nazev-asc", label: "Název A–Z" },
  { value: "rok-desc", label: "Rok výroby ↓" },
  { value: "rok-asc", label: "Rok výroby ↑" },
];

function SerialyTab({ serialy, setSerialy, herci, isAdmin, userId }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySerial);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptySerialFilters());
  const [sort, setSort] = useState("datum-desc");
  const [detail, setDetail] = useState(null);
  const filtered = useMemo(() => {
    const f = filters;
    const list = serialy
      .filter(x => !q || x.nazev?.toLowerCase().includes(q.toLowerCase()))
      .filter(x => f.hodnoceniMin == null || (x.hodnoceni ?? 0) >= f.hodnoceniMin)
      .filter(x => !f.platformy.length || f.platformy.includes(x.platforma))
      .filter(x => !f.zanry.length || f.zanry.every(z => (x.zanry ?? []).includes(z)))
      .filter(x => !f.stav.length || f.stav.includes(x.stav))
      .filter(x => !f.rokOd || (x.rok ?? 0) >= parseInt(f.rokOd))
      .filter(x => !f.rokDo || (x.rok ?? 9999) <= parseInt(f.rokDo))
    list.sort((a, b) => {
      if (sort === "datum-desc") { const da = b.konecSledovani||b.zacatekSledovani||""; const db = a.konecSledovani||a.zacatekSledovani||""; const d = da.localeCompare(db); return d !== 0 ? d : (b.id ?? "").localeCompare(a.id ?? ""); }
      if (sort === "datum-asc") { const da = a.konecSledovani||a.zacatekSledovani||""; const db = b.konecSledovani||b.zacatekSledovani||""; const d = da.localeCompare(db); return d !== 0 ? d : (b.id ?? "").localeCompare(a.id ?? ""); }
      if (sort === "hodnoceni-desc") return (b.hodnoceni ?? 0) - (a.hodnoceni ?? 0);
      if (sort === "nazev-asc") return (a.nazev ?? "").localeCompare(b.nazev ?? "", "cs");
      if (sort === "rok-desc") return (parseInt(b.rok) || 0) - (parseInt(a.rok) || 0);
      if (sort === "rok-asc") return (parseInt(a.rok) || 0) - (parseInt(b.rok) || 0);
      return 0;
    });
    return list;
  }, [serialy, q, filters, sort]);

  const openAdd = () => { setEditing(null); setForm(emptySerial()); setModal(true); };
  const openEdit = s => { setEditing(s.id); setForm({ ...s }); setModal(true); };
  const save = async () => {
    if (!form.nazev?.trim()) return;
    if (editing) {
      const { error } = await supabase.from("serialy").update(form).eq("id", form.id);
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setSerialy(ss => ss.map(s => s.id === editing ? form : s));
    } else {
      const { error } = await supabase.from("serialy").insert({ ...form, user_id: userId });
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setSerialy(ss => [form, ...ss]);
    }
    setModal(false);
  };
  const del = async id => {
    if (!window.confirm("Opravdu chceš smazat tento záznam?")) return;
    await supabase.from("serialy").delete().eq("id", id);
    setSerialy(ss => ss.filter(s => s.id !== id));
  };
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={isAdmin ? openAdd : null} q={q} setQ={setQ} addLabel="Přidat seriál" onToggleFilters={() => setShowFilters(v => !v)} activeFilterCount={activeFilterCount} sortOptions={SERIAL_SORT_OPTS} sort={sort} setSort={setSort} />
      {showFilters && <SerialyFilters filters={filters} setFilters={setFilters} serialy={serialy} />}
      {activeFilterCount > 0 && <button onClick={() => setFilters(emptySerialFilters())} style={{ ...btnSecondary, fontSize: 11, marginBottom: 12, color: T.danger, borderColor: T.danger }}>× Zrušit filtry</button>}
      {filtered.length > 0 ? (
        <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <SerialTableHeader />
          {filtered.map(s => <SerialCard key={s.id} serial={s} herci={herci} onEdit={openEdit} onDelete={del} onDetail={setDetail} isAdmin={isAdmin} />)}
        </div>
      ) : <Empty />}
      <Modal open={modal} title={editing ? "Upravit seriál" : "Přidat seriál"} onClose={() => setModal(false)} onSave={save} wide>
        <SerialForm data={form} setData={setForm} herci={herci} />
      </Modal>
      {detail && <SerialDetailModal serial={detail} serialy={serialy} herci={herci} onClose={() => setDetail(null)} onEdit={s => { setDetail(null); openEdit(s); }} isAdmin={isAdmin} />}
    </div>
  );
}

function HerciTab({ herci, setHerci, filmy, serialy, reziseri, isAdmin, userId }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOsoba);
  const [detail, setDetail] = useState(null);

  const countMap = useMemo(() => {
    const m = {};
    filmy.filter(f => !f.rewatch).forEach(f => (f.herciIds ?? []).forEach(id => { m[id] = (m[id] ?? 0) + 1; }));
    serialy.forEach(s => (s.herciIds ?? []).forEach(id => { m[id] = (m[id] ?? 0) + 1; }));
    return m;
  }, [filmy, serialy]);

  const [osobaFilter, setOsobaFilter] = useState(null); // null | 'oblibeny' | 'neoblibeny' | 'mrtvy'

  const filtered = useMemo(() =>
    herci
      .filter(h => h.jmeno?.toLowerCase().includes(q.toLowerCase()))
      .filter(h => osobaFilter === 'oblibeny' ? h.oblibeny : osobaFilter === 'neoblibeny' ? h.neoblibeny : osobaFilter === 'mrtvy' ? h.zijici === 'Ne' : true)
      .sort((a, b) => a.jmeno.localeCompare(b.jmeno, "cs")),
    [herci, q, osobaFilter]
  );

  const openAdd = () => { setEditing(null); setForm(emptyOsoba()); setModal(true); };
  const openEdit = h => { setEditing(h.id); setForm({ ...h }); setModal(true); };
  const save = async () => {
    if (!form.jmeno?.trim()) return;
    if (editing) {
      const { error } = await supabase.from("herci").update(form).eq("id", form.id);
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setHerci(hs => hs.map(h => h.id === editing ? form : h));
    } else {
      const { error } = await supabase.from("herci").insert(form);
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setHerci(hs => [...hs, form]);
    }
    setModal(false);
  };
  const del = async id => {
    if (!window.confirm("Opravdu chceš smazat tento záznam?")) return;
    await supabase.from("herci").delete().eq("id", id);
    setHerci(hs => hs.filter(h => h.id !== id));
  };

  const handleToggle = async (id, field, value) => {
    const update = field === "zijici" ? { zijici: value ? "Ne" : "Ano" } : { [field]: value };
    await supabase.from("herci").update(update).eq("id", id);
    setHerci(hs => hs.map(h => h.id === id ? { ...h, ...update } : h));
    setDetail(d => d && d.id === id ? { ...d, ...update } : d);
  };

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={isAdmin ? openAdd : null} q={q} setQ={setQ} addLabel="Přidat herce" />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[{k: null, l: "Všichni"}, {k: "oblibeny", l: "★ Oblíbení"}, {k: "neoblibeny", l: "✕ Neoblíbení"}, {k: "mrtvy", l: "† Po smrti"}].map(({ k, l }) => (
          <FilterPill key={l} label={l} active={osobaFilter === k} onClick={() => setOsobaFilter(k)} />
        ))}
      </div>
      {filtered.length > 0 ? (
        <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <OsobaTableHeader />
          {filtered.map(h => <OsobaCard key={h.id} osoba={h} onEdit={openEdit} onDelete={del} onDetail={setDetail} filmCount={countMap[h.id] ?? 0} isAdmin={isAdmin} />)}
        </div>
      ) : <Empty />}
      <Modal open={modal} title={editing ? "Upravit herce" : "Přidat herce"} onClose={() => setModal(false)} onSave={save}>
        <OsobaForm data={form} setData={setForm} showNeoblibeny />
      </Modal>
      {detail && <OsobaDetailModal osoba={detail} filmy={filmy} serialy={serialy} herci={herci} reziseri={reziseri} onClose={() => setDetail(null)} onToggle={handleToggle} showNeoblibeny />}
    </div>
  );
}

function ReziseriTab({ reziseri, setReziseri, filmy, herci, isAdmin, userId }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOsoba);
  const [detail, setDetail] = useState(null);

  const countMap = useMemo(() => {
    const m = {};
    filmy.filter(f => !f.rewatch).forEach(f => (f.reziserIds ?? []).forEach(id => { m[id] = (m[id] ?? 0) + 1; }));
    return m;
  }, [filmy]);

  const [osobaFilter, setOsobaFilter] = useState(null);

  const filtered = useMemo(() =>
    reziseri
      .filter(r => r.jmeno?.toLowerCase().includes(q.toLowerCase()))
      .filter(r => osobaFilter === 'oblibeny' ? r.oblibeny : osobaFilter === 'mrtvy' ? r.zijici === 'Ne' : true)
      .sort((a, b) => a.jmeno.localeCompare(b.jmeno, "cs")),
    [reziseri, q, osobaFilter]
  );

  const openAdd = () => { setEditing(null); setForm(emptyOsoba()); setModal(true); };
  const openEdit = r => { setEditing(r.id); setForm({ ...r }); setModal(true); };
  const save = async () => {
    if (!form.jmeno?.trim()) return;
    if (editing) {
      const { neoblibeny: _, ...formReziser } = form;
      const { error } = await supabase.from("reziseri").update(formReziser).eq("id", form.id);
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setReziseri(rs => rs.map(r => r.id === editing ? form : r));
    } else {
      const { neoblibeny: _, ...formReziser } = form;
      const { error } = await supabase.from("reziseri").insert(formReziser);
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setReziseri(rs => [...rs, form]);
    }
    setModal(false);
  };
  const del = async id => {
    if (!window.confirm("Opravdu chceš smazat tento záznam?")) return;
    await supabase.from("reziseri").delete().eq("id", id);
    setReziseri(rs => rs.filter(r => r.id !== id));
  };

  const handleToggle = async (id, field, value) => {
    const update = field === "zijici" ? { zijici: value ? "Ne" : "Ano" } : { [field]: value };
    await supabase.from("reziseri").update(update).eq("id", id);
    setReziseri(rs => rs.map(r => r.id === id ? { ...r, ...update } : r));
    setDetail(d => d && d.id === id ? { ...d, ...update } : d);
  };

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={isAdmin ? openAdd : null} q={q} setQ={setQ} addLabel="Přidat režiséra" />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[{k: null, l: "Všichni"}, {k: "oblibeny", l: "★ Oblíbení"}, {k: "mrtvy", l: "† Po smrti"}].map(({ k, l }) => (
          <FilterPill key={l} label={l} active={osobaFilter === k} onClick={() => setOsobaFilter(k)} />
        ))}
      </div>
      {filtered.length > 0 ? (
        <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <OsobaTableHeader />
          {filtered.map(r => <OsobaCard key={r.id} osoba={r} onEdit={openEdit} onDelete={del} onDetail={setDetail} filmCount={countMap[r.id] ?? 0} isAdmin={isAdmin} />)}
        </div>
      ) : <Empty />}
      <Modal open={modal} title={editing ? "Upravit režiséra" : "Přidat režiséra"} onClose={() => setModal(false)} onSave={save}>
        <OsobaForm data={form} setData={setForm} />
      </Modal>
      {detail && <OsobaDetailModal osoba={detail} filmy={filmy} herci={herci} reziseri={reziseri} onClose={() => setDetail(null)} onToggle={handleToggle} />}
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: "center", color: T.muted, padding: "48px 0", fontSize: 13 }}>Žádné výsledky</div>;
}

// ─── BILANCE – KOMPONENTY ─────────────────────────────────────────────────────
const MONTHS_CZ = ['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];

function BarChart({ data, height = 120, accent = false }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>
      {data.map((d, i) => {
        const isTop = d.value === maxVal && d.value > 0;
        const isLast = i === data.length - 1;
        const bg = isTop && accent ? T.gold : isLast && accent ? T.gold : T.text;
        const op = isTop || isLast ? 1 : 0.45;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 }}>
            {d.value > 0 && <div style={{ fontFamily: F.mono, fontSize: 9, color: isTop && accent ? T.gold : T.muted, fontWeight: isTop ? 600 : 400 }}>{d.value}</div>}
            <div style={{ width: '100%', height: `${Math.max((d.value / max) * height, d.value > 0 ? 3 : 0)}px`, background: bg, opacity: op }} />
          </div>
        );
      })}
    </div>
  );
}

function BarLabels({ data }) {
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, fontFamily: F.mono, fontSize: 9, color: d.value === maxVal && d.value > 0 ? T.gold : T.muted, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
      ))}
    </div>
  );
}

function HBarChart({ data, limit = 20 }) {
  const visible = data.slice(0, limit);
  const max = Math.max(...visible.map(d => d.value), 1);
  return (
    <div>
      {visible.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 30px', gap: 10, padding: '6px 0', alignItems: 'center', borderBottom: i < visible.length - 1 ? `1px solid ${T.border}` : 'none' }}>
          <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: '-0.01em' }}>{d.label}</span>
          <div style={{ height: 3, background: T.border, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${(d.value / max) * 100}%`, background: i === 0 ? T.gold : T.text }} />
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: T.text, textAlign: 'right' }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function BilStat({ label, value, sub, color = T.text }) {
  return (
    <div>
      <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 500, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BilCard({ title, meta, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        paddingBottom: 8, borderBottom: `1px solid ${T.text}`, marginBottom: 16,
      }}>
        <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 500, color: T.text, letterSpacing: '-0.025em' }}>{title}</div>
        {meta && <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{meta}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashSectionHead({ title, meta, tight = false }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      paddingBottom: tight ? 6 : 9,
      borderBottom: `1px solid ${T.text}`,
      marginBottom: tight ? 12 : 16,
    }}>
      <div style={{ fontFamily: F.display, fontSize: tight ? 17 : 20, fontWeight: 500, color: T.text, letterSpacing: "-0.025em" }}>{title}</div>
      {meta && <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{meta}</div>}
    </div>
  );
}

function DashKV({ label, value, suffix }) {
  return (
    <div>
      <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: F.display, fontSize: 40, fontWeight: 500, color: T.text, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</span>
        {suffix && <span style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{suffix}</span>}
      </div>
    </div>
  );
}

function DashboardTab({ filmy, serialy, herci, reziseri }) {
  const isMobile = useMobile();
  const [detail, setDetail] = useState(null);
  const now = new Date();
  const dayNames = ["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
  const monthNames = ["ledna","února","března","dubna","května","června","července","srpna","září","října","listopadu","prosince"];
  const dateStr = `${dayNames[now.getDay()]} ${now.getDate()}. ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const currentMonth = now.toISOString().slice(0, 7);
  const currentYear = now.getFullYear().toString();
  const totalThisMonth = filmy.filter(f => f.datum?.startsWith(currentMonth)).length
    + serialy.filter(s => (s.konecSledovani || s.zacatekSledovani)?.startsWith(currentMonth)).length;
  const totalThisYear = filmy.filter(f => f.datum?.startsWith(currentYear)).length
    + serialy.filter(s => (s.konecSledovani || s.zacatekSledovani)?.startsWith(currentYear)).length;
  const allRated = [...filmy, ...serialy].filter(x => x.hodnoceni);
  const avgRating = allRated.length
    ? (allRated.reduce((s, x) => s + x.hodnoceni, 0) / allRated.length).toFixed(1)
    : "—";

  // Recent items
  const recent = [
    ...filmy.map(f => ({ ...f, _type: "film", _date: f.datum })),
    ...serialy.map(s => ({ ...s, _type: "serial", _date: s.konecSledovani || s.zacatekSledovani })),
  ].filter(x => x._date).sort((a, b) => b._date.localeCompare(a._date)).slice(0, 6);

  // Monthly activity — last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("cs", { month: "short" }).slice(0, 2);
    const count = filmy.filter(f => f.datum?.startsWith(key)).length
      + serialy.filter(s => (s.konecSledovani || s.zacatekSledovani)?.startsWith(key)).length;
    return { key, label, count };
  });
  const maxCount = Math.max(...months.map(m => m.count), 1);

  // Top genres
  const genreCount = {};
  [...filmy, ...serialy].forEach(x => (x.zanry ?? []).forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; }));
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxGenre = topGenres[0]?.[1] || 1;
  const totalItems = filmy.length + serialy.length || 1;

  // Top režiséři
  const topReziseri = reziseri
    .map(r => ({ ...r, count: filmy.filter(f => (f.reziserIds ?? []).includes(r.id)).length }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxReziser = topReziseri[0]?.count || 1;

  // Top herci
  const topHerci = herci
    .map(h => ({ ...h, count: filmy.filter(f => (f.herciIds ?? []).includes(h.id)).length + serialy.filter(s => (s.herciIds ?? []).includes(h.id)).length }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxHerec = topHerci[0]?.count || 1;

  return (
    <div>
      {/* Masthead */}
      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
        alignItems: "flex-end", gap: 32,
        paddingBottom: 24, marginBottom: 32,
        borderBottom: `1px solid ${T.text}`,
      }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
            {dateStr}
          </div>
          <div style={{ maxWidth: 500, fontSize: 15, color: T.inkSoft, lineHeight: 1.55 }}>
            Ve sbírce je <strong style={{ color: T.text }}>{filmy.length} filmů</strong> a <strong style={{ color: T.text }}>{serialy.length} seriálů</strong>. Průměrné hodnocení <strong style={{ color: T.text }}>{avgRating}</strong>.
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
            <DashKV label={now.toLocaleString("cs", { month: "long" })} value={totalThisMonth} suffix="položek" />
            <DashKV label={`Rok ${currentYear}`} value={totalThisYear} suffix="položek" />
            <DashKV label="Průměr" value={avgRating} suffix="/10" />
          </div>
        )}
      </div>

      {/* 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.55fr 1fr", gap: 44 }}>
        {/* LEFT — nedávno zhlédnuté */}
        <div>
          <DashSectionHead title="Naposledy zhlédnuté" meta={`${recent.length} záznamů`} />
          {recent.length === 0 && <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted }}>Žádné záznamy.</div>}
          {recent.map((item, i) => (
            <div key={item.id + item._type} style={{
              display: "grid", gridTemplateColumns: "54px 1fr 80px",
              gap: 16, padding: "13px 0",
              borderBottom: `1px solid ${T.border}`,
              alignItems: "baseline",
            }}>
              <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{fmtDate(item._date).slice(0, 5)}</div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span onClick={() => setDetail(item)} style={{ fontFamily: F.display, fontSize: 17, fontWeight: 500, color: T.text, letterSpacing: "-0.02em", cursor: "pointer" }} onMouseEnter={e => e.target.style.color=T.gold} onMouseLeave={e => e.target.style.color=T.text}>{item.nazev}</span>
                  {item.rok && <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{item.rok}</span>}
                  {item._type === "serial" && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.muted, letterSpacing: "0.1em" }}>seriál</span>}
                  {item.rewatch && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.muted, letterSpacing: "0.1em" }}>Rewatch</span>}
                  {item.doporuceni && <span style={{ fontFamily: F.mono, fontSize: 9, color: T.green, letterSpacing: "0.1em" }}>Doporučení</span>}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, marginTop: 3 }}>
                  {item.platforma}{item.zanry?.length ? ` · ${item.zanry.slice(0, 2).join(", ")}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}><Rating value={item.hodnoceni} /></div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div>
          {/* Aktivita */}
          <div style={{ marginBottom: 32 }}>
            <DashSectionHead title="Aktivita" meta="12 měsíců" tight />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 88, borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>
              {months.map((m, i) => {
                const isLast = i === months.length - 1;
                return (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                    {m.count > 0 && <div style={{ fontFamily: F.mono, fontSize: 9, color: isLast ? T.gold : T.muted, fontWeight: isLast ? 600 : 400 }}>{m.count}</div>}
                    <div style={{ width: "100%", height: `${Math.max((m.count / maxCount) * 68, m.count ? 3 : 0)}px`, background: isLast ? T.gold : T.text }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
              {months.map((m, i) => (
                <div key={m.key} style={{ flex: 1, fontFamily: F.mono, fontSize: 9, color: i === 11 ? T.gold : T.muted, textAlign: "center" }}>{m.label}</div>
              ))}
            </div>
          </div>

          {/* Žánry */}
          {topGenres.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <DashSectionHead title="Žánry" meta="Top 5" tight />
              {topGenres.map(([genre, count], i) => (
                <div key={genre} style={{
                  display: "grid", gridTemplateColumns: "88px 1fr 30px 38px",
                  gap: 10, padding: "7px 0", alignItems: "center",
                  borderBottom: i < topGenres.length - 1 ? `1px solid ${T.border}` : "none",
                }}>
                  <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>{genre}</span>
                  <div style={{ height: 3, background: T.border, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${(count / maxGenre) * 100}%`, background: i === 0 ? T.gold : T.text }} />
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: T.text, textAlign: "right" }}>{count}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, textAlign: "right" }}>{Math.round((count / totalItems) * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Top režiséři */}
          {topReziseri.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <DashSectionHead title="Režiséři" meta="Top 5" tight />
              {topReziseri.map((r, i) => (
                <div key={r.id} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 28px",
                  gap: 10, padding: "7px 0", alignItems: "center",
                  borderBottom: i < topReziseri.length - 1 ? `1px solid ${T.border}` : "none",
                }}>
                  <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>{r.jmeno}</span>
                  <div style={{ height: 3, background: T.border, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${(r.count / maxReziser) * 100}%`, background: i === 0 ? T.gold : T.text }} />
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: T.text, textAlign: "right" }}>{r.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Top herci */}
          {topHerci.length > 0 && (
            <div>
              <DashSectionHead title="Herci" meta="Top 5" tight />
              {topHerci.map((h, i) => (
                <div key={h.id} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 28px",
                  gap: 10, padding: "7px 0", alignItems: "center",
                  borderBottom: i < topHerci.length - 1 ? `1px solid ${T.border}` : "none",
                }}>
                  <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>{h.jmeno}</span>
                  <div style={{ height: 3, background: T.border, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${(h.count / maxHerec) * 100}%`, background: i === 0 ? T.gold : T.text }} />
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: T.text, textAlign: "right" }}>{h.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {detail && detail._type === "film" && <FilmDetailModal film={detail} filmy={filmy} herci={herci} reziseri={reziseri} onClose={() => setDetail(null)} onEdit={() => {}} isAdmin={false} />}
      {detail && detail._type === "serial" && <SerialDetailModal serial={detail} serialy={serialy} herci={herci} onClose={() => setDetail(null)} onEdit={() => {}} isAdmin={false} />}
    </div>
  );
}

function BilanceFilmyTab({ filmy }) {
  const isMobile = useMobile();
  const currentYear = new Date().getFullYear();
  const rated = filmy.filter(f => f.hodnoceni);
  const avg = rated.length ? (rated.reduce((a, f) => a + f.hodnoceni, 0) / rated.length).toFixed(1) : '–';
  const thisYear = filmy.filter(f => f.datum?.startsWith(String(currentYear)));
  const totalMin = filmy.filter(f => f.stopaz).reduce((a, f) => a + (parseInt(f.stopaz) || 0), 0);
  const totalHod = Math.round(totalMin / 60);

  const byYear = {};
  filmy.filter(f => f.datum).forEach(f => { const y = f.datum.slice(0,4); byYear[y]=(byYear[y]||0)+1; });
  const byYearData = Object.keys(byYear).sort().map(y => ({ label: y, value: byYear[y] }));
  const topYear = byYearData.reduce((a, b) => b.value > a.value ? b : a, { value: 0 });

  const monthData = MONTHS_CZ.map(l => ({ label: l, value: 0 }));
  thisYear.forEach(f => { monthData[parseInt(f.datum.slice(5,7))-1].value++; });

  const byPlat = {};
  filmy.forEach(f => { if (f.platforma) byPlat[f.platforma]=(byPlat[f.platforma]||0)+1; });
  const platData = Object.entries(byPlat).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({label:l,value:v}));

  const ratingData = Array.from({length:10},(_,i)=>({ label:String(i+1), value:0 }));
  rated.forEach(f => { ratingData[f.hodnoceni-1].value++; });
  const ratingMode = ratingData.reduce((a, b) => b.value > a.value ? b : a, { value: 0 });

  const byDec = {};
  filmy.filter(f=>f.rok).forEach(f => { const d=Math.floor(parseInt(f.rok)/10)*10; byDec[d]=(byDec[d]||0)+1; });
  const decData = Object.keys(byDec).sort().map(d=>({ label:`${d}s`, value:byDec[d] }));

  const byGenre = {};
  filmy.forEach(f => { (f.zanry??[]).forEach(z => { byGenre[z]=(byGenre[z]||0)+1; }); });
  const genreData = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({label:l,value:v}));

  const delkaData = [
    { label: 'do 90 min',   value: filmy.filter(f => f.stopaz && parseInt(f.stopaz) < 90).length },
    { label: '90–120 min',  value: filmy.filter(f => f.stopaz && parseInt(f.stopaz) >= 90 && parseInt(f.stopaz) < 120).length },
    { label: '120–150 min', value: filmy.filter(f => f.stopaz && parseInt(f.stopaz) >= 120 && parseInt(f.stopaz) < 150).length },
    { label: '150+ min',    value: filmy.filter(f => f.stopaz && parseInt(f.stopaz) >= 150).length },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Masthead */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
        alignItems: 'flex-end', gap: 32,
        paddingBottom: 24, marginBottom: 32,
        borderBottom: `1px solid ${T.text}`,
      }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Bilance · Filmy
          </div>
          <h1 style={{ margin: 0, fontFamily: F.display, fontSize: isMobile ? 40 : 64, fontWeight: 500, color: T.text, letterSpacing: '-0.04em', lineHeight: 0.92 }}>
            Filmy<span style={{ color: T.gold, fontWeight: 600 }}>.</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 24 : 40, flexWrap: 'wrap' }}>
          <BilStat label="Celkem" value={filmy.length} />
          <BilStat label="Průměr" value={avg} color={T.gold} sub={`modus ${ratingMode.label}`} />
          {totalHod > 0 && <BilStat label="Hodin" value={totalHod} sub={`${totalMin} min`} />}
        </div>
      </div>

      {/* Roky — full width */}
      <div style={{ marginBottom: 40 }}>
        <BilCard title="Zhlédnuto po letech" meta={`${byYearData.length} let · rekord ${topYear.label} · ${topYear.value}`}>
          <BarChart data={byYearData} height={140} accent />
          <BarLabels data={byYearData} />
        </BilCard>
      </div>

      {/* 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, marginBottom: 40 }}>
        <BilCard title={`Měsíce ${currentYear}`} meta={`${thisYear.length} filmů`}>
          <BarChart data={monthData} height={100} />
          <BarLabels data={monthData} />
        </BilCard>
        <BilCard title="Hodnocení" meta={`1–10 · modus ${ratingMode.label}`}>
          <BarChart data={ratingData} height={100} accent />
          <BarLabels data={ratingData} />
        </BilCard>
        <BilCard title="Platformy" meta={`${platData.length} platforem`}>
          <HBarChart data={platData} />
        </BilCard>
        <BilCard title="Žánry" meta={`${genreData.length} žánrů`}>
          <HBarChart data={genreData} />
        </BilCard>
        <BilCard title="Dekády vzniku" meta="rok výroby">
          <HBarChart data={decData} />
        </BilCard>
        {delkaData.length > 0 && <BilCard title="Délka filmů" meta="distribuce stopáže">
          <HBarChart data={delkaData} />
        </BilCard>}
      </div>
    </div>
  );
}

function BilanceSerialyTab({ serialy }) {
  const isMobile = useMobile();
  const currentYear = new Date().getFullYear();
  const finished = serialy.filter(s => s.konecSledovani);
  const rated = finished.filter(s => s.hodnoceni);
  const avg = rated.length ? (rated.reduce((a, s) => a + s.hodnoceni, 0) / rated.length).toFixed(1) : '–';
  const thisYear = finished.filter(s => s.konecSledovani.startsWith(String(currentYear)));

  const byYear = {};
  finished.forEach(s => { const y = s.konecSledovani.slice(0,4); byYear[y]=(byYear[y]||0)+1; });
  const byYearData = Object.keys(byYear).sort().map(y => ({ label: y, value: byYear[y] }));
  const topYear = byYearData.reduce((a, b) => b.value > a.value ? b : a, { value: 0 });

  const monthData = MONTHS_CZ.map(l => ({ label: l, value: 0 }));
  thisYear.forEach(s => { monthData[parseInt(s.konecSledovani.slice(5,7))-1].value++; });

  const byPlat = {};
  finished.forEach(s => { if (s.platforma) byPlat[s.platforma]=(byPlat[s.platforma]||0)+1; });
  const platData = Object.entries(byPlat).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({label:l,value:v}));

  const ratingData = Array.from({length:10},(_,i)=>({ label:String(i+1), value:0 }));
  rated.forEach(s => { ratingData[s.hodnoceni-1].value++; });
  const ratingMode = ratingData.reduce((a, b) => b.value > a.value ? b : a, { value: 0 });

  const byDec = {};
  finished.filter(s=>s.rok).forEach(s => { const d=Math.floor(parseInt(s.rok)/10)*10; byDec[d]=(byDec[d]||0)+1; });
  const decData = Object.keys(byDec).sort().map(d=>({ label:`${d}s`, value:byDec[d] }));

  const byGenre = {};
  finished.forEach(s => { (s.zanry??[]).forEach(z => { byGenre[z]=(byGenre[z]||0)+1; }); });
  const genreData = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({label:l,value:v}));

  const stavCounts = { Dokoukáno: 0, Sleduji: 0, Nedokončeno: 0, Plánuji: 0 };
  serialy.forEach(s => { if (s.stav && stavCounts[s.stav] !== undefined) stavCounts[s.stav]++; });

  // Série distribuce
  const serieCount = { '1': 0, '2': 0, '3–4': 0, '5+': 0 };
  serialy.forEach(s => {
    const n = Array.isArray(s.serie) ? s.serie.length : (s.serie ? 1 : 0);
    if (n === 1) serieCount['1']++;
    else if (n === 2) serieCount['2']++;
    else if (n >= 3 && n <= 4) serieCount['3–4']++;
    else if (n >= 5) serieCount['5+']++;
  });
  const serieData = Object.entries(serieCount).filter(([,v]) => v > 0).map(([l,v]) => ({ label: `${l} série`, value: v }));
  const totalDilu = serialy.reduce((a, s) => a + (parseInt(s.pocetDilu) || 0), 0);

  return (
    <div>
      {/* Masthead */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
        alignItems: 'flex-end', gap: 32,
        paddingBottom: 24, marginBottom: 32,
        borderBottom: `1px solid ${T.text}`,
      }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Bilance · Seriály
          </div>
          <h1 style={{ margin: 0, fontFamily: F.display, fontSize: isMobile ? 40 : 64, fontWeight: 500, color: T.text, letterSpacing: '-0.04em', lineHeight: 0.92 }}>
            Seriály<span style={{ color: T.gold, fontWeight: 600 }}>.</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 24 : 40, flexWrap: 'wrap' }}>
          <BilStat label="Celkem" value={serialy.length} />
          <BilStat label="Průměr" value={avg} color={T.gold} sub={`z ${rated.length} hodnocených`} />
          <BilStat label={`Rok ${currentYear}`} value={thisYear.length} />
        </div>
      </div>

      {/* Roky */}
      <div style={{ marginBottom: 40 }}>
        <BilCard title="Zhlédnuto po letech" meta={byYearData.length > 0 ? `rekord ${topYear.label} · ${topYear.value}` : ''}>
          <BarChart data={byYearData} height={140} accent />
          <BarLabels data={byYearData} />
        </BilCard>
      </div>

      {/* 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, marginBottom: 40 }}>
        <BilCard title={`Měsíce ${currentYear}`} meta={`${thisYear.length} seriálů`}>
          <BarChart data={monthData} height={100} />
          <BarLabels data={monthData} />
        </BilCard>
        <BilCard title="Hodnocení" meta={`1–10 · modus ${ratingMode.label}`}>
          <BarChart data={ratingData} height={100} accent />
          <BarLabels data={ratingData} />
        </BilCard>
        <BilCard title="Platformy" meta={`${platData.length} platforem`}>
          <HBarChart data={platData} />
        </BilCard>
        {genreData.length > 0 && <BilCard title="Žánry" meta={`${genreData.length} žánrů`}>
          <HBarChart data={genreData} />
        </BilCard>}
        <BilCard title="Dekády vzniku" meta="rok výroby">
          <HBarChart data={decData} />
        </BilCard>
        {serieData.length > 0 && <BilCard title="Počet sérií" meta={totalDilu > 0 ? `${totalDilu} dílů celkem` : ''}>
          <HBarChart data={serieData} />
        </BilCard>}
      </div>
    </div>
  );
}

// ─── WATCHLIST ────────────────────────────────────────────────────────────────
const emptyWatchItem = () => ({ id: uid(), typ: "film", nazev: "", platforma: "", rok: "", zanry: [], poznamka: "" });

function WatchlistTab({ watchlist, setWatchlist, isAdmin, userId }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyWatchItem());

  const filtered = useMemo(() =>
    watchlist.filter(x => !q || x.nazev?.toLowerCase().includes(q.toLowerCase())),
    [watchlist, q]
  );

  const byPlatform = useMemo(() => {
    const groups = {};
    filtered.forEach(x => {
      const k = x.platforma || "Bez platformy";
      if (!groups[k]) groups[k] = [];
      groups[k].push(x);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const openAdd = () => { setEditing(null); setForm(emptyWatchItem()); setModal(true); };
  const openEdit = item => { setEditing(item.id); setForm({ ...item }); setModal(true); };
  const save = async () => {
    if (!form.nazev?.trim()) return;
    if (editing) {
      const { error } = await supabase.from("watchlist").update(form).eq("id", form.id);
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setWatchlist(w => w.map(x => x.id === editing ? form : x));
    } else {
      const { error } = await supabase.from("watchlist").insert({ ...form, user_id: userId });
      if (error) { alert("Chyba při ukládání: " + error.message); return; }
      setWatchlist(w => [form, ...w]);
    }
    setModal(false);
  };
  const del = async id => {
    if (!window.confirm("Opravdu chceš smazat tento záznam?")) return;
    await supabase.from("watchlist").delete().eq("id", id);
    setWatchlist(w => w.filter(x => x.id !== id));
  };
  const u = (k, v) => setForm(d => ({ ...d, [k]: v }));

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={isAdmin ? openAdd : null} q={q} setQ={setQ} addLabel="Přidat" />

      {/* Přehled platforem */}
      {watchlist.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {Object.entries((() => { const m = {}; watchlist.forEach(x => { const k = x.platforma||"Bez platformy"; m[k]=(m[k]||0)+1; }); return m; })()).sort((a,b) => b[1]-a[1]).map(([plat, cnt]) => (
            <div key={plat} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 16px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.gold, fontFamily: F.display, lineHeight: 1 }}>{cnt}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 3, textAlign: "center" }}>{plat}</div>
            </div>
          ))}
        </div>
      )}

      {byPlatform.length === 0 && <Empty />}

      {byPlatform.map(([plat, items]) => (
        <div key={plat} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            {plat}
            <span style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0 6px", fontSize: 10, color: T.gold }}>{items.length}</span>
          </div>
          {items.map(item => (
            <div key={item.id} style={{ ...cardStyle, borderColor: T.border }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: F.display }}>{item.nazev}</span>
                  {item.rok && <span style={{ color: T.muted, fontSize: 12 }}>{item.rok}</span>}
                  <Badge color={item.typ === "serial" ? T.blue : T.purple}>{item.typ === "serial" ? "Seriál" : "Film"}</Badge>
                </div>
                {(item.zanry ?? []).length > 0 && <div style={{ marginBottom: 4 }}><TagList items={item.zanry} /></div>}
                {item.poznamka && <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>{item.poznamka}</div>}
              </div>
              {isAdmin && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
                  <button onClick={() => openEdit(item)} style={btnSecondary}>Upravit</button>
                  <button onClick={() => del(item.id)} style={btnDanger}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <Modal open={modal} title={editing ? "Upravit položku" : "Přidat do watchlistu"} onClose={() => setModal(false)} onSave={save}>
        <div style={{ display: "grid", gap: "0 20px" }}>
          <TextInput label="Název" value={form.nazev} onChange={v => u("nazev", v)} placeholder="Název filmu / seriálu" />
          <Field label="Typ">
            <div style={{ display: "flex", gap: 6 }}>
              {["film","serial"].map(t => (
                <button key={t} onClick={() => u("typ", t)} style={{ ...btnSecondary, borderColor: form.typ === t ? T.gold : T.border, color: form.typ === t ? T.gold : T.muted }}>
                  {t === "film" ? "Film" : "Seriál"}
                </button>
              ))}
            </div>
          </Field>
          <SelectInput label="Platforma" value={form.platforma} onChange={v => u("platforma", v)} options={PLATFORMY} />
          <TextInput label="Rok" value={form.rok} onChange={v => u("rok", v)} placeholder="2024" />
          <GenreSelector value={form.zanry} onChange={v => u("zanry", v)} />
          <Field label="Poznámka">
            <input value={form.poznamka ?? ""} onChange={e => u("poznamka", e.target.value)} placeholder="Proč chceš vidět..." style={inp} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Přehled" },
  { id: "filmy", label: "Filmy" },
  { id: "serialy", label: "Seriály" },
  { id: "herci", label: "Herci" },
  { id: "reziseri", label: "Režiséři" },
  { id: "bilance-filmy", label: "Bilance filmů" },
  { id: "bilance-serialy", label: "Bilance seriálů" },
  { id: "watchlist", label: "Watchlist" },
];

function ResetPasswordModal({ open, onDone }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (password.length < 6) { setError("Heslo musí mít alespoň 6 znaků."); return; }
    if (password !== password2) { setError("Hesla se neshodují."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(onDone, 1500);
  };

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, width: 340, padding: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: F.display, marginBottom: 20 }}>Nastavit nové heslo</div>
        {done ? (
          <div style={{ fontSize: 13, color: T.green, textAlign: "center", padding: "12px 0" }}>✓ Heslo bylo změněno.</div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>Nové heslo</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inp} autoFocus />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>Zopakovat heslo</label>
              <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} style={inp} onKeyDown={e => e.key === "Enter" && save()} />
            </div>
            {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12 }}>{error}</div>}
            <button onClick={save} style={{ ...btnPrimary, width: "100%" }} disabled={loading}>{loading ? "..." : "Uložit heslo"}</button>
          </>
        )}
      </div>
    </div>
  );
}

function LoginModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError("Nesprávný e-mail nebo heslo.");
    else onClose();
  };

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, width: 340, padding: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: F.display, marginBottom: 20 }}>Přihlásit se</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>Heslo</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inp} onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary}>Zrušit</button>
          <button onClick={login} style={btnPrimary} disabled={loading}>{loading ? "..." : "Přihlásit"}</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [filmy, setFilmy] = useState([]);
  const [serialy, setSerialy] = useState([]);
  const [herci, setHerci] = useState([]);
  const [reziseri, setReziseri] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [loginModal, setLoginModal] = useState(false);
  const [resetModal, setResetModal] = useState(() => {
    const h = window.location.hash;
    const q = window.location.search;
    return h.includes("type=recovery") || q.includes("type=recovery");
  });
  const [tab, setTab] = useState("dashboard");
  const [darkMode, setDarkMode] = useLS("wl_theme_dark", true);

  applyTheme(darkMode);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = T.bg;

    // Auth
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setResetModal(true);
    });

    // Fetch data
    Promise.all([
      supabase.from("herci").select("*"),
      supabase.from("reziseri").select("*"),
      supabase.from("filmy").select("*"),
      supabase.from("serialy").select("*"),
      supabase.from("watchlist").select("*"),
    ]).then(([h, r, f, s, w]) => {
      setHerci(h.data ?? []);
      setReziseri(r.data ?? []);
      setFilmy(f.data ?? []);
      setSerialy(s.data ?? []);
      setWatchlist(w.data ?? []);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isMobile = useIsMobile();
  const isAdmin = !!session;
  const counts = { filmy: filmy.length, serialy: serialy.length, herci: herci.length, reziseri: reziseri.length, watchlist: watchlist.length };

  return (
    <MobileCtx.Provider value={isMobile}>
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.sans, fontSize: 13 }}>
      {/* Navigace */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, position: "sticky", top: 0, zIndex: 100 }}>
        {/* Horní lišta: wordmark + akce */}
        <div style={{ padding: isMobile ? "0 14px" : "0 28px", display: "flex", alignItems: "center", height: isMobile ? 46 : 54, gap: 8 }}>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, background: T.text, borderRadius: "50%" }} />
            <div style={{ fontFamily: F.display, fontSize: isMobile ? 15 : 17, fontWeight: 500, color: T.text, letterSpacing: "-0.025em", lineHeight: 1 }}>
              Filmotéka
            </div>
          </div>

          <div style={{ flex: 1 }} />
          <button onClick={() => setDarkMode(d => !d)} title={darkMode ? "Světlý režim" : "Tmavý režim"}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 15, padding: "0 6px", display: "flex", alignItems: "center" }}
          >{darkMode ? "☀️" : "🌙"}</button>
          {isAdmin
            ? <>
                <button onClick={stahnoutZalohu} title="Stáhnout zálohu" style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, padding: "0 4px", display: "flex", alignItems: "center" }}>💾</button>
                <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.08em", padding: "0 8px" }}>odhlásit</button>
              </>
            : <button onClick={() => setLoginModal(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.08em", padding: "0 8px" }}>přihlásit</button>
          }
        </div>
        {/* Taby */}
        <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", borderTop: `1px solid ${T.border}`, padding: isMobile ? "0 6px" : "0 20px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", flexShrink: 0,
              padding: isMobile ? "0 10px" : "0 14px",
              fontFamily: F.sans, fontSize: isMobile ? 12 : 13, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? T.text : T.muted,
              borderBottom: tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 5,
              height: isMobile ? 36 : 42, whiteSpace: "nowrap",
              letterSpacing: "-0.005em",
            }}>
              {t.label}
              {counts[t.id] != null && counts[t.id] > 0 && (
                <span style={{ fontFamily: F.mono, fontSize: 9, color: T.muted, opacity: 0.8 }}>{counts[t.id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Obsah */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: isMobile ? "14px 12px" : "28px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: T.muted, padding: "80px 0", fontSize: 14 }}>Načítám...</div>
        ) : (
          <>
            {tab === "dashboard" && <DashboardTab filmy={filmy} serialy={serialy} herci={herci} reziseri={reziseri} />}
            {tab === "filmy" && <FilmyTab filmy={filmy} setFilmy={setFilmy} herci={herci} reziseri={reziseri} isAdmin={isAdmin} userId={session?.user?.id} />}
            {tab === "serialy" && <SerialyTab serialy={serialy} setSerialy={setSerialy} herci={herci} isAdmin={isAdmin} userId={session?.user?.id} />}
            {tab === "herci" && <HerciTab herci={herci} setHerci={setHerci} filmy={filmy} serialy={serialy} reziseri={reziseri} isAdmin={isAdmin} userId={session?.user?.id} />}
            {tab === "reziseri" && <ReziseriTab reziseri={reziseri} setReziseri={setReziseri} filmy={filmy} herci={herci} isAdmin={isAdmin} userId={session?.user?.id} />}
            {tab === "bilance-filmy" && <BilanceFilmyTab filmy={filmy} />}
            {tab === "bilance-serialy" && <BilanceSerialyTab serialy={serialy} />}
            {tab === "watchlist" && <WatchlistTab watchlist={watchlist} setWatchlist={setWatchlist} isAdmin={isAdmin} userId={session?.user?.id} />}
          </>
        )}
      </div>

      <LoginModal open={loginModal} onClose={() => setLoginModal(false)} />
      <ResetPasswordModal open={resetModal} onDone={() => setResetModal(false)} />
    </div>
    </MobileCtx.Provider>
  );
}
