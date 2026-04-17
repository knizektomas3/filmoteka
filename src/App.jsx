import { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext } from "react";
import { supabase } from "./lib/supabase";

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

// ─── TÉMA ─────────────────────────────────────────────────────────────────────
const TDark = {
  bg: "#0b0b0d", surface: "#131316", elevated: "#1a1a1e",
  border: "#22222a", borderHover: "#33333c",
  gold: "#c9a227", goldBg: "#c9a22718",
  text: "#e4ddd0", muted: "#6a6560", dimmer: "#3a3730",
  danger: "#b03a2e", blue: "#2980b9", purple: "#8e44ad", green: "#27ae60", orange: "#e67e22",
};
const TLight = {
  bg: "#eee8dc", surface: "#faf6ef", elevated: "#e0d8c8",
  border: "#bfb49f", borderHover: "#a89880",
  gold: "#7a5c10", goldBg: "#7a5c1020",
  text: "#120d04", muted: "#5a4a35", dimmer: "#8a7a65",
  danger: "#921f1f", blue: "#0f5280", purple: "#581e78", green: "#145e2a", orange: "#954a00",
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
  Object.assign(inp, { background: T.elevated, border: `1px solid ${T.border}`, color: T.text });
  Object.assign(btnPrimary, { background: T.gold, color: dark ? "#0b0b0d" : "#fff8f0" });
  Object.assign(btnSecondary, { border: `1px solid ${T.border}`, color: T.muted });
  Object.assign(btnDanger, { ...btnSecondary, color: T.danger + "bb", borderColor: T.danger + "44" });
  Object.assign(cardStyle, { background: T.surface, border: `1px solid ${T.border}` });
  document.body.style.background = T.bg;
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
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif", letterSpacing: "0.04em" }}>{title}</span>
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
    <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "Cormorant Garamond, serif" }}>
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

