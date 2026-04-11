import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ─── KONSTANTY ────────────────────────────────────────────────────────────────
const ZANRY = [
  "Akční","Animovaný","Biografie","Dobrodružný","Dokument","Drama",
  "Fantasy","Historický","Horor","Komedie","Krimi","Krátkometrážní",
  "Muzikál","Mysteriózní","Romantický","Rodinný","Sci-Fi","Sport",
  "Stand-up","Thriller","Válečný","Western",
];
const PLATFORMY = [
  "Netflix","HBO Max","SkyShowtime","Disney+","Prime Video",
  "Kino","Kino - IMAX","KVIFF TV","Oneplay","Apple TV+",
  "MUBI","Letní kino","Canal+",
];
const STAV_SERIALU = ["Sleduji","Dokoukáno","Nedokončeno","Plánuji"];
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

// ─── TÉMA ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0b0b0d",
  surface: "#131316",
  elevated: "#1a1a1e",
  border: "#22222a",
  borderHover: "#33333c",
  gold: "#c9a227",
  goldBg: "#c9a22718",
  text: "#e4ddd0",
  muted: "#6a6560",
  dimmer: "#3a3730",
  danger: "#b03a2e",
  blue: "#2980b9",
  purple: "#8e44ad",
  green: "#27ae60",
  orange: "#e67e22",
};

const inp = {
  background: T.elevated,
  border: `1px solid ${T.border}`,
  color: T.text,
  borderRadius: 4,
  padding: "7px 10px",
  fontSize: 13,
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const btnPrimary = {
  padding: "7px 18px", borderRadius: 4, border: "none", cursor: "pointer",
  fontSize: 12, fontWeight: 700, background: T.gold, color: "#0b0b0d",
  letterSpacing: "0.05em", textTransform: "uppercase",
};
const btnSecondary = {
  padding: "6px 12px", borderRadius: 4, cursor: "pointer",
  fontSize: 11, fontWeight: 500, background: "transparent",
  border: `1px solid ${T.border}`, color: T.muted,
};
const btnDanger = { ...btnSecondary, color: T.danger + "bb", borderColor: T.danger + "44" };

// ─── PRIMITIVA ────────────────────────────────────────────────────────────────
function Modal({ open, title, onClose, onSave, children, wide }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 8, width: wide ? 740 : 520,
        maxWidth: "100%", maxHeight: "92vh",
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
  id: uid(), datum: today(), nazev: "", zanry: [], rok: "", platforma: "",
  stopaz: "", reziserId: null, herciIds: [],
  hodnoceni: null, rewatch: false, ceskyFilm: false, doporuceni: false, imdbId: "",
});
const emptySerial = () => ({
  id: uid(), nazev: "", zanry: [], rok: "", platforma: "",
  serie: "", pocetDilu: "", stav: "Sleduji",
  zacatekSledovani: today(), konecSledovani: "",
  hodnoceni: null, herciIds: [], imdbId: "",
});
const emptyOsoba = () => ({
  id: uid(), jmeno: "", narodnost: "", rokNarozeni: "", zijici: "Ano",
  oblibeny: false, neoblibeny: false,
});

function FilmForm({ data, setData, herci, reziseri }) {
  const u = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
      <div style={{ gridColumn: "1/-1" }}>
        <TextInput label="Název *" value={data.nazev} onChange={v => u("nazev", v)} />
      </div>
      <TextInput label="Datum zhlédnutí" value={data.datum} onChange={v => u("datum", v)} type="date" />
      <TextInput label="Rok vydání" value={data.rok} onChange={v => u("rok", v)} type="number" placeholder="2024" />
      <SelectInput label="Platforma" value={data.platforma} onChange={v => u("platforma", v)} options={PLATFORMY} />
      <TextInput label="Stopáž (min)" value={data.stopaz} onChange={v => u("stopaz", v)} type="number" placeholder="120" />
      <div style={{ gridColumn: "1/-1" }}>
        <GenreSelector value={data.zanry} onChange={v => u("zanry", v)} />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <PersonSearch label="Režisér" persons={reziseri} selected={data.reziserId} onChange={v => u("reziserId", v)} />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <PersonSearch label="Herci" persons={herci} selected={data.herciIds} onChange={v => u("herciIds", v)} multi />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <RatingInput value={data.hodnoceni} onChange={v => u("hodnoceni", v)} />
      </div>
      <TextInput label="IMDB ID" value={data.imdbId} onChange={v => u("imdbId", v)} placeholder="tt1234567" />
      <Field label="Příznaky">
        <CheckInput label="Rewatch" checked={data.rewatch} onChange={v => u("rewatch", v)} />
        <CheckInput label="Český film" checked={data.ceskyFilm} onChange={v => u("ceskyFilm", v)} />
        <CheckInput label="Doporučení od přítele" checked={data.doporuceni} onChange={v => u("doporuceni", v)} />
      </Field>
    </div>
  );
}

