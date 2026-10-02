import { fecharSessao } from "../../../lib/sessao";

export async function POST() {
  await fecharSessao();
  return Response.json({ ok: true });
}