function FilmCard({ film, herci, reziseri, onEdit, onDelete, isAdmin }) {
  const isMobile = useMobile();
  const [hover, setHover] = useState(false);
  const filmReziseri = reziseri.filter(r => (film.reziserIds ?? []).includes(r.id));
  const filmHerci = herci.filter(h => (film.herciIds ?? []).includes(h.id));
  const ratingBorder = film.hodnoceni >= 9 ? "#27ae60" : film.hodnoceni <= 4 && film.hodnoceni > 0 ? "#c0392b" : null;
  return (
    <div style={{ ...cardStyle, borderColor: ratingBorder ?? (hover ? T.borderHover : T.border), ...(ratingBorder ? { background: ratingBorder === "#27ae60" ? "rgba(39,174,96,0.13)" : "rgba(192,57,43,0.13)" } : {}) }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {film.datum && (
        <div style={{ flexShrink: 0, marginRight: 14, textAlign: "center", minWidth: 44 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.gold, lineHeight: 1, fontFamily: "Cormorant Garamond, serif" }}>{fmtDate(film.datum).slice(0, 5)}</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{fmtDate(film.datum).slice(6)}</div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 6 }}>
          <a href={`https://www.imdb.com/find/?q=${encodeURIComponent(film.nazev)}${film.rok ? `+${film.rok}` : ''}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif", textDecoration: "none" }} onMouseEnter={e => e.target.style.color=T.gold} onMouseLeave={e => e.target.style.color=T.text}>{film.nazev}</a>
          {film.ceskyNazev && <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>({film.ceskyNazev})</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: film.ceskyNazev || isMobile ? 4 : 0 }}>
            {film.rok && <span style={{ color: T.muted, fontSize: 12 }}>{film.rok}</span>}
            {film.platforma && <Badge color={T.goldBg ? T.gold : T.muted}>{film.platforma}</Badge>}
            {film.ceskyFilm && <Badge color={T.blue}>CZ</Badge>}
            {film.rewatch && <Badge color={T.purple}>↺ Rewatch</Badge>}
            {film.doporuceni && <Badge color={T.green}>Doporučil bych</Badge>}
          </div>
        </div>
        {(film.zanry ?? []).length > 0 && <div style={{ marginBottom: 6 }}><TagList items={film.zanry} /></div>}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {film.stopaz && <span style={{ fontSize: 12, color: T.muted }}>{film.stopaz} min</span>}
          {filmReziseri.length > 0 && <span style={{ fontSize: 12, color: T.muted }}>🎬 {filmReziseri.map(r => r.jmeno).join(", ")}</span>}
          {filmHerci.length > 0 && <span style={{ fontSize: 12, color: T.muted }}>👤 {filmHerci.map(h => h.jmeno).join(", ")}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, marginLeft: isMobile ? 8 : 14, flexShrink: 0 }}>
        <Rating value={film.hodnoceni} />
        {isAdmin && <button onClick={() => onEdit(film)} style={btnSecondary}>Upravit</button>}
        {isAdmin && <button onClick={() => onDelete(film.id)} style={btnDanger}>✕</button>}
      </div>
    </div>
  );
}

function SerialCard({ serial, herci, onEdit, onDelete, isAdmin }) {
  const isMobile = useMobile();
  const [hover, setHover] = useState(false);
  const stavColor = { Dokoukáno: T.green, Sleduji: T.gold, Nedokončeno: T.orange, Plánuji: "#95a5a6" };
  const serialHerci = herci.filter(h => (serial.herciIds ?? []).includes(h.id));
  const ratingBorder = serial.hodnoceni >= 9 ? "#27ae60" : serial.hodnoceni <= 4 && serial.hodnoceni > 0 ? "#c0392b" : null;
  return (
    <div style={{ ...cardStyle, borderColor: ratingBorder ?? (hover ? T.borderHover : T.border), ...(ratingBorder ? { background: ratingBorder === "#27ae60" ? "rgba(39,174,96,0.13)" : "rgba(192,57,43,0.13)" } : {}) }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {(serial.zacatekSledovani || serial.konecSledovani) && (
        <div style={{ flexShrink: 0, marginRight: 14, textAlign: "center", minWidth: 54 }}>
          {serial.zacatekSledovani && (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.gold, lineHeight: 1, fontFamily: "Cormorant Garamond, serif" }}>{fmtDate(serial.zacatekSledovani).slice(0, 5)}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{fmtDate(serial.zacatekSledovani).slice(6)}</div>
            </>
          )}
          {serial.konecSledovani && (
            <>
              <div style={{ fontSize: 10, color: T.dimmer, margin: "4px 0 2px" }}>—</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.gold, lineHeight: 1, fontFamily: "Cormorant Garamond, serif" }}>{fmtDate(serial.konecSledovani).slice(0, 5)}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{fmtDate(serial.konecSledovani).slice(6)}</div>
            </>
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 6 }}>
          <a href={`https://www.imdb.com/find/?q=${encodeURIComponent(serial.nazev)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif", textDecoration: "none" }} onMouseEnter={e => e.target.style.color=T.gold} onMouseLeave={e => e.target.style.color=T.text}>{serial.nazev}</a>
          {serial.ceskyNazev && <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>({serial.ceskyNazev})</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: serial.ceskyNazev || isMobile ? 4 : 0 }}>
            {serial.rok && <span style={{ color: T.muted, fontSize: 12 }}>{serial.rok}</span>}
            {serial.platforma && <Badge color={T.gold}>{serial.platforma}</Badge>}
            {serial.stav && <Badge color={stavColor[serial.stav] ?? T.muted}>{serial.stav}</Badge>}
          </div>
        </div>
        {(serial.zanry ?? []).length > 0 && <div style={{ marginBottom: 6 }}><TagList items={serial.zanry} /></div>}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {serial.serie && (Array.isArray(serial.serie) ? serial.serie.length > 0 : serial.serie) && <span style={{ fontSize: 12, color: T.muted }}>Série: {Array.isArray(serial.serie) ? serial.serie.join(", ") : serial.serie}</span>}
          {serial.pocetDilu && <span style={{ fontSize: 12, color: T.muted }}>{serial.pocetDilu} dílů</span>}
          {serialHerci.length > 0 && <span style={{ fontSize: 12, color: T.muted }}>👤 {serialHerci.map(h => h.jmeno).join(", ")}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 14, flexShrink: 0 }}>
        <Rating value={serial.hodnoceni} />
        {isAdmin && <button onClick={() => onEdit(serial)} style={btnSecondary}>Upravit</button>}
        {isAdmin && <button onClick={() => onDelete(serial.id)} style={btnDanger}>✕</button>}
      </div>
    </div>
  );
}