function SerialForm({ data, setData, herci }) {
  const u = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
      <div style={{ gridColumn: "1/-1" }}>
        <TextInput label="Název *" value={data.nazev} onChange={v => u("nazev", v)} />
      </div>
      <TextInput label="Rok vydání" value={data.rok} onChange={v => u("rok", v)} type="number" placeholder="2024" />
      <SelectInput label="Platforma" value={data.platforma} onChange={v => u("platforma", v)} options={PLATFORMY} />
      <TextInput label="Začátek sledování" value={data.zacatekSledovani} onChange={v => u("zacatekSledovani", v)} type="date" />
      <TextInput label="Konec sledování" value={data.konecSledovani} onChange={v => u("konecSledovani", v)} type="date" />
      <TextInput label="Série (např. První, Druhá)" value={data.serie} onChange={v => u("serie", v)} placeholder="První" />
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
      <TextInput label="IMDB ID" value={data.imdbId} onChange={v => u("imdbId", v)} placeholder="tt1234567" />
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

function ImdbLink({ imdbId }) {
  if (!imdbId) return null;
  return (
    <a href={`https://www.imdb.com/title/${imdbId}/`} target="_blank" rel="noopener noreferrer"
      style={{
        padding: "2px 7px", borderRadius: 3, fontSize: 10, fontWeight: 800,
        background: "#f5c51822", color: "#f5c518", border: "1px solid #f5c51844",
        textDecoration: "none", letterSpacing: "0.05em",
      }}>IMDB ↗</a>
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
const cardStyle = {
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 6, padding: "13px 16px", marginBottom: 8,
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  transition: "border-color 0.15s",
};

function FilmCard({ film, herci, reziseri, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const reziser = reziseri.find(r => r.id === film.reziserId);
  const filmHerci = herci.filter(h => (film.herciIds ?? []).includes(h.id));
  return (
    <div style={{ ...cardStyle, borderColor: hover ? T.borderHover : T.border }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{film.nazev}</span>
          {film.rok && <span style={{ color: T.muted, fontSize: 12 }}>{film.rok}</span>}
          {film.platforma && <Badge color={T.goldBg ? T.gold : T.muted}>{film.platforma}</Badge>}
          {film.ceskyFilm && <Badge color={T.blue}>CZ</Badge>}
          {film.rewatch && <Badge color={T.purple}>↺ Rewatch</Badge>}
          {film.doporuceni && <Badge color={T.green}>Doporučení</Badge>}
          <ImdbLink imdbId={film.imdbId} />
        </div>
        {(film.zanry ?? []).length > 0 && <div style={{ marginBottom: 6 }}><TagList items={film.zanry} /></div>}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {reziser && <span style={{ fontSize: 12, color: T.muted }}>🎬 {reziser.jmeno}</span>}
          {filmHerci.length > 0 && <span style={{ fontSize: 12, color: T.muted }}>👤 {filmHerci.map(h => h.jmeno).join(", ")}</span>}
          {film.stopaz && <span style={{ fontSize: 12, color: T.muted }}>{film.stopaz} min</span>}
          {film.datum && <span style={{ fontSize: 12, color: T.muted }}>{film.datum}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 14, flexShrink: 0 }}>
        <Rating value={film.hodnoceni} />
        <button onClick={() => onEdit(film)} style={btnSecondary}>Upravit</button>
        <button onClick={() => onDelete(film.id)} style={btnDanger}>✕</button>
      </div>
    </div>
  );
}

function SerialCard({ serial, herci, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const stavColor = { Dokoukáno: T.green, Sleduji: T.gold, Nedokončeno: T.orange, Plánuji: "#95a5a6" };
  const serialHerci = herci.filter(h => (serial.herciIds ?? []).includes(h.id));
  return (
    <div style={{ ...cardStyle, borderColor: hover ? T.borderHover : T.border }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{serial.nazev}</span>
          {serial.rok && <span style={{ color: T.muted, fontSize: 12 }}>{serial.rok}</span>}
          {serial.platforma && <Badge color={T.gold}>{serial.platforma}</Badge>}
          {serial.stav && <Badge color={stavColor[serial.stav] ?? T.muted}>{serial.stav}</Badge>}
          <ImdbLink imdbId={serial.imdbId} />
        </div>
        {(serial.zanry ?? []).length > 0 && <div style={{ marginBottom: 6 }}><TagList items={serial.zanry} /></div>}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {serialHerci.length > 0 && <span style={{ fontSize: 12, color: T.muted }}>👤 {serialHerci.map(h => h.jmeno).join(", ")}</span>}
          {serial.serie && <span style={{ fontSize: 12, color: T.muted }}>Série: {serial.serie}</span>}
          {serial.pocetDilu && <span style={{ fontSize: 12, color: T.muted }}>{serial.pocetDilu} dílů</span>}
          {serial.zacatekSledovani && <span style={{ fontSize: 12, color: T.muted }}>Zahájeno: {serial.zacatekSledovani}</span>}
          {serial.konecSledovani && <span style={{ fontSize: 12, color: T.muted }}>Dosledováno: {serial.konecSledovani}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 14, flexShrink: 0 }}>
        <Rating value={serial.hodnoceni} />
        <button onClick={() => onEdit(serial)} style={btnSecondary}>Upravit</button>
        <button onClick={() => onDelete(serial.id)} style={btnDanger}>✕</button>
      </div>
    </div>
  );
}

function OsobaCard({ osoba, onEdit, onDelete, filmCount }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ ...cardStyle, borderColor: hover ? T.borderHover : T.border, alignItems: "center" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: "Cormorant Garamond, serif" }}>{osoba.jmeno}</span>
        {osoba.narodnost && <span style={{ fontSize: 12, color: T.muted }}>{osoba.narodnost}</span>}
        {osoba.rokNarozeni && <span style={{ fontSize: 12, color: T.muted }}>*{osoba.rokNarozeni}</span>}
        {osoba.zijici === "Ne" && <Badge color={T.muted}>†</Badge>}
        {osoba.oblibeny && <Badge color={T.gold}>★ Oblíbený</Badge>}
        {osoba.neoblibeny && <Badge color={T.danger}>✕ Neoblíbený</Badge>}
        {filmCount != null && filmCount > 0 && <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>{filmCount} {filmCount === 1 ? "záznam" : filmCount < 5 ? "záznamy" : "záznamů"}</span>}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
        <button onClick={() => onEdit(osoba)} style={btnSecondary}>Upravit</button>
        <button onClick={() => onDelete(osoba.id)} style={btnDanger}>✕</button>
      </div>
    </div>
  );
}

// ─── ZÁHLAVÍ ZÁLOŽKY ──────────────────────────────────────────────────────────
function TabHeader({ count, onAdd, q, setQ, addLabel }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Vyhledat..." style={{ ...inp, maxWidth: 260 }} />
      <span style={{ color: T.muted, fontSize: 12, flexShrink: 0 }}>{count} záznamů</span>
      <div style={{ flex: 1 }} />
      <button onClick={onAdd} style={btnPrimary}>+ {addLabel}</button>
    </div>
  );
}

// ─── ZÁLOŽKY ──────────────────────────────────────────────────────────────────
function FilmyTab({ filmy, setFilmy, herci, reziseri }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFilm);

  const filtered = useMemo(() =>
    filmy.filter(f => f.nazev?.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? "")),
    [filmy, q]
  );

  const openAdd = () => { setEditing(null); setForm(emptyFilm()); setModal(true); };
  const openEdit = f => { setEditing(f.id); setForm({ ...f }); setModal(true); };
  const save = () => {
    if (!form.nazev?.trim()) return;
    if (editing) setFilmy(fs => fs.map(f => f.id === editing ? form : f));
    else setFilmy(fs => [form, ...fs]);
    setModal(false);
  };
  const del = id => setFilmy(fs => fs.filter(f => f.id !== id));

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={openAdd} q={q} setQ={setQ} addLabel="Přidat film" />
      {filtered.map(f => <FilmCard key={f.id} film={f} herci={herci} reziseri={reziseri} onEdit={openEdit} onDelete={del} />)}
      {filtered.length === 0 && <Empty />}
      <Modal open={modal} title={editing ? "Upravit film" : "Přidat film"} onClose={() => setModal(false)} onSave={save} wide>
        <FilmForm data={form} setData={setForm} herci={herci} reziseri={reziseri} />
      </Modal>
    </div>
  );
}

