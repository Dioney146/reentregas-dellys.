import { usuarioDaSessao } from "../../../lib/sessao";
import { registrarPresenca } from "../../../lib/transf";

export const dynamic = "force-dynamic";

// "estou usando o site" (a cada minuto)
export async function POST() {
  const usuario = await usuarioDaSessao();
  if (!usuario) return Response.json({ erro: "Faça login." }, { status: 401 });
  try { await registrarPresenca(usuario); } catch {}
  return Response.json({ ok: true });
}
