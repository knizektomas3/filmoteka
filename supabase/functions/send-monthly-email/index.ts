import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RECIPIENT_EMAIL = Deno.env.get("RECIPIENT_EMAIL")!;

const MESICE = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];

function hvezdicky(h: number | null) {
  if (!h) return "";
  return "★".repeat(h) + "☆".repeat(10 - h);
}

const APP_URL = Deno.env.get("APP_URL") ?? "https://filmoteka-kojout.vercel.app";

type Film = {
  id: string;
  nazev: string;
  rok?: string;
  zanry?: string[];
  platforma?: string;
  hodnoceni?: number | null;
  doporuceni?: boolean;
};

function filmCard(f: Film, highlight = false) {
  const zanry = Array.isArray(f.zanry) ? f.zanry.join(", ") : "";
  const meta = [f.rok, zanry].filter(Boolean).join(" · ");
  const bgCard = highlight ? "#fffbe6" : "#faf6ef";
  const border = highlight ? "3px solid #c9a227" : "3px solid #e0d8c8";
  const nameColor = highlight ? "#7a5c10" : "#120d04";
  const filmUrl = `${APP_URL}/?film=${f.id}`;
  return `
    <tr><td style="padding:6px 0">
      <div style="background:${bgCard};border-left:${border};border-radius:6px;padding:12px 16px">
        <div style="font-weight:700;font-size:16px;color:${nameColor}">
          ${highlight ? "⭐ " : ""}<a href="${filmUrl}" style="color:${nameColor};text-decoration:none" target="_blank">${f.nazev}</a>
        </div>
        ${meta ? `<div style="font-size:13px;color:#7a6a55;margin-top:3px">${meta}</div>` : ""}
        ${f.platforma ? `<div style="font-size:12px;color:#9a8a75;margin-top:2px">${f.platforma}</div>` : ""}
        ${f.hodnoceni ? `<div style="font-size:14px;color:#c9a227;margin-top:4px;letter-spacing:2px">${hvezdicky(f.hodnoceni)} <span style="color:#9a8a75;font-size:12px">${f.hodnoceni}/10</span></div>` : ""}
      </div>
    </td></tr>`;
}

function section(filmy: Film[], nadpis: string, highlight: boolean) {
  if (!filmy.length) return "";
  const rows = filmy.map((f) => filmCard(f, highlight)).join("");
  return `
    <tr><td style="padding-top:28px;padding-bottom:8px">
      <div style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a6a55;border-bottom:2px solid #e0d8c8;padding-bottom:8px">${nadpis}</div>
    </td></tr>
    ${rows}`;
}

function plural(n: number) {
  if (n === 1) return "film";
  if (n < 5) return "filmy";
  return "filmů";
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data: vsechnyFilmy, error } = await supabase
    .from("filmy")
    .select("*")
    .gte("datum", startDate)
    .lte("datum", endDate)
    .order("hodnoceni", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!vsechnyFilmy || vsechnyFilmy.length === 0) {
    return new Response(JSON.stringify({ message: "Žádné filmy za minulý měsíc." }), { status: 200 });
  }

  const doporucene = vsechnyFilmy.filter((f) => f.doporuceni);
  const ostatni = vsechnyFilmy.filter((f) => !f.doporuceni);
  const mesicNazev = `${MESICE[month - 1]} ${year}`;

  const bodyRows =
    section(doporucene, `⭐ Doporučuji (${doporucene.length})`, true) +
    section(ostatni, `Ostatní zhlédnuté (${ostatni.length})`, false);

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Filmotéka — ${mesicNazev}</title>
</head>
<body style="margin:0;padding:0;background:#eee8dc;font-family:Georgia,serif;color:#120d04">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eee8dc">
    <tr><td align="center" style="padding:24px 12px">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">

        <!-- Header -->
        <tr><td style="background:#120d04;padding:28px 28px 24px">
          <div style="font-size:26px;font-weight:700;color:#c9a227;letter-spacing:1px">Filmotéka</div>
          <div style="font-size:14px;color:#a09080;margin-top:6px">Přehled za ${mesicNazev}</div>
        </td></tr>

        <!-- Perex -->
        <tr><td style="padding:24px 28px 0">
          <p style="margin:0;font-size:16px;line-height:1.6">
            Za ${mesicNazev} jsem zhlédl <strong>${vsechnyFilmy.length} ${plural(vsechnyFilmy.length)}</strong>${doporucene.length > 0 ? `, z toho <strong style="color:#7a5c10">${doporucene.length} doporučuji</strong>` : ""}.
          </p>
        </td></tr>

        <!-- Film lists -->
        <tr><td style="padding:8px 28px 28px">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${bodyRows}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f0ebe0;padding:16px 28px;font-size:12px;color:#9a8a75;text-align:center">
          Filmotéka · automaticky odesláno 1. ${MESICE[month % 12]} ${now.getFullYear()}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textDoporucene = doporucene.length > 0
    ? `\nDOPORUČUJI:\n` + doporucene.map((f) => `  ⭐ ${f.nazev} (${f.rok || "?"})${f.hodnoceni ? " — " + f.hodnoceni + "/10" : ""}`).join("\n")
    : "";
  const textOstatni = ostatni.length > 0
    ? `\n\nOSTATNÍ:\n` + ostatni.map((f) => `  • ${f.nazev} (${f.rok || "?"})${f.hodnoceni ? " — " + f.hodnoceni + "/10" : ""}`).join("\n")
    : "";
  const text = `Filmotéka — přehled za ${mesicNazev}\n\nCelkem: ${vsechnyFilmy.length} filmů${textDoporucene}${textOstatni}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Filmotéka <onboarding@resend.dev>",
      to: [RECIPIENT_EMAIL],
      subject: `Filmotéka — přehled za ${mesicNazev}`,
      html,
      text,
    }),
  });

  const resBody = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: resBody }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ ok: true, total: vsechnyFilmy.length, doporucene: doporucene.length, id: resBody.id }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