function SerialyTab({ serialy, setSerialy, herci }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySerial);

  const filtered = useMemo(() =>
    serialy.filter(s => s.nazev?.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const da = b.konecSledovani || b.zacatekSledovani || "";
        const db = a.konecSledovani || a.zacatekSledovani || "";
        return da.localeCompare(db);
      }),
    [serialy, q]
  );

  const openAdd = () => { setEditing(null); setForm(emptySerial()); setModal(true); };
  const openEdit = s => { setEditing(s.id); setForm({ ...s }); setModal(true); };
  const save = () => {
    if (!form.nazev?.trim()) return;
    if (editing) setSerialy(ss => ss.map(s => s.id === editing ? form : s));
    else setSerialy(ss => [form, ...ss]);
    setModal(false);
  };
  const del = id => setSerialy(ss => ss.filter(s => s.id !== id));

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={openAdd} q={q} setQ={setQ} addLabel="Přidat seriál" />
      {filtered.map(s => <SerialCard key={s.id} serial={s} herci={herci} onEdit={openEdit} onDelete={del} />)}
      {filtered.length === 0 && <Empty />}
      <Modal open={modal} title={editing ? "Upravit seriál" : "Přidat seriál"} onClose={() => setModal(false)} onSave={save} wide>
        <SerialForm data={form} setData={setForm} herci={herci} />
      </Modal>
    </div>
  );
}

