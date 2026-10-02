import { abrirSessao } from "../../../lib/sessao";

// Entrada sem senha: a pessoa só informa o nome (serve para mostrar quem está ativo)
export async function POST(req) {
  const { usuario } = await req.json().catch(() => ({}));
  const nome = String(usuario || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (nome.length < 2) return Response.json({ erro: "Digite seu nome." }, { status: 400 });
  await abrirSessao(nome.slice(0, 40));
  return Response.json({ usuario: nome });
}