function OsobaDetailModal({ osoba, filmy, serialy, onClose, onToggle, showNeoblibeny = false }) {
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
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: isMobile ? "12px 12px 0 0" : 8, width: isMobile ? "100%" : 600, maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{osoba.jmeno}</span>
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
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {total === 0 && <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Žádné záznamy</div>}

          {osobaFilmy.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Filmy ({osobaFilmy.length})</div>
              {osobaFilmy.map(f => (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{f.nazev}</span>
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
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{s.nazev}</span>
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
    </div>
  );
}

function OsobaCard({ osoba, onEdit, onDelete, onDetail, filmCount, isAdmin }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ ...cardStyle, borderColor: hover ? T.borderHover : T.border, alignItems: "center", cursor: "pointer" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onDetail(osoba)}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{osoba.jmeno}</span>
        {osoba.narodnost && <span style={{ fontSize: 12, color: T.muted }}>{osoba.narodnost}</span>}
        {osoba.rokNarozeni && <span style={{ fontSize: 12, color: T.muted }}>*{osoba.rokNarozeni}</span>}
        {osoba.zijici === "Ne" && <Badge color={T.muted}>†</Badge>}
        {osoba.oblibeny && <Badge color={T.gold}>★ Oblíbený</Badge>}
        {osoba.neoblibeny && <Badge color={T.danger}>✕ Neoblíbený</Badge>}
        {filmCount != null && filmCount > 0 && <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>{filmCount} {filmCount === 1 ? "záznam" : filmCount < 5 ? "záznamy" : "záznamů"}</span>}
      </div>
      {isAdmin && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(osoba)} style={btnSecondary}>Upravit</button>
          <button onClick={() => onDelete(osoba.id)} style={btnDanger}>✕</button>
        </div>
      )}
    </div>
  );
}

// ─── FILTRY ───────────────────────────────────────────────────────────────────
const emptyFilmFilters  = () => ({ hodnoceniMin: null, platformy: [], zanry: [], rewatch: null, ceskyFilm: null, doporuceni: null, rokOd: "", rokDo: "" });
const emptySerialFilters = () => ({ hodnoceniMin: null, platformy: [], zanry: [], stav: [], rokOd: "", rokDo: "" });