function HerciTab({ herci, setHerci, filmy, serialy }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOsoba);

  const countMap = useMemo(() => {
    const m = {};
    filmy.forEach(f => (f.herciIds ?? []).forEach(id => { m[id] = (m[id] ?? 0) + 1; }));
    serialy.forEach(s => (s.herciIds ?? []).forEach(id => { m[id] = (m[id] ?? 0) + 1; }));
    return m;
  }, [filmy, serialy]);

  const filtered = useMemo(() =>
    herci.filter(h => h.jmeno?.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.jmeno.localeCompare(b.jmeno, "cs")),
    [herci, q]
  );

  const openAdd = () => { setEditing(null); setForm(emptyOsoba()); setModal(true); };
  const openEdit = h => { setEditing(h.id); setForm({ ...h }); setModal(true); };
  const save = () => {
    if (!form.jmeno?.trim()) return;
    if (editing) setHerci(hs => hs.map(h => h.id === editing ? form : h));
    else setHerci(hs => [...hs, form]);
    setModal(false);
  };
  const del = id => setHerci(hs => hs.filter(h => h.id !== id));

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={openAdd} q={q} setQ={setQ} addLabel="Přidat herce" />
      {filtered.map(h => <OsobaCard key={h.id} osoba={h} onEdit={openEdit} onDelete={del} filmCount={countMap[h.id] ?? 0} />)}
      {filtered.length === 0 && <Empty />}
      <Modal open={modal} title={editing ? "Upravit herce" : "Přidat herce"} onClose={() => setModal(false)} onSave={save}>
        <OsobaForm data={form} setData={setForm} showNeoblibeny />
      </Modal>
    </div>
  );
}

