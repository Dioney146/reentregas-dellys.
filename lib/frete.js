// Motorista e entregador direto do RETORNO (site Controle de Entregas, banco Supabase):
// só vale o frete que já foi liberado para o Retorno. Assim não precisa mais colar a aba "Nomes" todo dia.
import { dataISO, agoraManaus } from "./formato";

const normPlaca = (p) => String(p || "").trim().toUpperCase().replace(/[\s-]/g, "");

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const chave = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  return url && chave ? { url, chave } : null;
}
export const freteConfigurado = () => Boolean(config());

const ehIso = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");

// Procura a placa no Retorno:
//  PADRÃO: o Retorno do dia do REGISTRO (hoje) — ou da data retroativa escolhida na tela.
//  Só se a placa não rodou nesse dia: o Retorno do dia da ENTREGA (ROAD).
//  Não chuta nome de outros dias: devolve null e o site usa a aba Nomes.
export async function nomesDoFrete(placa, dataRetorno = agoraManaus().iso, dataEntrega = "") {
  const c = config();
  const p = normPlaca(placa);
  if (!c || !p) return null;
  // coluna = "placa" (placa atual no frete) ou "placa_original" (placa da programação, antes de ser trocada)
  const buscar = (coluna, soRetorno) => {
    const qs = new URLSearchParams({ select: "data,placa,placa_original,motorista,entregador", [coluna]: `eq.${p}`, order: "data.desc", limit: "60" });
    if (coluna === "placa") qs.set("select", "data,placa,motorista,entregador");
    if (soRetorno) qs.set("liberado_retorno", "eq.true");
    return fetch(`${c.url}/rest/v1/saidas?${qs}`, {
      headers: { apikey: c.chave, Authorization: `Bearer ${c.chave}`, "x-usuario": "TRANSFERENCIAS" },
      cache: "no-store",
    });
  };
  const ler = async (coluna) => {
    let r = await buscar(coluna, true);
    if (r.status === 400) r = await buscar(coluna, false); // banco sem a liberação do Retorno (arquivo 10) ou sem placa_original (arquivo 12)
    if (r.status === 400 && coluna === "placa_original") return []; // banco ainda sem o 12_placa_trocada.sql
    if (!r.ok) throw new Error(`Retorno indisponível (${r.status})`);
    return (await r.json()).filter((l) => (l.motorista || "").trim() || (l.entregador || "").trim());
  };

  const dRet = dataISO(dataRetorno), dEnt = dataISO(dataEntrega);
  const datas = [[dRet, "retorno"], ...(dEnt !== dRet ? [[dEnt, "entrega"]] : [])].filter(([d]) => ehIso(d));
  const pelaPlaca = await ler("placa");
  let porOriginal = null; // só busca se precisar
  // para cada data (registro, depois entrega): 1º a placa da nota; se não achar, o veículo cuja placa ORIGINAL era essa (placa trocada no frete)
  for (const [d, tipo] of datas) {
    let escolhida = pelaPlaca.find((l) => l.data === d);
    let trocada = false;
    if (!escolhida) {
      porOriginal ??= await ler("placa_original");
      escolhida = porOriginal.find((l) => l.data === d);
      trocada = Boolean(escolhida);
    }
    if (escolhida) {
      return {
        motorista: (escolhida.motorista || "").trim(),
        entregador: (escolhida.entregador || "").trim(),
        data: escolhida.data,
        tipo,
        placaNova: trocada ? normPlaca(escolhida.placa) : "",
      };
    }
  }
  return null;
}
