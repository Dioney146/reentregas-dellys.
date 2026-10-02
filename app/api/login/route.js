import { conferirSenha, abrirSessao } from "../../../lib/sessao";

export async function POST(req) {
  const { usuario, senha } = await req.json().catch(() => ({}));
  const r = conferirSenha(usuario, senha);
  if (r.erro) return Response.json({ erro: r.erro }, { status: 401 });
  await abrirSessao(r.usuario);
  return Response.json({ usuario: r.usuario });
}
