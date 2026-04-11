const fs = require('fs');
const path = require('path');

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(';');
  return lines.slice(1).map(line => {
    const cols = line.split(';');
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (cols[i] || '').trim());
    return obj;
  });
}

const filmy = parseCsv(path.join(__dirname, 'csv', 'Filmy.csv'));
const serialy = parseCsv(path.join(__dirname, 'csv', 'Seriály.csv'));

// Normalize platform names
function normPlatform(p) {
  return p.replace('Disney +', 'Disney+').replace('HBO Go', 'HBO Max').trim();
}

// Generate film objects (names as strings, IDs resolved in browser)
const filmyData = filmy.filter(r => r['Název']).map(r => ({
  _id: uid(),
  datum: r['Datum'] || '',
  nazev: r['Název'],
  zanry: r['Žánr'] ? r['Žánr'].split(',').map(z => z.trim()).filter(Boolean) : [],
  rok: r['Rok'] || '',
  platforma: normPlatform(r['Platforma'] || ''),
  stopaz: r['Stopáž'] || '',
  _reziseriNames: r['Režisér (Jméno List)'] ? r['Režisér (Jméno List)'].split('|').map(n => n.trim()).filter(Boolean) : [],
  _herciNames: r['Herci (Jméno List)'] ? r['Herci (Jméno List)'].split('|').map(n => n.trim()).filter(Boolean) : [],
  hodnoceni: r['Hodnocení'] ? parseInt(r['Hodnocení']) : null,
  rewatch: r['Rewatch'] === 'True',
  ceskyFilm: r['Český film'] === 'True',
  doporuceni: r['Doporučení'] === 'True',
}));

const serialyData = serialy.filter(r => r['Název']).map(r => ({
  _id: uid(),
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
  _herciNames: r['Herci (Jméno List)'] ? r['Herci (Jméno List)'].split('|').map(n => n.trim()).filter(Boolean) : [],
}));

// Browser console script
const script = `
(function() {
  const herci = JSON.parse(localStorage.getItem('wl_herci') || '[]');
  const reziseri = JSON.parse(localStorage.getItem('wl_reziseri') || '[]');

  const hMap = {};
  herci.forEach(h => { hMap[h.jmeno.trim()] = h.id; });
  const rMap = {};
  reziseri.forEach(r => { rMap[r.jmeno.trim()] = r.id; });

  function resolveNames(names, map) {
    return names.map(n => map[n]).filter(Boolean);
  }

  const filmyRaw = ${JSON.stringify(filmyData)};
  const serialyRaw = ${JSON.stringify(serialyData)};

  const filmy = filmyRaw.map(f => ({
    id: f._id,
    datum: f.datum,
    nazev: f.nazev,
    zanry: f.zanry,
    rok: f.rok,
    platforma: f.platforma,
    stopaz: f.stopaz,
    reziserIds: resolveNames(f._reziseriNames, rMap),
    herciIds: resolveNames(f._herciNames, hMap),
    hodnoceni: f.hodnoceni,
    rewatch: f.rewatch,
    ceskyFilm: f.ceskyFilm,
    doporuceni: f.doporuceni,
  }));

  const serialy = serialyRaw.map(s => ({
    id: s._id,
    nazev: s.nazev,
    zanry: s.zanry,
    rok: s.rok,
    platforma: s.platforma,
    serie: s.serie,
    pocetDilu: s.pocetDilu,
    stav: s.stav,
    zacatekSledovani: s.zacatekSledovani,
    konecSledovani: s.konecSledovani,
    hodnoceni: s.hodnoceni,
    herciIds: resolveNames(s._herciNames, hMap),
  }));

  localStorage.setItem('wl_filmy', JSON.stringify(filmy));
  localStorage.setItem('wl_serialy', JSON.stringify(serialy));

  // Report unmatched names
  const unmatchedH = new Set();
  const unmatchedR = new Set();
  filmyRaw.forEach(f => {
    f._herciNames.forEach(n => { if (!hMap[n]) unmatchedH.add(n); });
    f._reziseriNames.forEach(n => { if (!rMap[n]) unmatchedR.add(n); });
  });
  serialyRaw.forEach(s => {
    s._herciNames.forEach(n => { if (!hMap[n]) unmatchedH.add(n); });
  });

  console.log('✅ Import hotov: ' + filmy.length + ' filmů, ' + serialy.length + ' seriálů');
  if (unmatchedR.size) console.warn('⚠️ Nenalezení režiséři (' + unmatchedR.size + '):', [...unmatchedR].join(', '));
  if (unmatchedH.size) console.warn('⚠️ Nenalezení herci (' + unmatchedH.size + '):', [...unmatchedH].join(', '));
})();
`;

fs.writeFileSync(path.join(__dirname, 'import_filmy_konzole.txt'), script.trim(), 'utf8');
console.log(`Připraveno: ${filmyData.length} filmů, ${serialyData.length} seriálů`);
console.log('Skript je v souboru import_filmy_konzole.txt');
