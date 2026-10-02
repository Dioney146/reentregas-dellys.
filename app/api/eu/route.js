import { usuarioDaSessao } from "../../../lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await usuarioDaSessao();
  return Response.json({ usuario }, { status: usuario ? 200 : 401 });
}