function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: `1px solid ${active ? T.gold : T.border}`, background: active ? T.gold : "transparent", color: active ? "#0b0b0d" : T.muted, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>
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
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
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
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
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
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Vyhledat..." style={{ ...inp, maxWidth: 240 }} />
      <span style={{ color: T.muted, fontSize: 12, flexShrink: 0 }}>{count} záznamů</span>
      {sortOptions && (
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px", cursor: "pointer" }}>
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <div style={{ flex: 1 }} />
      {onToggleFilters && (
        <button onClick={onToggleFilters} style={{ ...btnSecondary, position: "relative", borderColor: activeFilterCount > 0 ? T.gold : T.border, color: activeFilterCount > 0 ? T.gold : T.muted }}>
          Filtry {activeFilterCount > 0 && <span style={{ marginLeft: 4, background: T.gold, color: "#0b0b0d", borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>{activeFilterCount}</span>}
        </button>
      )}
      {onAdd && <button onClick={onAdd} style={btnPrimary}>+ {addLabel}</button>}
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

function FilmyTab({ filmy, setFilmy, herci, reziseri, isAdmin }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFilm);
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
      await supabase.from("filmy").update(form).eq("id", form.id);
      setFilmy(fs => fs.map(f => f.id === editing ? form : f));
    } else {
      await supabase.from("filmy").insert(form);
      setFilmy(fs => [form, ...fs]);
    }
    setModal(false);
  };
  const del = async id => {
    await supabase.from("filmy").delete().eq("id", id);
    setFilmy(fs => fs.filter(f => f.id !== id));
  };
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={isAdmin ? openAdd : null} q={q} setQ={setQ} addLabel="Přidat film" onToggleFilters={() => setShowFilters(v => !v)} activeFilterCount={activeFilterCount} sortOptions={FILM_SORT_OPTS} sort={sort} setSort={setSort} />
      {showFilters && <FilmyFilters filters={filters} setFilters={setFilters} filmy={filmy} />}
      {activeFilterCount > 0 && <button onClick={() => setFilters(emptyFilmFilters())} style={{ ...btnSecondary, fontSize: 11, marginBottom: 12, color: T.danger, borderColor: T.danger }}>× Zrušit filtry</button>}
      {filtered.map(f => <FilmCard key={f.id} film={f} herci={herci} reziseri={reziseri} onEdit={openEdit} onDelete={del} isAdmin={isAdmin} />)}
      {filtered.length === 0 && <Empty />}
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

function SerialyTab({ serialy, setSerialy, herci, isAdmin }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySerial);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptySerialFilters());
  const [sort, setSort] = useState("datum-desc");
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
      await supabase.from("serialy").update(form).eq("id", form.id);
      setSerialy(ss => ss.map(s => s.id === editing ? form : s));
    } else {
      await supabase.from("serialy").insert(form);
      setSerialy(ss => [form, ...ss]);
    }
    setModal(false);
  };
  const del = async id => {
    await supabase.from("serialy").delete().eq("id", id);
    setSerialy(ss => ss.filter(s => s.id !== id));
  };
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={isAdmin ? openAdd : null} q={q} setQ={setQ} addLabel="Přidat seriál" onToggleFilters={() => setShowFilters(v => !v)} activeFilterCount={activeFilterCount} sortOptions={SERIAL_SORT_OPTS} sort={sort} setSort={setSort} />
      {showFilters && <SerialyFilters filters={filters} setFilters={setFilters} serialy={serialy} />}
      {activeFilterCount > 0 && <button onClick={() => setFilters(emptySerialFilters())} style={{ ...btnSecondary, fontSize: 11, marginBottom: 12, color: T.danger, borderColor: T.danger }}>× Zrušit filtry</button>}
      {filtered.map(s => <SerialCard key={s.id} serial={s} herci={herci} onEdit={openEdit} onDelete={del} isAdmin={isAdmin} />)}
      {filtered.length === 0 && <Empty />}
      <Modal open={modal} title={editing ? "Upravit seriál" : "Přidat seriál"} onClose={() => setModal(false)} onSave={save} wide>
        <SerialForm data={form} setData={setForm} herci={herci} />
      </Modal>
    </div>
  );
}

function HerciTab({ herci, setHerci, filmy, serialy, isAdmin }) {
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
      await supabase.from("herci").update(form).eq("id", form.id);
      setHerci(hs => hs.map(h => h.id === editing ? form : h));
    } else {
      await supabase.from("herci").insert(form);
      setHerci(hs => [...hs, form]);
    }
    setModal(false);
  };
  const del = async id => {
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
      {filtered.map(h => <OsobaCard key={h.id} osoba={h} onEdit={openEdit} onDelete={del} onDetail={setDetail} filmCount={countMap[h.id] ?? 0} isAdmin={isAdmin} />)}
      {filtered.length === 0 && <Empty />}
      <Modal open={modal} title={editing ? "Upravit herce" : "Přidat herce"} onClose={() => setModal(false)} onSave={save}>
        <OsobaForm data={form} setData={setForm} showNeoblibeny />
      </Modal>
      {detail && <OsobaDetailModal osoba={detail} filmy={filmy} serialy={serialy} onClose={() => setDetail(null)} onToggle={handleToggle} showNeoblibeny />}
    </div>
  );
}

