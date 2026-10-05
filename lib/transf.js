// Regras do app de Transferências (mesma lógica do App.py), rodando no servidor.
import { nomesDoFrete } from "./frete";
import { lerAbas, gravar, acrescentar, apagarLinha, letraColuna } from "./planilha";
import { TCOLS, JANELA_ATIVO_MIN } from "./constantes";
import { agoraManaus, dataBR, dataISO, lerNumero, txt } from "./formato";

const ABA = "transferencias";
const ABA_PRES = "presencas";

// ---------- transforma as linhas da planilha em objetos ----------
function paraObjetos(valores) {
  if (!valores.length) return { cab: [], linhas: [] };
  const cab = valores[0].map((c) => String(c).trim());
  const linhas = [];
  for (let i = 1; i < valores.length; i++) {
    const row = valores[i] || [];
    if (!row.some((v) => String(v).trim())) continue; // linha em branco
    const o = { _linha: i + 1 };
    cab.forEach((c, j) => { if (c && !(c in o)) o[c] = row[j] ?? ""; }); // coluna repetida: vale a 1ª
    for (const c of TCOLS) if (!(c in o)) o[c] = "";
    o.pesobrutotot = lerNumero(o.pesobrutotot);
    o.vltotal = lerNumero(o.vltotal);
    o.status = String(o.status || "").trim();
    o.data_registro = dataBR(o.criado_em);
    linhas.push(o);
  }
  return { cab, linhas };
}

// garante o cabeçalho certo na linha 1 (igual ao ensure_header)
async function conferirCabecalho(cab) {
  const ok = TCOLS.every((c, i) => cab[i] === c);
  if (ok) return cab;
  await gravar([{ aba: ABA, celula: `A1:${letraColuna(TCOLS.length)}1`, valores: [TCOLS] }]);
  return [...TCOLS, ...cab.slice(TCOLS.length)];
}

