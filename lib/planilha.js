// Acesso à planilha do Google (a MESMA usada pelo app Streamlit), pelo servidor da Vercel.
// Usa a conta de serviço do Google (a mesma do Streamlit) — sem bibliotecas extras.
import crypto from "crypto";
import { segredos } from "./segredos";

const API = process.env.SHEETS_API_URL || "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";

function credenciais() {
  const { email, chave } = segredos();
  if (!email || !chave) throw new Error("Falta a conta de serviço do Google: cole o Secrets do Streamlit na variável STREAMLIT_SECRETS da Vercel.");
  return { email, chave };
}

export function idPlanilha() {
  const id = segredos().planilha;
  if (!id) throw new Error("Falta o spreadsheet_id: cole o Secrets do Streamlit na variável STREAMLIT_SECRETS da Vercel.");
  return id;
}

// ---------- token de acesso (válido ~1h, guardado enquanto o servidor estiver "quente") ----------
let token = null;
let expira = 0;

const b64url = (s) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function obterToken() {
  if (token && Date.now() < expira - 60000) return token;
  const { email, chave } = credenciais();
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: agora, exp: agora + 3600,
  }));
  const ass = crypto.createSign("RSA-SHA256").update(`${cab}.${corpo}`).sign(chave, "base64")
    .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${cab}.${corpo}.${ass}` }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Google recusou a conta de serviço: " + (j.error_description || j.error || r.status));
  token = j.access_token;
  expira = Date.now() + (j.expires_in || 3600) * 1000;
  return token;
}

async function chamar(caminho, opcoes = {}) {
  const t = await obterToken();
  const r = await fetch(`${API}/${idPlanilha()}${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(opcoes.headers || {}) },
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j?.error?.message || `Erro ${r.status} no Google Planilhas`);
    e.status = r.status;
    throw e;
  }
  return j;
}

const aspas = (aba) => `'${String(aba).replace(/'/g, "''")}'`;

// ---------- abas ----------
let abasConhecidas = null;
async function listarAbas() {
  if (abasConhecidas) return abasConhecidas;
  const j = await chamar("?fields=sheets.properties(sheetId,title)");
  abasConhecidas = Object.fromEntries((j.sheets || []).map((s) => [s.properties.title, s.properties.sheetId]));
  return abasConhecidas;
}

// cria a aba se não existir (igual ao get_sheet do Streamlit)
export async function garantirAba(nome) {
  const abas = await listarAbas();
  if (nome in abas) return abas[nome];
  const j = await chamar(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: nome, gridProperties: { rowCount: 5000, columnCount: 25 } } } }] }),
  });
  const id = j.replies?.[0]?.addSheet?.properties?.sheetId;
  abasConhecidas = { ...abas, [nome]: id };
  return id;
}

// Lê várias abas de uma vez (valores como aparecem na planilha, igual ao get_all_values do gspread)
export async function lerAbas(nomes, { criar = [] } = {}) {
  for (const n of criar) await garantirAba(n);
  const qs = nomes.map((n) => "ranges=" + encodeURIComponent(aspas(n))).join("&");
  try {
    const j = await chamar(`/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`);
    const res = {};
    (j.valueRanges || []).forEach((vr, i) => { res[nomes[i]] = vr.values || []; });
    return res;
  } catch (e) {
    // alguma aba não existe: lê uma por uma, devolvendo vazio para a que faltar
    if (e.status !== 400) throw e;
    const res = {};
    for (const n of nomes) {
      try {
        const j = await chamar(`/values/${encodeURIComponent(aspas(n))}?valueRenderOption=FORMATTED_VALUE`);
        res[n] = j.values || [];
      } catch { res[n] = []; }
    }
    return res;
  }
}

export function letraColuna(n) {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// Grava várias células/intervalos de uma vez: [{ aba, celula: "B2", valores: [[...]] }]
export async function gravar(itens) {
  if (!itens.length) return;
  await chamar("/values:batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: itens.map((i) => ({ range: `${aspas(i.aba)}!${i.celula}`, values: i.valores })),
    }),
  });
}

// Acrescenta uma linha no fim da aba (igual ao append_row)
export async function acrescentar(aba, linha) {
  await chamar(`/values/${encodeURIComponent(aspas(aba) + "!A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [linha] }),
  });
}

// Apaga uma linha (número da linha na planilha, começando em 1)
export async function apagarLinha(aba, numeroLinha) {
  const sheetId = await garantirAba(aba);
  await chamar(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: numeroLinha - 1, endIndex: numeroLinha } } }],
    }),
  });
}
