const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- Zadej své přihlašovací údaje ---
const EMAIL = 'ZDE_TVUJ_EMAIL';
const PASSWORD = 'ZDE_TVOJE_HESLO';
// ------------------------------------

const supabase = createClient(
  'https://lnyycutvsfgerjguidgz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxueXljdXR2c2ZnZXJqZ3VpZGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDQ1MjUsImV4cCI6MjA5MTQ4MDUyNX0.blpeYBCRAijPVE_rTmAYyrxby2OZYGFq68Nf5MC--_w'
);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath).toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(';');
  return lines.slice(1).map(line => {
    const cols = line.split(';');
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (cols[i] || '').trim(); });
    return obj;
  });
}

function normPlatform(p) {
  return p.replace('Disney +', 'Disney+').replace('HBO Go', 'HBO Max').trim();
}

const CSV = p => path.join(__dirname, 'csv', p);

const herciRaw    = parseCsv(CSV('Herci.csv'));
const reziseriRaw = parseCsv(CSV('Režiséři.csv'));
const filmyRaw    = parseCsv(CSV('Filmy.csv'));
const serialyRaw  = parseCsv(CSV('Seriály.csv'));

const herci = herciRaw.filter(r => r['Jméno']).map(r => ({
  id: uid(),
  jmeno: r['Jméno'],
  narodnost: r['Národnost'] || '',
  rokNarozeni: r['Rok narození'] || '',
  zijici: r['Žijící'] === 'Ne' ? 'Ne' : 'Ano',
  oblibeny: r['Oblíbený'] === 'True',
  neoblibeny: r['Neoblíbený'] === 'True',
}));

const reziseri = reziseriRaw.filter(r => r['Jméno']).map(r => ({
  id: uid(),
  jmeno: r['Jméno'],
  narodnost: r['Národnost'] || '',
  rokNarozeni: r['Rok narození'] || '',
  zijici: r['Žijící'] === 'Ne' ? 'Ne' : 'Ano',
  oblibeny: r['Oblíbený'] === 'True',
}));

const hMap = {};
herci.forEach(h => { hMap[h.jmeno.trim()] = h.id; });
const rMap = {};
reziseri.forEach(r => { rMap[r.jmeno.trim()] = r.id; });

const filmy = filmyRaw.filter(r => r['Název']).map(r => ({
  id: uid(),
  datum: r['Datum'] || '',
  nazev: r['Název'],
  zanry: r['Žánr'] ? r['Žánr'].split(',').map(z => z.trim()).filter(Boolean) : [],
  rok: r['Rok'] || '',
  platforma: normPlatform(r['Platforma'] || ''),
  stopaz: r['Stopáž'] || '',
  reziserIds: r['Režisér (Jméno List)'] ? r['Režisér (Jméno List)'].split('|').map(n => n.trim()).filter(Boolean).map(n => rMap[n]).filter(Boolean) : [],
  herciIds: r['Herci (Jméno List)'] ? r['Herci (Jméno List)'].split('|').map(n => n.trim()).filter(Boolean).map(n => hMap[n]).filter(Boolean) : [],
  hodnoceni: r['Hodnocení'] ? parseInt(r['Hodnocení']) : null,
  rewatch: r['Rewatch'] === 'True',
  ceskyFilm: r['Český film'] === 'True',
  doporuceni: r['Doporučení'] === 'True',
}));

const serialy = serialyRaw.filter(r => r['Název']).map(r => ({
  id: uid(),
  nazev: r['Název'],
  zanry: r['Žánr'] ? r['Žánr'].split(',').map(z => z.trim()).filter(Boolean) : [],
  rok: r['Rok'] || '',
  platforma: normPlatform(r['Platforma'] || ''),
  serie: r['Série'] ? r['Série'].split(',').map(s => s.trim()).filter(Boolean) : [],
  pocetDilu: r['Počet dílů'] || '',
  stav: r['Stav'] || 'Dokoukáno',
  zacatekSledovani: r['Začátek sledování'] || '',
  konecSledovani: r['Konec sledování'] || '',
  hodnoceni: r['Hodnocení'] ? parseInt(r['Hodnocení']) : null,
  herciIds: r['Herci (Jméno List)'] ? r['Herci (Jméno List)'].split('|').map(n => n.trim()).filter(Boolean).map(n => hMap[n]).filter(Boolean) : [],
}));

console.log('Připraveno:', herci.length, 'herců,', reziseri.length, 'režisérů,', filmy.length, 'filmů,', serialy.length, 'seriálů\n');

async function upsert(table, items) {
  if (!items.length) { console.log(table + ': prázdné'); return; }
  let ok = 0;
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) { console.error('\n' + table + ' chyba:', error.message); return; }
    ok += chunk.length;
    process.stdout.write('\r' + table + ': ' + ok + '/' + items.length);
  }
  console.log('\r' + table + ': ' + ok + '/' + items.length + ' ✓   ');
}

(async () => {
  const { error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) { console.error('Přihlášení selhalo:', error.message); process.exit(1); }
  console.log('Přihlášen.\n');

  await upsert('herci', herci);
  await upsert('reziseri', reziseri);
  await upsert('filmy', filmy);
  await upsert('serialy', serialy);

  console.log('\nHotovo! Obnov stránku.');
  process.exit(0);
})();