// ---------- presença ----------
function lerQuando(s) {
  s = String(s || "").trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return Date.parse(`${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2, "0")}:${m[5]}:${m[6] || "00"}-04:00`);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, "0")}:${m[5]}:${m[6] || "00"}-04:00`);
  return NaN;
}
function ativosDe(valores) {
  const agora = Date.now();
  const nomes = new Set();
  for (const row of valores.slice(1)) {
    const u = String(row?.[0] || "").trim();
    const t = lerQuando(row?.[1]);
    if (u && Number.isFinite(t) && agora - t <= JANELA_ATIVO_MIN * 60 * 1000) nomes.add(u);
  }
  return [...nomes].sort();
}

// ---------- leitura geral (com um cache curtinho para não estourar a cota do Google) ----------
let cache = null;
let cacheEm = 0;
export function limparCache() { cache = null; }

export async function carregarTudo({ fresco = false } = {}) {
  if (!fresco && cache && Date.now() - cacheEm < 4000) return cache;
  const v = await lerAbas([ABA, ABA_PRES], { criar: [ABA, ABA_PRES] });
  let { cab, linhas } = paraObjetos(v[ABA]);
  cab = await conferirCabecalho(cab);
  cache = { cab, linhas, ativos: ativosDe(v[ABA_PRES]) };
  cacheEm = Date.now();
  return cache;
}

// número no formato que o Python gravava (str(float): 1234.0 / 1234.56)
const numPy = (n) => { const x = Number(n) || 0; return Number.isInteger(x) ? `${x}.0` : String(x); };

// ---------- registrar transferência ----------
export async function criarTransferencia(dados) {
  const { cab, linhas } = await carregarTudo({ fresco: true });
  const hoje = agoraManaus();
  const numnota = txt(dados.numnota);
  if (!numnota) throw new Error("Nota fiscal não informada.");
  if (!txt(dados.motivo)) throw new Error("Selecione um Motivo antes de confirmar.");
  if (!txt(dados.bairro)) throw new Error("Selecione um Bairro antes de confirmar.");
  const dup = linhas.some((l) => txt(l.numnota) === numnota && dataISO(l.dt_transferencia) === hoje.iso);
  if (dup) throw new Error(`Nota ${numnota} já registrada em ${hoje.br}.`);

  const ids = linhas.map((l) => Number(l.id)).filter(Number.isFinite);
  const row = {
    ...Object.fromEntries(TCOLS.map((c) => [c, ""])),
    ...Object.fromEntries(Object.entries(dados).filter(([k]) => TCOLS.includes(k)).map(([k, v]) => [k, txt(v)])),
    id: String(ids.length ? Math.max(...ids) + 1 : 1),
    dt_transferencia: hoje.iso,
    criado_em: hoje.brHora,
    status: "pendente",
    placa_veiculo: "", dt_saida: "", dt_roteirizacao: "",
    pesobrutotot: numPy(lerNumero(dados.pesobrutotot)),
    vltotal: numPy(lerNumero(dados.vltotal)),
  };
  // grava na ordem das colunas da planilha
  const ordem = cab.length >= TCOLS.length ? cab : TCOLS;
  await acrescentar(ABA, ordem.map((c) => (c in row ? row[c] : "")));
  limparCache();
  return row;
}

// ---------- alterar campos de uma ou várias transferências ----------
export async function atualizarTransferencias(ids, campos) {
  let { cab, linhas } = await carregarTudo({ fresco: true });
  cab = [...cab];
  const novas = [];
  for (const c of Object.keys(campos)) {
    if (!cab.includes(c)) { cab.push(c); novas.push({ aba: ABA, celula: `${letraColuna(cab.length)}1`, valores: [[c]] }); }
  }
  const alvo = new Set(ids.map(String));
  const achadas = linhas.filter((l) => alvo.has(String(l.id).trim()));
  const itens = [...novas];
  for (const l of achadas) {
    for (const [c, v] of Object.entries(campos)) {
      itens.push({ aba: ABA, celula: `${letraColuna(cab.indexOf(c) + 1)}${l._linha}`, valores: [[String(v ?? "")]] });
    }
  }
  await gravar(itens);
  limparCache();
  const naoAchadas = [...alvo].filter((id) => !achadas.some((l) => String(l.id).trim() === id));
  return { alteradas: achadas.length, naoAchadas };
}

export async function excluirTransferencia(id) {
  const { linhas } = await carregarTudo({ fresco: true });
  const l = linhas.find((x) => String(x.id).trim() === String(id));
  if (!l) throw new Error(`ID ${id} não encontrado na planilha.`);
  await apagarLinha(ABA, l._linha);
  limparCache();
}

// ---------- presença ----------
export async function registrarPresenca(usuario) {
  usuario = String(usuario || "").trim().toLowerCase();
  if (!usuario) return;
  const v = await lerAbas([ABA_PRES], { criar: [ABA_PRES] });
  const linhas = v[ABA_PRES];
  const itens = [];
  if (linhas[0]?.[0] !== "usuario" || linhas[0]?.[1] !== "last_seen") itens.push({ aba: ABA_PRES, celula: "A1:B1", valores: [["usuario", "last_seen"]] });
  const ts = agoraManaus().brHora;
  const i = linhas.findIndex((r, k) => k > 0 && String(r?.[0] || "").trim().toLowerCase() === usuario);
  if (i > 0) itens.push({ aba: ABA_PRES, celula: `B${i + 1}`, valores: [[ts]] });
  if (itens.length) await gravar(itens);
  if (i <= 0) await acrescentar(ABA_PRES, [usuario, ts]);
}

// ---------- busca da nota na base ROAD (igual ao buscar_nota) ----------
let baseRoad = null;
let baseRoadEm = 0;
async function lerBases() {
  if (baseRoad && Date.now() - baseRoadEm < 60000) return baseRoad;
  const v = await lerAbas(["ROAD", "Nomes"]);
  const tabela = (vals) => {
    if (!vals?.length) return { cols: [], rows: [] };
    const cols = vals[0].map((c) => String(c).toUpperCase().trim());
    return { cols, rows: vals.slice(1) };
  };
  baseRoad = { road: tabela(v.ROAD), nomes: tabela(v.Nomes) };
  baseRoadEm = Date.now();
  return baseRoad;
}

const limpo = (v) => {
  const s = String(v ?? "").trim();
  if (["", "nan", "None"].includes(s)) return "";
  return s.endsWith(".0") ? s.slice(0, -2) : s;
};

export async function buscarNota(numnota) {
  numnota = String(numnota || "").trim();
  const { road, nomes } = await lerBases();
  if (!road.cols.length) return { erro: "Aba ROAD vazia ou não encontrada." };
  const C = road.cols;
  const idx = (c) => C.indexOf(c);
  const colNF = C.find((c) => (c.includes("NOTA") && c.includes("FISCAL")) || ["NF", "NOTAFISCAL", "NOTA_FISCAL"].includes(c));
  if (!colNF) return { erro: "A aba ROAD não tem a coluna NOTA FISCAL.", colunas: C };
  const nfDe = (row) => String(row[idx(colNF)] ?? "").split(".")[0].trim();
  const r = road.rows.find((row) => nfDe(row) === numnota);
  if (!r) {
    return { erro: `Nota "${numnota}" não encontrada na base ROAD.`, colunas: C, amostra: road.rows.slice(0, 5).map(nfDe) };
  }
  const val = (c) => (idx(c) >= 0 ? r[idx(c)] : "");
  const primeiro = (cols) => { for (const c of cols) { const v = limpo(val(c)); if (v) return v; } return ""; };
  const comTexto = (cols) => { for (const c of cols) { const v = String(val(c) ?? "").trim(); if (v && !["nan", "None"].includes(v)) return v; } return ""; };

  const praca = primeiro(C.filter((c) => c.includes("PRA")));
  const carreg = primeiro(C.filter((c) => c.startsWith("CARREG")));

  let pesoCols = C.filter((c) => ["PESO", "PESO BRUTO", "PESOBRUTO", "PESO TOTAL"].includes(c));
  if (!pesoCols.length) pesoCols = C.filter((c) => c.includes("PESO"));
  const peso = lerNumero(String(val(pesoCols[0] || "PESO") || "0").replace(",", ".")) || lerNumero(val(pesoCols[0] || "PESO"));

  let valorCols = C.filter((c) => ["VALOR", "VALOR TOTAL", "VL TOTAL"].includes(c));
  if (!valorCols.length) valorCols = C.filter((c) => c.includes("VALOR"));
  let rv = String(val(valorCols[0] || "VALOR") || "0").replace(/R\$/g, "").trim();
  // como no Python: ponto = milhar, vírgula = decimal (mas aceita "1234.56" quando não for milhar)
  if (rv.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(rv)) rv = rv.replace(/\./g, "").replace(",", ".");
  const valor = Number(rv) || 0;

  const pedCol = C.find((c) => c === "PEDIDO");
  let dtlibCol = C.find((c) => c.includes("DATA") && (c.includes("LIBER") || c.includes("LIB")));
  if (!dtlibCol) dtlibCol = C.find((c) => c.includes("LIBERADO") || c.includes("LIBERACAO"));

  const placaRoad = primeiro(C.filter((c) => c.includes("PLACA")));
  const vend = comTexto(C.filter((c) => c.includes("VEND")));
  const sup = comTexto(C.filter((c) => c.includes("SUP")));
  const dest = comTexto(C.filter((c) => c.includes("DEST")));

  const codCols = C.filter((c) => ["CODIGO DO CLIENTE", "CODIGO_DO_CLIENTE", "CODCLIENTE", "COD_CLI", "CODIGO CLIENTE", "CODIGO_CLIENTE"].includes(c) || (c.includes("COD") && c.includes("CLI")));
  let codCli = "";
  for (const c of codCols) { const v = limpo(val(c)); if (v && v !== "0") { codCli = v; break; } }

  const prior = C.filter((c) => ["CLIENTE", "NOMECLIENTE", "NOME CLIENTE", "NOME_CLIENTE"].includes(c));
  const fallback = C.filter((c) => c.includes("CLIEN") && !c.includes("COD") && !prior.includes(c));
  const cliente = comTexto([...prior, ...fallback]);

  // motorista / entregador: 1º do Frete / Saídas (Controle de Entregas); se não achar, da aba "Nomes"
  const colEntrega = C.find((c) => c.includes("DATA") && c.includes("ENTREG"));
  const dataEntrega = colEntrega ? limpo(val(colEntrega)) : "";
  let motorista = "", entregador = "", origemNomes = "";
  if (placaRoad) {
    try {
      const f = await nomesDoFrete(placaRoad, dataEntrega);
      if (f) {
        motorista = f.motorista;
        entregador = f.entregador;
        origemNomes = `frete:${f.data}:${f.exato ? "exato" : "aprox"}`;
      }
    } catch { /* se o Frete não responder, usa a aba Nomes */ }
  }
  if (placaRoad && !motorista && !entregador && nomes.cols.length) {
    const cp = nomes.cols.findIndex((c) => c.includes("PLACA"));
    const cm = nomes.cols.findIndex((c) => c.includes("MOTORISTA"));
    const ce = nomes.cols.findIndex((c) => c.includes("ENTREGADOR"));
    const linha = cp >= 0 ? nomes.rows.find((row) => String(row[cp] ?? "").trim().toUpperCase() === placaRoad.toUpperCase()) : null;
    if (linha) {
      motorista = cm >= 0 ? limpo(linha[cm]) : "";
      entregador = ce >= 0 ? limpo(linha[ce]) : "";
      if (motorista || entregador) origemNomes = "nomes";
    }
  }

  return {
    nota: {
      numped: pedCol ? limpo(val(pedCol)) : limpo(val("PEDIDO")),
      numnota: limpo(val(colNF)).split(".")[0],
      codcliente: codCli,
      nomecliente: cliente,
      dt_liberado: primeiro([dtlibCol, "DATA LIBERADO", "DT LIBERADO"].filter(Boolean)),
      nomevend: vend,
      nomesup: sup,
      pesobrutotot: peso,
      vltotal: valor,
      praca,
      numcarregamento: carreg,
      destino: dest,
      placa_road: placaRoad,
      motorista,
      entregador,
      data_entrega: dataEntrega,
    },
    origemNomes,
  };
}
