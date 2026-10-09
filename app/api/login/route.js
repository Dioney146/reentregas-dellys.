import { abrirSessao } from "../../../lib/sessao";
import { erroNome, normalizarNome } from "../../../lib/nome";

// Entrada sem senha: a pessoa informa o NOME (identifica quem está ativo e quem fez cada registro).
// Códigos, números e nomes genéricos (TESTE, PLANILHA, ADMIN...) são recusados.
export async function POST(req) {
  const { usuario } = await req.json().catch(() => ({}));
  const erro = erroNome(usuario);
  if (erro) return Response.json({ erro }, { status: 400 });
  const nome = normalizarNome(usuario).toLowerCase();
  await abrirSessao(nome);
  return Response.json({ usuario: nome });
}