function ReziseriTab({ reziseri, setReziseri, filmy }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOsoba);

  const countMap = useMemo(() => {
    const m = {};
    filmy.forEach(f => { if (f.reziserId) m[f.reziserId] = (m[f.reziserId] ?? 0) + 1; });
    return m;
  }, [filmy]);

  const filtered = useMemo(() =>
    reziseri.filter(r => r.jmeno?.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.jmeno.localeCompare(b.jmeno, "cs")),
    [reziseri, q]
  );

  const openAdd = () => { setEditing(null); setForm(emptyOsoba()); setModal(true); };
  const openEdit = r => { setEditing(r.id); setForm({ ...r }); setModal(true); };
  const save = () => {
    if (!form.jmeno?.trim()) return;
    if (editing) setReziseri(rs => rs.map(r => r.id === editing ? form : r));
    else setReziseri(rs => [...rs, form]);
    setModal(false);
  };
  const del = id => setReziseri(rs => rs.filter(r => r.id !== id));

  return (
    <div>
      <TabHeader count={filtered.length} onAdd={openAdd} q={q} setQ={setQ} addLabel="Přidat režiséra" />
      {filtered.map(r => <OsobaCard key={r.id} osoba={r} onEdit={openEdit} onDelete={del} filmCount={countMap[r.id] ?? 0} />)}
      {filtered.length === 0 && <Empty />}
      <Modal open={modal} title={editing ? "Upravit režiséra" : "Přidat režiséra"} onClose={() => setModal(false)} onSave={save}>
        <OsobaForm data={form} setData={setForm} />
      </Modal>
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: "center", color: T.muted, padding: "48px 0", fontSize: 13 }}>Žádné výsledky</div>;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "filmy", label: "Filmy" },
  { id: "serialy", label: "Seriály" },
  { id: "herci", label: "Herci" },
  { id: "reziseri", label: "Režiséři" },
];

export default function App() {
  const [filmy, setFilmy] = useLS("wl_filmy", []);
  const [serialy, setSerialy] = useLS("wl_serialy", []);
  const [herci, setHerci] = useLS("wl_herci", []);
  const [reziseri, setReziseri] = useLS("wl_reziseri", []);
  const [tab, setTab] = useState("filmy");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap";
    document.head.appendChild(link);
    document.body.style.margin = "0";
    document.body.style.background = T.bg;
  }, []);

  const counts = { filmy: filmy.length, serialy: serialy.length, herci: herci.length, reziseri: reziseri.length };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "DM Sans, sans-serif", fontSize: 13 }}>
      {/* Navigace */}
      <div style={{
        borderBottom: `1px solid ${T.border}`, background: T.surface,
        padding: "0 32px", display: "flex", alignItems: "stretch",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          fontFamily: "Cormorant Garamond, serif", fontSize: 19, fontWeight: 700,
          color: T.gold, letterSpacing: "0.12em", display: "flex", alignItems: "center",
          paddingRight: 28, marginRight: 8, borderRight: `1px solid ${T.border}`,
        }}>
          FILMOTÉKA
        </div>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "0 18px",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            color: tab === t.id ? T.gold : T.muted,
            borderBottom: tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent",
            textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6,
            height: 52,
          }}>
            {t.label}
            <span style={{
              fontSize: 10, background: tab === t.id ? T.goldBg : T.elevated,
              color: tab === t.id ? T.gold : T.muted,
              padding: "1px 5px", borderRadius: 10,
            }}>{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {/* Obsah */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px" }}>
        {tab === "filmy" && <FilmyTab filmy={filmy} setFilmy={setFilmy} herci={herci} reziseri={reziseri} />}
        {tab === "serialy" && <SerialyTab serialy={serialy} setSerialy={setSerialy} herci={herci} />}
        {tab === "herci" && <HerciTab herci={herci} setHerci={setHerci} filmy={filmy} serialy={serialy} />}
        {tab === "reziseri" && <ReziseriTab reziseri={reziseri} setReziseri={setReziseri} filmy={filmy} />}
      </div>
    </div>
  );
}
