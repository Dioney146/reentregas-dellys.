import { usuarioDaSessao } from "../../../lib/sessao";
import { carregarTudo } from "../../../lib/transf";

export const dynamic = "force-dynamic";

// Todas as transferências + quem está ativo
export async function GET() {
  const usuario = await usuarioDaSessao();
  if (!usuario) return Response.json({ erro: "Faça login." }, { status: 401 });
  try {
    const { linhas, ativos } = await carregarTudo();
    return Response.json({ linhas, ativos, usuario });
  } catch (e) {
    return Response.json({ erro: e.message }, { status: 500 });
  }
}
