import { usuarioDaSessao } from "../../../lib/sessao";
import { buscarNota } from "../../../lib/transf";

export const dynamic = "force-dynamic";

// Busca a nota fiscal na aba ROAD
export async function GET(req) {
  if (!(await usuarioDaSessao())) return Response.json({ erro: "Faça login." }, { status: 401 });
  const u = new URL(req.url).searchParams;
  const nf = u.get("nf") || "";
  if (!nf.trim()) return Response.json({ erro: "Informe o número da nota fiscal." }, { status: 400 });
  try {
    return Response.json(await buscarNota(nf, u.get("data") || ""));
  } catch (e) {
    return Response.json({ erro: e.message }, { status: 500 });
  }
}