function ReziseriTab({ reziseri, setReziseri, filmy, isAdmin }) {
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
      await supabase.from("reziseri").update(form).eq("id", form.id);
      setReziseri(rs => rs.map(r => r.id === editing ? form : r));
    } else {
      await supabase.from("reziseri").insert(form);
      setReziseri(rs => [...rs, form]);
    }
    setModal(false);
  };
  const del = async id => {
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
      {filtered.map(r => <OsobaCard key={r.id} osoba={r} onEdit={openEdit} onDelete={del} onDetail={setDetail} filmCount={countMap[r.id] ?? 0} isAdmin={isAdmin} />)}
      {filtered.length === 0 && <Empty />}
      <Modal open={modal} title={editing ? "Upravit režiséra" : "Přidat režiséra"} onClose={() => setModal(false)} onSave={save}>
        <OsobaForm data={form} setData={setForm} />
      </Modal>
      {detail && <OsobaDetailModal osoba={detail} filmy={filmy} onClose={() => setDetail(null)} onToggle={handleToggle} />}
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: "center", color: T.muted, padding: "48px 0", fontSize: 13 }}>Žádné výsledky</div>;
}

// ─── BILANCE – KOMPONENTY ─────────────────────────────────────────────────────
const MONTHS_CZ = ['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];

function BarChart({ data, color = T.gold, height = 100 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
          {d.value > 0 && <div style={{ fontSize: 9, color: T.muted, marginBottom: 2 }}>{d.value}</div>}
          <div style={{ width: '100%', background: d.value > 0 ? color : T.border, borderRadius: '3px 3px 0 0', height: `${Math.max(d.value / max * height, d.value > 0 ? 3 : 2)}px`, transition: 'height 0.3s' }} />
          <div style={{ fontSize: 9, color: T.muted, marginTop: 4, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function HBarChart({ data, color = T.gold, limit = 20 }) {
  const visible = data.slice(0, limit);
  const max = Math.max(...visible.map(d => d.value), 1);
  return (
    <div>
      {visible.map((d, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: T.text }}>{d.label}</span>
            <span style={{ fontSize: 12, color, fontWeight: 700 }}>{d.value}</span>
          </div>
          <div style={{ height: 5, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${d.value / max * 100}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BilStat({ label, value, sub, color = T.text }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '16px 20px' }}>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: 'Cormorant Garamond, serif', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function BilCard({ title, children }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function BilanceFilmyTab({ filmy }) {
  const isMobile = useMobile();
  const currentYear = new Date().getFullYear();
  const rated = filmy.filter(f => f.hodnoceni);
  const avg = rated.length ? (rated.reduce((a, f) => a + f.hodnoceni, 0) / rated.length).toFixed(1) : '–';
  const thisYear = filmy.filter(f => f.datum?.startsWith(String(currentYear)));

  // Po letech
  const byYear = {};
  filmy.filter(f => f.datum).forEach(f => { const y = f.datum.slice(0,4); byYear[y] = (byYear[y]||0)+1; });
  const byYearData = Object.keys(byYear).sort().map(y => ({ label: "'"+y.slice(2), value: byYear[y] }));

  // Po měsících aktuálního roku
  const monthData = MONTHS_CZ.map(l => ({ label: l, value: 0 }));
  thisYear.forEach(f => { monthData[parseInt(f.datum.slice(5,7))-1].value++; });

  // Platformy
  const byPlat = {};
  filmy.forEach(f => { if (f.platforma) byPlat[f.platforma] = (byPlat[f.platforma]||0)+1; });
  const platData = Object.entries(byPlat).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({label:l,value:v}));

  // Hodnocení
  const ratingData = Array.from({length:10},(_,i)=>({ label:String(i+1), value:0 }));
  rated.forEach(f => { ratingData[f.hodnoceni-1].value++; });

  // Rok výroby – dekády
  const byDec = {};
  filmy.filter(f=>f.rok).forEach(f => { const d = Math.floor(parseInt(f.rok)/10)*10; byDec[d]=(byDec[d]||0)+1; });
  const decData = Object.keys(byDec).sort().map(d=>({ label:`${d}s`, value:byDec[d] }));

  // Žánry aktuálního roku + český film
  const byGenre = {};
  thisYear.forEach(f => {
    (f.zanry??[]).forEach(z => { byGenre[z]=(byGenre[z]||0)+1; });
    if (f.ceskyFilm) byGenre['Český film']=(byGenre['Český film']||0)+1;
  });
  const genreData = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({label:l,value:v}));

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text, fontFamily: 'Cormorant Garamond, serif', marginBottom: 4 }}>Bilance filmů</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>Celkový přehled sledování</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <BilStat label="Filmů celkem" value={filmy.length} />
        <BilStat label="Průměrné hodnocení" value={avg} color={T.gold} sub={`z ${rated.length} hodnocených`} />
        <BilStat label={`Zhlédnuto ${currentYear}`} value={thisYear.length} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <BilCard title="Filmy po letech"><BarChart data={byYearData} color={T.gold} /></BilCard>
        <BilCard title={`Měsíce ${currentYear}`}><BarChart data={monthData} color={T.blue} /></BilCard>
        <BilCard title="Platformy"><HBarChart data={platData} color={T.purple} /></BilCard>
        <BilCard title="Hodnocení"><BarChart data={ratingData} color={T.green} /></BilCard>
        <BilCard title="Rok výroby (dekády)"><BarChart data={decData} color={T.orange} /></BilCard>
        {genreData.length > 0 && <BilCard title={`Žánry ${currentYear}`}><HBarChart data={genreData} color={T.gold} /></BilCard>}
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

  // Po letech
  const byYear = {};
  finished.forEach(s => { const y = s.konecSledovani.slice(0,4); byYear[y]=(byYear[y]||0)+1; });
  const byYearData = Object.keys(byYear).sort().map(y=>({ label:"'"+y.slice(2), value:byYear[y] }));

  // Po měsících aktuálního roku
  const monthData = MONTHS_CZ.map(l=>({ label:l, value:0 }));
  thisYear.forEach(s => { monthData[parseInt(s.konecSledovani.slice(5,7))-1].value++; });

  // Platformy
  const byPlat = {};
  finished.forEach(s => { if (s.platforma) byPlat[s.platforma]=(byPlat[s.platforma]||0)+1; });
  const platData = Object.entries(byPlat).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({label:l,value:v}));

  // Hodnocení
  const ratingData = Array.from({length:10},(_,i)=>({ label:String(i+1), value:0 }));
  rated.forEach(s => { ratingData[s.hodnoceni-1].value++; });

  // Rok výroby – dekády
  const byDec = {};
  finished.filter(s=>s.rok).forEach(s => { const d=Math.floor(parseInt(s.rok)/10)*10; byDec[d]=(byDec[d]||0)+1; });
  const decData = Object.keys(byDec).sort().map(d=>({ label:`${d}s`, value:byDec[d] }));

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text, fontFamily: 'Cormorant Garamond, serif', marginBottom: 4 }}>Bilance seriálů</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>Celkový přehled sledování</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <BilStat label="Dosledováno celkem" value={finished.length} sub={`z ${serialy.length} v databázi`} />
        <BilStat label="Průměrné hodnocení" value={avg} color={T.gold} sub={`z ${rated.length} hodnocených`} />
        <BilStat label={`Zhlédnuto ${currentYear}`} value={thisYear.length} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <BilCard title="Seriály po letech"><BarChart data={byYearData} color={T.gold} /></BilCard>
        <BilCard title={`Měsíce ${currentYear}`}><BarChart data={monthData} color={T.blue} /></BilCard>
        <BilCard title="Platformy"><HBarChart data={platData} color={T.purple} /></BilCard>
        <BilCard title="Hodnocení"><BarChart data={ratingData} color={T.green} /></BilCard>
        <BilCard title="Rok výroby (dekády)"><BarChart data={decData} color={T.orange} /></BilCard>
      </div>
    </div>
  );
}

// ─── WATCHLIST ────────────────────────────────────────────────────────────────
const emptyWatchItem = () => ({ id: uid(), typ: "film", nazev: "", platforma: "", rok: "", zanry: [], poznamka: "" });

function WatchlistTab({ watchlist, setWatchlist, isAdmin }) {
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
      await supabase.from("watchlist").update(form).eq("id", form.id);
      setWatchlist(w => w.map(x => x.id === editing ? form : x));
    } else {
      await supabase.from("watchlist").insert(form);
      setWatchlist(w => [form, ...w]);
    }
    setModal(false);
  };
  const del = async id => {
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
              <div style={{ fontSize: 22, fontWeight: 800, color: T.gold, fontFamily: "Cormorant Garamond, serif", lineHeight: 1 }}>{cnt}</div>
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
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{item.nazev}</span>
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
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "Cormorant Garamond, serif", marginBottom: 20 }}>Nastavit nové heslo</div>
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
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "Cormorant Garamond, serif", marginBottom: 20 }}>Přihlásit se</div>
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
  const [tab, setTab] = useState("filmy");
  const [darkMode, setDarkMode] = useLS("wl_theme_dark", true);

  applyTheme(darkMode);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap";
    document.head.appendChild(link);
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
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "DM Sans, sans-serif", fontSize: 13 }}>
      {/* Navigace */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, position: "sticky", top: 0, zIndex: 100 }}>
        {/* Logo + akce */}
        <div style={{ padding: "0 16px", display: "flex", alignItems: "center", height: isMobile ? 46 : 52, gap: 4 }}>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: isMobile ? 16 : 19, fontWeight: 700, color: T.gold, letterSpacing: "0.12em", flexShrink: 0 }}>
            FILMOTÉKA
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setDarkMode(d => !d)} title={darkMode ? "Světlý režim" : "Tmavý režim"}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 17, padding: "0 6px", display: "flex", alignItems: "center" }}
          >{darkMode ? "☀️" : "🌙"}</button>
          {isAdmin
            ? <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11, padding: "0 8px", display: "flex", alignItems: "center" }}>Odhlásit</button>
            : <button onClick={() => setLoginModal(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11, padding: "0 8px", display: "flex", alignItems: "center" }}>Přihlásit</button>
          }
        </div>
        {/* Taby — scrollovatelné */}
        <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", borderTop: `1px solid ${T.border}`, padding: "0 8px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", flexShrink: 0,
              padding: isMobile ? "0 10px" : "0 14px",
              fontSize: isMobile ? 10 : 11, fontWeight: 600, letterSpacing: "0.06em",
              color: tab === t.id ? T.gold : T.muted,
              borderBottom: tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent",
              textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5,
              height: isMobile ? 38 : 44, whiteSpace: "nowrap",
            }}>
              {t.label}
              {counts[t.id] != null && counts[t.id] > 0 && <span style={{
                fontSize: 9, background: tab === t.id ? T.goldBg : T.elevated,
                color: tab === t.id ? T.gold : T.muted, padding: "1px 5px", borderRadius: 10,
              }}>{counts[t.id]}</span>}
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
            {tab === "filmy" && <FilmyTab filmy={filmy} setFilmy={setFilmy} herci={herci} reziseri={reziseri} isAdmin={isAdmin} />}
            {tab === "serialy" && <SerialyTab serialy={serialy} setSerialy={setSerialy} herci={herci} isAdmin={isAdmin} />}
            {tab === "herci" && <HerciTab herci={herci} setHerci={setHerci} filmy={filmy} serialy={serialy} isAdmin={isAdmin} />}
            {tab === "reziseri" && <ReziseriTab reziseri={reziseri} setReziseri={setReziseri} filmy={filmy} isAdmin={isAdmin} />}
            {tab === "bilance-filmy" && <BilanceFilmyTab filmy={filmy} />}
            {tab === "bilance-serialy" && <BilanceSerialyTab serialy={serialy} />}
            {tab === "watchlist" && <WatchlistTab watchlist={watchlist} setWatchlist={setWatchlist} isAdmin={isAdmin} />}
          </>
        )}
      </div>

      <LoginModal open={loginModal} onClose={() => setLoginModal(false)} />
      <ResetPasswordModal open={resetModal} onDone={() => setResetModal(false)} />
    </div>
    </MobileCtx.Provider>
  );
}
