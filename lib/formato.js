// Formatação e datas (usado no navegador e no servidor). Horário sempre de Manaus.

const TZ = "America/Manaus";

export function agoraManaus() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return {
    iso: `${p.year}-${p.month}-${p.day}`,
    br: `${p.day}/${p.month}/${p.year}`,
    brHora: `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`,
  };
}

// "2026-10-02" | "02/10/2026" | "02/10/2026 14:00:00" -> "02/10/2026"
export function dataBR(s) {
  s = String(s ?? "").trim();
  if (!s || s === "nan" || s === "None") return "";
  if (s.length >= 10 && s[2] === "/" && s[5] === "/") return s.slice(0, 10);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  return s.slice(0, 10);
}

// qualquer data -> "2026-10-02" (para comparar/ordenar)
export function dataISO(s) {
  const b = dataBR(s);
  if (b.length === 10 && b[2] === "/") return `${b.slice(6, 10)}-${b.slice(3, 5)}-${b.slice(0, 2)}`;
  return b;
}

export function moeda(v) {
  const n = Number(v) || 0;
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function num(v, casas = 0) {
  return (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
export const kg = (v, casas = 0) => `${num(v, casas)} kg`;

// número vindo da planilha (aceita "1234.56", "1.234,56", "R$ 1.234,56")
export function lerNumero(v) {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/R\$/g, "").replace(/\s/g, "");
  if (!s) return 0;
  const c = s.lastIndexOf(","), p = s.lastIndexOf(".");
  if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (c >= 0) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export const vazio = (v) => v === null || v === undefined || ["", "nan", "None", "NaT"].includes(String(v).trim());
export const txt = (v) => (vazio(v) ? "" : String(v).trim());
