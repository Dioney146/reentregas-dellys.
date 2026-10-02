import { usuarioDaSessao } from "../../../lib/sessao";
import { criarTransferencia, atualizarTransferencias, excluirTransferencia } from "../../../lib/transf";

export const dynamic = "force-dynamic";

const CAMPOS_EDITAVEIS = ["placa_veiculo", "dt_saida", "dt_roteirizacao", "status"];

async function protegido(fn) {
  if (!(await usuarioDaSessao())) return Response.json({ erro: "Faça login." }, { status: 401 });
  try {
    return Response.json(await fn());
  } catch (e) {
    return Response.json({ erro: e.message }, { status: 400 });
  }
}

// registrar nova transferência
export async function POST(req) {
  return protegido(async () => criarTransferencia(await req.json()));
}

// roteirizar / devolver para pendente: { ids: [...], campos: {...} }
export async function PATCH(req) {
  return protegido(async () => {
    const { ids, campos } = await req.json();
    if (!Array.isArray(ids) || !ids.length) throw new Error("Nenhuma nota selecionada.");
    const permitido = Object.fromEntries(Object.entries(campos || {}).filter(([k]) => CAMPOS_EDITAVEIS.includes(k)));
    return atualizarTransferencias(ids, permitido);
  });
}

// excluir: ?id=12
export async function DELETE(req) {
  return protegido(async () => {
    await excluirTransferencia(new URL(req.url).searchParams.get("id"));
    return { ok: true };
  });
}
