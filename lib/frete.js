// Motorista e entregador direto do RETORNO (site Controle de Entregas, banco Supabase):
// só vale o frete que já foi liberado para o Retorno. Assim não precisa mais colar a aba "Nomes" todo dia.
import { dataISO } from "./formato";

const normPlaca = (p) => String(p || "").trim().toUpperCase().replace(/[\s-]/g, "");

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const chave = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  return url && chave ? { url, chave } : null;
}
export const freteConfigurado = () => Boolean(config());

// Procura a placa no Retorno: 1º o do dia da entrega; senão o mais recente até esse dia; senão o mais recente.
export async function nomesDoFrete(placa, dataEntrega) {
  const c = config();
  const p = normPlaca(placa);
  if (!c || !p) return null;
  const buscar = (soRetorno) => {
    const qs = new URLSearchParams({ select: "data,placa,motorista,entregador", placa: `eq.${p}`, order: "data.desc", limit: "60" });
    if (soRetorno) qs.set("liberado_retorno", "eq.true");
    return fetch(`${c.url}/rest/v1/saidas?${qs}`, {
      headers: { apikey: c.chave, Authorization: `Bearer ${c.chave}`, "x-usuario": "TRANSFERENCIAS" },
      cache: "no-store",
    });
  };
  let r = await buscar(true);
  if (r.status === 400) r = await buscar(false); // banco ainda sem a liberação do Retorno (arquivo 10 não rodado)
  if (!r.ok) throw new Error(`Retorno indisponível (${r.status})`);
  const linhas = (await r.json()).filter((l) => (l.motorista || "").trim() || (l.entregador || "").trim());
  if (!linhas.length) return null;
  const dia = dataISO(dataEntrega);
  const escolhida =
    (dia && linhas.find((l) => l.data === dia)) ||
    (dia && linhas.find((l) => l.data <= dia)) ||
    linhas[0];
  return {
    motorista: (escolhida.motorista || "").trim(),
    entregador: (escolhida.entregador || "").trim(),
    data: escolhida.data,
    exato: Boolean(dia && escolhida.data === dia),
  };
}
